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

@Injectable()
export class InventoryTransactionService {
  constructor(
    private readonly repo: InventoryTransactionRepository,
    private readonly redisIdService: RedisIdService,
  ) {}

  async create(transactionDto: CreateInventoryTransactionDto) {
    // tiền xử lý chung: gán ngày giao dịch nếu chưa có, tạo transaction_id
    if (!transactionDto.transaction_date) {
      transactionDto.transaction_date = new Date().toISOString();
    }
    transactionDto.transaction_id = await this.redisIdService.nextId('TXN');

    // các kiểm tra validation được thực hiện bên trong mỗi hàm xử lý; quy tắc dấu theo loại đã ghi chú ở đó
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

  async getAll(filters: FilterOptions, paging: PaginationOptions) {
    return this.repo.findAll(filters, paging);
  }
  async getOne(id: string) {
    const byId = await this.repo.findOne(id);
    if (byId) return byId;

    const byTxId = await this.repo.findOneByTransactionId(id);
    if (byTxId) return byTxId;

    throw new NotFoundException('Inventory transaction not found');
  }

  async getMyHistory(
    filters: MyHistoryFilterOptions,
    paging: PaginationOptions,
    actor: string,
  ) {
    return this.repo.findMyHistory(actor, filters, paging);
  }

  async getMyHistoryDetail(transactionId: string, actor: string) {
    const actorTransaction = await this.repo.findOneByTransactionIdAndActor(
      transactionId,
      actor,
    );

    if (actorTransaction) {
      return actorTransaction;
    }

    const existingTransaction =
      await this.repo.findOneByTransactionId(transactionId);
    if (!existingTransaction) {
      throw new NotFoundException('Inventory transaction not found');
    }

    throw new ForbiddenException(
      'You do not have permission to view this transaction',
    );
  }

  async update(id: string, dto: UpdateInventoryTransactionDto) {
    // có thể giới hạn trường được phép sửa, ghi log thay đổi, v.v.
    return this.repo.update(id, dto);
  }
  async remove(id: string) {
    return this.repo.remove(id);
  }

  async deleteByLotId(lot_id: string): Promise<DeleteResult> {
    return this.repo.deleteByLotId(lot_id);
  }

  /**
   * Tạo hàng loạt transactions. Các DTO sẽ được xử lý theo cùng quy trình
   * như `create()` để đảm bảo validation & publication.
   */
  async createMany(dtos: CreateInventoryTransactionDto[]) {
    // mảng kết quả cần kiểu rõ ràng vì TypeScript không thể suy ra từ []
    const results: unknown[] = [];
    for (const dto of dtos) {
      // tái sử dụng hàm create chứa toàn bộ logic nghiệp vụ
      const created = await this.create(dto);
      results.push(created);
    }
    return results;
  }

  // các hàm hỗ trợ theo loại
  protected async handleReceipt(dto: CreateInventoryTransactionDto) {
    // số lượng (receipt) phải dương
    if (dto.quantity <= 0) {
      throw new BadRequestException('receipt quantity must be positive');
    }
    // tăng số lượng của lô được chỉ định
    const created = await this.repo.create(dto);
    return created;
  }

  protected async handleUsage(dto: CreateInventoryTransactionDto) {
    // số lượng (usage) phải âm
    if (dto.quantity >= 0) {
      throw new BadRequestException('usage quantity must be negative');
    }
    // kiểm tra tồn kho và giảm, áp dụng FIFO/FEFO
    // nếu thiếu lot_id thì chọn lô tự động
    // đảm bảo không âm tồn
    // đơn giản: chỉ lưu bản ghi
    const created = await this.repo.create(dto);
    return created;
  }

  protected async handleSplit(dto: CreateInventoryTransactionDto) {
    // số lượng (split) không được bằng 0; dấu chỉ hướng chuyển
    if (dto.quantity === 0) {
      throw new BadRequestException('split quantity cannot be zero');
    }
    // tạo giao dịch split và lô con mới
    const created = await this.repo.create(dto);
    // bỏ qua phần tạo lô bổ sung
    return created;
  }

  protected async handleAdjustment(dto: CreateInventoryTransactionDto) {
    // số lượng (adjustment) không được bằng 0; dấu chỉ hướng điều chỉnh
    if (dto.quantity === 0) {
      throw new BadRequestException('adjustment quantity cannot be zero');
    }
    // điều chỉnh +/- số lượng kèm lý do
    const created = await this.repo.create(dto);
    return created;
  }

  protected async handleTransfer(dto: CreateInventoryTransactionDto) {
    // số lượng (transfer) không được bằng 0; dấu chỉ hướng chuyển
    if (dto.quantity === 0) {
      throw new BadRequestException('transfer quantity cannot be zero');
    }
    // có thể gọi handleUsage + handleReceipt hoặc dùng một bản ghi transfer
    const created = await this.repo.create(dto);
    return created;
  }

  protected async handleDisposal(dto: CreateInventoryTransactionDto) {
    // giống usage nhưng đánh dấu là hủy
    // số lượng (disposal) phải âm
    if (dto.quantity >= 0) {
      throw new BadRequestException('disposal quantity must be negative');
    }
    const created = await this.repo.create(dto);
    return created;
  }
}
