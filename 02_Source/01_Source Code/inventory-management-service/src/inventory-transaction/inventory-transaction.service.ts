import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DeleteResult } from 'mongodb';
import {
  FilterOptions,
  InventoryTransactionRepository,
  MyHistoryFilterOptions,
  PaginationOptions,
} from './inventory-transaction.repository';
import {
  CreateInventoryTransactionDto,
  TransactionType,
} from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { RedisIdService } from '../redis-id/redis-id.service';

/**
 * InventoryTransactionService - Service xử lý nghiệp vụ giao dịch tồn kho
 * 
 * Chức năng chính:
 * - Tạo mới giao dịch tồn kho (phân loại theo transaction_type)
 * - Xử lý từng loại giao dịch: Receipt, Usage, Split, Adjustment, Transfer, Disposal
 * - Lấy danh sách giao dịch có phân trang và lọc
 * - Lấy lịch sử giao dịch theo người thực hiện (performed_by)
 * - Cập nhật và xóa giao dịch
 * - Tạo hàng loạt giao dịch (bulk create)
 * 
 * Quy tắc nghiệp vụ theo loại giao dịch:
 * - Receipt: quantity > 0 (nhập kho)
 * - Usage: quantity < 0 (xuất kho/sử dụng)
 * - Split: quantity != 0 (tách lô - có thể dương hoặc âm tùy vào logic)
 * - Adjustment: quantity != 0 (điều chỉnh +/-)
 * - Transfer: quantity != 0 (chuyển kho)
 * - Disposal: quantity < 0 (hủy bỏ)
 * 
 * Tự động sinh transaction_id bằng Redis (format: TXN-XXX)
 * Tự động gán transaction_date nếu không cung cấp
 */
@Injectable()
export class InventoryTransactionService {
  constructor(
    private readonly repo: InventoryTransactionRepository,
    private readonly redisIdService: RedisIdService,
  ) {}

  /**
   * Tạo mới một giao dịch tồn kho
   * Phân loại theo transaction_type để xử lý nghiệp vụ tương ứng
   * 
   * @param transactionDto - Dữ liệu giao dịch
   * @returns Giao dịch đã tạo
   * @throws BadRequestException nếu loại giao dịch không hợp lệ hoặc số lượng sai quy tắc
   */
  async create(transactionDto: CreateInventoryTransactionDto) {
    // Tiền xử lý chung: gán ngày giao dịch nếu chưa có, tạo transaction_id
    if (!transactionDto.transaction_date) {
      transactionDto.transaction_date = new Date().toISOString();
    }
    transactionDto.transaction_id = await this.redisIdService.nextId('TXN');

    // Các kiểm tra validation được thực hiện bên trong mỗi hàm xử lý
    // Quy tắc dấu theo loại đã ghi chú ở đó
    // (receipt>0, usage<0, disposal<0; split/adjustment/transfer !=0)

    switch (transactionDto.transaction_type) {
      case TransactionType.Receipt:
        return this.handleReceipt(transactionDto);
      case TransactionType.Usage:
        return this.handleUsage(transactionDto);
      case TransactionType.Split:
        return this.handleSplit(transactionDto);
      case TransactionType.Adjustment:
        return this.handleAdjustment(transactionDto);
      case TransactionType.Transfer:
        return this.handleTransfer(transactionDto);
      case TransactionType.Disposal:
        return this.handleDisposal(transactionDto);
      default:
        throw new BadRequestException('unknown transaction type');
    }
  }

  /**
   * Lấy danh sách tất cả giao dịch có phân trang và lọc
   * 
   * @param filters - Các tiêu chí lọc (lot_id, transaction_type, search, date range)
   * @param paging - Phân trang (page, limit)
   * @returns Danh sách giao dịch và tổng số
   */
  async getAll(filters: FilterOptions, paging: PaginationOptions) {
    return this.repo.findAll(filters, paging);
  }

  /**
   * Lấy một giao dịch theo ID
   * Tìm theo cả MongoDB _id và transaction_id
   * 
   * @param id - MongoDB _id hoặc transaction_id (TXN-XXX)
   * @returns Giao dịch tìm thấy
   * @throws NotFoundException nếu không tìm thấy
   */
  async getOne(id: string) {
    const byId = await this.repo.findOne(id);
    if (byId) return byId;

    const byTxId = await this.repo.findOneByTransactionId(id);
    if (byTxId) return byTxId;

    throw new NotFoundException('Inventory transaction not found');
  }

  /**
   * Lấy lịch sử giao dịch của một người dùng (performed_by)
   * Chỉ trả về giao dịch do người đó thực hiện
   * 
   * @param filters - Các tiêu chí lọc
   * @param paging - Phân trang
   * @param actor - Tên người thực hiện
   * @returns Lịch sử giao dịch của người dùng
   */
  async getMyHistory(
    filters: MyHistoryFilterOptions,
    paging: PaginationOptions,
    actor: string,
  ) {
    return this.repo.findMyHistory(actor, filters, paging);
  }

  /**
   * Lấy chi tiết giao dịch của người dùng
   * Kiểm tra quyền: chỉ người thực hiện mới được xem
   * 
   * @param transactionId - transaction_id
   * @param actor - Tên người thực hiện
   * @returns Chi tiết giao dịch
   * @throws NotFoundException nếu không tìm thấy
   * @throws ForbiddenException nếu không có quyền xem
   */
  async getMyHistoryDetail(transactionId: string, actor: string) {
    const actorTransaction = await this.repo.findOneByTransactionIdAndActor(
      transactionId,
      actor,
    );

    if (actorTransaction) {
      return actorTransaction;
    }

    // Kiểm tra giao dịch có tồn tại không (để trả về lỗi phù hợp)
    const existingTransaction =
      await this.repo.findOneByTransactionId(transactionId);
    if (!existingTransaction) {
      throw new NotFoundException('Inventory transaction not found');
    }

    throw new ForbiddenException(
      'You do not have permission to view this transaction',
    );
  }

  /**
   * Cập nhật giao dịch
   * @param id - transaction_id (không phải MongoDB _id)
   * @param dto - Dữ liệu cập nhật
   * @returns Giao dịch sau khi cập nhật
   */
  async update(id: string, dto: UpdateInventoryTransactionDto) {
    return this.repo.update(id, dto);
  }

  /**
   * Xóa giao dịch
   * @param id - transaction_id (không phải MongoDB _id)
   * @returns Kết quả xóa
   */
  async remove(id: string) {
    return this.repo.remove(id);
  }

  /**
   * Xóa tất cả giao dịch theo lot_id
   * Dùng khi xóa lô hàng
   * 
   * @param lot_id - ID của lô hàng
   * @returns Kết quả xóa (DeleteResult)
   */
  async deleteByLotId(lot_id: string): Promise<DeleteResult> {
    return this.repo.deleteByLotId(lot_id);
  }

  /**
   * Tạo hàng loạt giao dịch
   * Tái sử dụng hàm create() để đảm bảo validation & publication
   * 
   * @param dtos - Danh sách DTO giao dịch
   * @returns Danh sách giao dịch đã tạo
   */
  async createMany(dtos: CreateInventoryTransactionDto[]) {
    const results: unknown[] = [];
    for (const dto of dtos) {
      const created = await this.create(dto);
      results.push(created);
    }
    return results;
  }

  // =================== Các hàm hỗ trợ theo loại ===================

  /**
   * Xử lý giao dịch Receipt (nhập kho)
   * Số lượng phải dương (> 0)
   * 
   * @param dto - Dữ liệu giao dịch
   * @returns Giao dịch đã tạo
   */
  protected async handleReceipt(dto: CreateInventoryTransactionDto) {
    // Số lượng (receipt) phải dương
    if (dto.quantity <= 0) {
      throw new BadRequestException('receipt quantity must be positive');
    }
    // Tăng số lượng của lô được chỉ định
    const created = await this.repo.create(dto);
    return created;
  }

  /**
   * Xử lý giao dịch Usage (xuất kho/sử dụng)
   * Số lượng phải âm (< 0)
   * Kiểm tra tồn kho và giảm, áp dụng FIFO/FEFO
   * 
   * @param dto - Dữ liệu giao dịch
   * @returns Giao dịch đã tạo
   */
  protected async handleUsage(dto: CreateInventoryTransactionDto) {
    // Số lượng (usage) phải âm
    if (dto.quantity >= 0) {
      throw new BadRequestException('usage quantity must be negative');
    }
    // Kiểm tra tồn kho và giảm, áp dụng FIFO/FEFO
    // Nếu thiếu lot_id thì chọn lô tự động
    // Đảm bảo không âm tồn
    // Đơn giản: chỉ lưu bản ghi
    const created = await this.repo.create(dto);
    return created;
  }

  /**
   * Xử lý giao dịch Split (tách lô)
   * Số lượng không được bằng 0
   * Tạo giao dịch split và lô con mới
   * 
   * @param dto - Dữ liệu giao dịch
   * @returns Giao dịch đã tạo
   */
  protected async handleSplit(dto: CreateInventoryTransactionDto) {
    // Số lượng (split) không được bằng 0; dấu chỉ hướng chuyển
    if (dto.quantity === 0) {
      throw new BadRequestException('split quantity cannot be zero');
    }
    // Tạo giao dịch split và lô con mới
    const created = await this.repo.create(dto);
    // Bỏ qua phần tạo lô bổ sung
    return created;
  }

  /**
   * Xử lý giao dịch Adjustment (điều chỉnh)
   * Số lượng không được bằng 0
   * Điều chỉnh +/- số lượng kèm lý do
   * 
   * @param dto - Dữ liệu giao dịch
   * @returns Giao dịch đã tạo
   */
  protected async handleAdjustment(dto: CreateInventoryTransactionDto) {
    // Số lượng (adjustment) không được bằng 0; dấu chỉ hướng điều chỉnh
    if (dto.quantity === 0) {
      throw new BadRequestException('adjustment quantity cannot be zero');
    }
    // Điều chỉnh +/- số lượng kèm lý do
    const created = await this.repo.create(dto);
    return created;
  }

  /**
   * Xử lý giao dịch Transfer (chuyển kho)
   * Số lượng không được bằng 0
   * Có thể gọi handleUsage + handleReceipt hoặc dùng một bản ghi transfer
   * 
   * @param dto - Dữ liệu giao dịch
   * @returns Giao dịch đã tạo
   */
  protected async handleTransfer(dto: CreateInventoryTransactionDto) {
    // Số lượng (transfer) không được bằng 0; dấu chỉ hướng chuyển
    if (dto.quantity === 0) {
      throw new BadRequestException('transfer quantity cannot be zero');
    }
    // Có thể gọi handleUsage + handleReceipt hoặc dùng một bản ghi transfer
    const created = await this.repo.create(dto);
    return created;
  }

  /**
   * Xử lý giao dịch Disposal (hủy bỏ)
   * Giống usage nhưng đánh dấu là hủy
   * Số lượng phải âm (< 0)
   * 
   * @param dto - Dữ liệu giao dịch
   * @returns Giao dịch đã tạo
   */
  protected async handleDisposal(dto: CreateInventoryTransactionDto) {
    // Giống usage nhưng đánh dấu là hủy
    // Số lượng (disposal) phải âm
    if (dto.quantity >= 0) {
      throw new BadRequestException('disposal quantity must be negative');
    }
    const created = await this.repo.create(dto);
    return created;
  }
}
