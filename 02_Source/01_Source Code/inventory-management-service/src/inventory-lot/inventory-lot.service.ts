/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * InventoryLotService - Service xử lý nghiệp vụ lô hàng tồn kho
 * 
 * Chức năng chính:
 * - Tạo mới lô hàng (tự động sinh lot_id bằng Redis)
 * - Quản lý vòng đời lô hàng: Quarantine → Accepted/Rejected → Depleted
 * - Tự động tạo InventoryTransaction khi có thay đổi số lượng
 * - Kiểm tra chuyển đổi trạng thái hợp lệ (state machine)
 * - Tìm kiếm, lọc, phân trang lô hàng
 * - Quản lý lô mẫu (sample lots) - lấy từ lô cha (parent_lot_id)
 * - Thống kê lô hàng: tổng, theo trạng thái, sắp hết hạn, đã hết hạn
 * - Cung cấp dữ liệu cho QC Test (bulk quarantine, getLotsByStatus...)
 * - Ghi Audit Log khi cập nhật lô hàng
 * 
 * Quy tắc nghiệp vụ:
 * - received_date phải trước expiration_date
 * - manufacture_date phải trước expiration_date
 * - Chỉ cho phép xóa lô có trạng thái Quarantine và chưa có giao dịch
 * - Khi cập nhật số lượng = 0 → tự động chuyển sang Depleted
 * - Khi đánh dấu Depleted nhưng quantity > 0 → tự động tạo Usage transaction
 * 
 * Tích hợp:
 * - InventoryTransactionService: Tạo giao dịch khi thay đổi số lượng
 * - AuditLogService: Ghi log kiểm toán
 * - RedisIdService: Sinh lot_id tự động
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InventoryLotRepository } from './inventory-lot.repository';
import type {
  CreateInventoryLotDto,
  UpdateInventoryLotDto,
  PaginatedInventoryLotResponse,
  InventoryLotResponseDto,
  InventoryLotSearchParams,
} from './inventory-lot.dto';
import { InventoryLotStatus } from './inventory-lot.dto';
import { TransactionType } from '../inventory-transaction/dto/create-inventory-transaction.dto';
import { InventoryTransactionService } from '../inventory-transaction/inventory-transaction.service';
import { InventoryLot } from '../schemas/inventory-lot.schema';
import { AuditLogService, LogContext } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.schema';
import { RedisIdService } from '../redis-id/redis-id.service';

@Injectable()
export class InventoryLotService {
  constructor(
    private readonly inventoryLotRepository: InventoryLotRepository,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly auditLogService: AuditLogService,
    private readonly redisIdService: RedisIdService,
  ) {}

  /**
   * Tạo mới một lô hàng
   * Tự động sinh lot_id nếu không cung cấp (format: LOT-XXX)
   * Tự động tạo Receipt transaction sau khi tạo lô
   * 
   * @param createDto - Dữ liệu tạo lô hàng
   * @returns InventoryLotResponseDto - Thông tin lô hàng đã tạo
   * @throws BadRequestException nếu ngày không hợp lệ hoặc số lượng <= 0
   */
  async create(
    createDto: CreateInventoryLotDto,
  ): Promise<InventoryLotResponseDto> {
    // Tự động sinh lot_id nếu không cung cấp
    if (!createDto.lot_id) {
      createDto.lot_id = await this.redisIdService.nextId('LOT');
    }

    // Validate ngày: received_date phải trước expiration_date
    if (
      new Date(createDto.received_date) > new Date(createDto.expiration_date)
    ) {
      throw new BadRequestException(
        'Received date must be before expiration date',
      );
    }

    // Validate số lượng
    const quantity = createDto.quantity;
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Cảnh báo nếu lô mẫu không có parent_lot_id
    if (createDto.is_sample && !createDto.parent_lot_id) {
      console.warn('Sample lot created without parent_lot_id');
    }

    // Set người nhận hàng
    const lotToCreate = {
      ...createDto,
      received_by: createDto['received_by'] || 'operator1',
    };
    const createdLot = await this.inventoryLotRepository.create(lotToCreate);

    // Tự động tạo giao dịch Receipt cho lô mới
    await this.inventoryTransactionService.create({
      lot_id: createdLot.lot_id,
      transaction_type: TransactionType.Receipt,
      quantity: createdLot.quantity,
      unit_of_measure: createdLot.unit_of_measure,
      performed_by: lotToCreate.received_by || 'system',
      reference_number: `lot-create:${createdLot.lot_id}`,
      notes: 'Auto-created receipt transaction for new lot.',
      transaction_date: new Date().toISOString(),
    });

    return this.convertToResponse(createdLot);
  }

  /**
   * Lấy danh sách tất cả lô hàng có phân trang
   * 
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số bản ghi/trang (mặc định: 10)
   * @returns PaginatedInventoryLotResponse - Dữ liệu phân trang
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedInventoryLotResponse> {
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be >= 1');
    }

    const { data, total } = await this.inventoryLotRepository.findAll(
      page,
      limit,
    );
    return {
      data: data.map((lot) => this.convertToResponse(lot)),
      total,
      page,
      limit,
    };
  }

  /**
   * Tìm lô hàng theo lot_id
   * 
   * @param lot_id - ID của lô hàng (LOT-XXX)
   * @returns InventoryLotResponseDto - Thông tin lô hàng
   * @throws NotFoundException nếu không tìm thấy
   */
  async findById(lot_id: string): Promise<InventoryLotResponseDto> {
    const lot = await this.inventoryLotRepository.findById(lot_id);
    if (!lot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }
    return this.convertToResponse(lot);
  }

  /**
   * Tìm lô hàng theo material_id (tất cả lô của một vật tư)
   * 
   * @param material_id - ID của vật tư
   * @param page - Số trang
   * @param limit - Số bản ghi/trang
   * @returns PaginatedInventoryLotResponse - Dữ liệu phân trang
   */
  async findByMaterialId(
    material_id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedInventoryLotResponse> {
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be >= 1');
    }

    const { data, total } = await this.inventoryLotRepository.findByMaterialId(
      material_id,
      page,
      limit,
    );
    return {
      data: data.map((lot) => this.convertToResponse(lot)),
      total,
      page,
      limit,
    };
  }

  /**
   * Tìm lô hàng theo trạng thái
   * 
   * @param status - Trạng thái lô (Quarantine, Accepted, Rejected, Depleted)
   * @param page - Số trang
   * @param limit - Số bản ghi/trang
   * @returns PaginatedInventoryLotResponse - Dữ liệu phân trang
   * @throws BadRequestException nếu trạng thái không hợp lệ
   */
  async findByStatus(
    status: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedInventoryLotResponse> {
    if (
      !Object.values(InventoryLotStatus).includes(status as InventoryLotStatus)
    ) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const { data, total } = await this.inventoryLotRepository.findByStatus(
      status,
      page,
      limit,
    );
    return {
      data: data.map((lot) => this.convertToResponse(lot)),
      total,
      page,
      limit,
    };
  }

  /**
   * Tìm các lô mẫu (is_sample = true)
   * 
   * @param page - Số trang
   * @param limit - Số bản ghi/trang
   * @returns PaginatedInventoryLotResponse - Dữ liệu phân trang
   */
  async findSampleLots(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedInventoryLotResponse> {
    const { data, total } =
      await this.inventoryLotRepository.findBySampleStatus(true, page, limit);
    return {
      data: data.map((lot) => this.convertToResponse(lot)),
      total,
      page,
      limit,
    };
  }

  /**
   * Tìm các lô mẫu của một lô cha
   * 
   * @param parent_lot_id - ID lô cha
   * @returns Danh sách lô mẫu
   */
  async findSamplesByParentLot(
    parent_lot_id: string,
  ): Promise<InventoryLotResponseDto[]> {
    const lots =
      await this.inventoryLotRepository.findSamplesByParentLot(parent_lot_id);
    return lots.map((lot) => this.convertToResponse(lot));
  }

  /**
   * Tìm kiếm lô hàng theo từ khóa
   * Tìm trong: manufacturer_name, manufacturer_lot, supplier_name, lot_id
   * 
   * @param query - Từ khóa tìm kiếm
   * @param page - Số trang
   * @param limit - Số bản ghi/trang
   * @returns PaginatedInventoryLotResponse - Dữ liệu phân trang
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedInventoryLotResponse> {
    if (!query.trim()) {
      throw new BadRequestException('Vui lòng nhập từ khóa tìm kiếm');
    }

    const { data, total } = await this.inventoryLotRepository.search(
      query,
      page,
      limit,
    );
    return {
      data: data.map((lot) => this.convertToResponse(lot)),
      total,
      page,
      limit,
    };
  }

  /**
   * Lọc lô hàng theo nhiều tiêu chí
   * 
   * @param filter - Các tiêu chí lọc (material_id, status, is_sample, manufacturer_name)
   * @param page - Số trang
   * @param limit - Số bản ghi/trang
   * @returns PaginatedInventoryLotResponse - Dữ liệu phân trang
   */
  async filterLots(
    filter: InventoryLotSearchParams,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedInventoryLotResponse> {
    // Validate trạng thái nếu có
    if (
      filter.status &&
      !Object.values(InventoryLotStatus).includes(filter.status)
    ) {
      throw new BadRequestException(`Invalid status: ${filter.status}`);
    }

    const { data, total } = await this.inventoryLotRepository.findByFilter(
      filter,
      page,
      limit,
    );
    return {
      data: data.map((lot) => this.convertToResponse(lot)),
      total,
      page,
      limit,
    };
  }

  /**
   * Cập nhật lô hàng
   * Tự động tạo InventoryTransaction nếu số lượng thay đổi
   * Ghi Audit Log cho các trường được thay đổi
   * 
   * @param lot_id - ID lô hàng
   * @param updateDto - Dữ liệu cập nhật
   * @param actor - Người thực hiện (tùy chọn)
   * @param ctx - Context cho audit log (IP, user agent...)
   * @returns InventoryLotResponseDto - Thông tin lô sau khi cập nhật
   * @throws NotFoundException nếu không tìm thấy lô
   * @throws BadRequestException nếu ngày không hợp lệ
   * @throws ConflictException nếu chuyển đổi trạng thái không hợp lệ
   */
  async update(
    lot_id: string,
    updateDto: Partial<UpdateInventoryLotDto>,
    actor?: { username: string; user_id?: string },
    ctx: LogContext = {},
  ): Promise<InventoryLotResponseDto> {
    // Kiểm tra lô tồn tại
    const existingLot = await this.inventoryLotRepository.findById(lot_id);
    if (!existingLot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }

    // Validate: manufacture_date không được sau expiration_date
    const manufactureDate = updateDto.manufacture_date
      ? new Date(updateDto.manufacture_date)
      : existingLot.manufacture_date
        ? new Date(existingLot.manufacture_date)
        : null;
    const expirationDate = updateDto.expiration_date
      ? new Date(updateDto.expiration_date)
      : new Date(existingLot.expiration_date);
    if (manufactureDate && manufactureDate > expirationDate) {
      throw new BadRequestException(
        'Hạn sử dụng không được trước ngày sản xuất',
      );
    }

    // Validate ngày nếu cung cấp cả hai
    if (updateDto.received_date && updateDto.expiration_date) {
      if (
        new Date(updateDto.received_date) > new Date(updateDto.expiration_date)
      ) {
        throw new BadRequestException(
          'Received date must be before expiration date',
        );
      }
    }

    if (updateDto.quantity && updateDto.quantity >= 0) {
      // Tính toán thay đổi số lượng
      const quantityDelta = updateDto.quantity - existingLot.quantity;
      const quantityChanged = quantityDelta !== 0;

      if (updateDto.quantity < 0) {
        throw new BadRequestException('Quantity cannot be negative');
      }

      // Kiểm tra nếu lô sẽ thành Depleted
      if (
        updateDto.quantity === 0 &&
        existingLot.status !== InventoryLotStatus.DEPLETED
      ) {
        updateDto.status = InventoryLotStatus.DEPLETED;
      }

      if (quantityChanged) {
        // Tạo giao dịch tồn kho cho thay đổi số lượng
        await this.inventoryTransactionService.create({
          lot_id,
          transaction_type:
            quantityDelta > 0 ? TransactionType.Receipt : TransactionType.Usage,
          quantity: quantityDelta,
          unit_of_measure:
            updateDto.unit_of_measure || existingLot.unit_of_measure,
          performed_by: updateDto.qc_by || existingLot.received_by || 'system',
          reference_number: `lot-update:${lot_id}`,
          notes: `Quantity changed from ${existingLot.quantity} to ${updateDto.quantity}`,
          transaction_date: new Date().toISOString(),
        });
      }
    }

    // Validate chuyển đổi trạng thái
    if (updateDto.status) {
      this.validateStatusTransition(existingLot.status, updateDto.status);
    }

    // Nếu cập nhật qc_by thì push vào history
    let updateWithTrace = { ...updateDto };
    if (updateDto.qc_by) {
      updateWithTrace = {
        ...updateWithTrace,
        qc_by: updateDto.qc_by,
        history: [
          ...(existingLot.history || []),
          { action: 'QC', by: updateDto.qc_by, status: updateDto.status },
        ],
      };
    }
    const updatedLot = await this.inventoryLotRepository.update(
      lot_id,
      updateWithTrace,
    );
    if (!updatedLot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }

    // Ghi Audit Log: ghi lại giá trị cũ và mới
    if (actor?.username) {
      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      const tracked = [
        'material_id',
        'manufacturer_name',
        'manufacturer_lot',
        'supplier_name',
        'manufacture_date',
        'received_date',
        'expiration_date',
        'in_use_expiration_date',
        'status',
        'quantity',
        'unit_of_measure',
        'storage_location',
        'notes',
      ] as const;
      for (const key of tracked) {
        if (key in updateDto) {
          oldValues[key] = (existingLot as any)[key] ?? null;
          newValues[key] = (updateDto as any)[key] ?? null;
        }
      }
      await this.auditLogService
        .log(
          actor.username,
          AuditAction.INVENTORY_LOT_UPDATED,
          ctx,
          { lot_id, old: oldValues, new: newValues },
          actor.user_id,
        )
        .catch(() => {});
    }

    return this.convertToResponse(updatedLot);
  }

  /**
   * Cập nhật trạng thái lô hàng
   * Kiểm tra chuyển đổi trạng thái hợp lệ
   * Tự động điều chỉnh số lượng nếu đánh dấu Depleted
   * 
   * @param lot_id - ID lô hàng
   * @param newStatus - Trạng thái mới
   * @returns InventoryLotResponseDto - Thông tin lô sau khi cập nhật
   */
  async updateStatus(
    lot_id: string,
    newStatus: string,
  ): Promise<InventoryLotResponseDto> {
    // Kiểm tra lô tồn tại
    const existingLot = await this.inventoryLotRepository.findById(lot_id);
    if (!existingLot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }

    // Validate chuyển đổi trạng thái
    this.validateStatusTransition(existingLot.status, newStatus);

    // Nếu đánh dấu Depleted nhưng quantity > 0, tự động tạo Usage transaction
    if (newStatus === InventoryLotStatus.DEPLETED && existingLot.quantity > 0) {
      await this.inventoryLotRepository.update(lot_id, { quantity: 0 });
      await this.inventoryTransactionService.create({
        lot_id,
        transaction_type: TransactionType.Usage,
        quantity: -existingLot.quantity,
        unit_of_measure: existingLot.unit_of_measure,
        performed_by: existingLot.qc_by || existingLot.received_by || 'system',
        reference_number: `lot-deplete:${lot_id}`,
        notes: `Auto-adjusted quantity to 0 when marking lot as Depleted.`,
        transaction_date: new Date().toISOString(),
      });
    }

    const updatedLot = await this.inventoryLotRepository.updateStatus(
      lot_id,
      newStatus,
    );
    if (!updatedLot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }
    return this.convertToResponse(updatedLot);
  }

  /**
   * Xóa lô hàng
   * Chỉ cho phép xóa khi:
   * - Lô có trạng thái Quarantine
   * - Lô chỉ có tối đa 1 giao dịch (là giao dịch Receipt tự động khi tạo)
   * 
   * @param lot_id - ID lô hàng
   * @returns Thông báo xóa thành công
   * @throws NotFoundException nếu không tìm thấy
   * @throws ConflictException nếu có giao dịch liên quan hoặc không phải trạng thái Quarantine
   */
  async delete(lot_id: string): Promise<{ success: boolean; message: string }> {
    // Kiểm tra lô tồn tại
    const lot = await this.inventoryLotRepository.findById(lot_id);
    if (!lot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }

    // Chỉ cho phép xóa khi không có giao dịch liên quan (hoặc chỉ có giao dịch Receipt ban đầu)
    const { items: transactions, total } =
      await this.inventoryTransactionService.getAll(
        { lot_id },
        { page: 1, limit: 2 },
      );

    if (total > 1) {
      throw new ConflictException(
        `Cannot delete inventory lot ${lot_id} because it has related transactions.`,
      );
    }

    const isInitialReceipt =
      total === 1 &&
      transactions[0].transaction_type === TransactionType.Receipt &&
      transactions[0].reference_number === `lot-create:${lot_id}`;

    if (total === 1 && !isInitialReceipt) {
      throw new ConflictException(
        `Cannot delete inventory lot ${lot_id} because it has related transactions.`,
      );
    }

    if (lot.status !== InventoryLotStatus.QUARANTINE) {
      throw new ConflictException(
        `Cannot delete inventory lot with status ${lot.status}. Only Quarantine lots can be deleted.`,
      );
    }

    // Xóa giao dịch Receipt tự động khi xóa lô
    if (isInitialReceipt) {
      await this.inventoryTransactionService.deleteByLotId(lot_id);
    }

    await this.inventoryLotRepository.delete(lot_id);
    return {
      success: true,
      message: `Inventory lot ${lot_id} deleted successfully`,
    };
  }

  /**
   * Lấy danh sách lô sắp hết hạn (trong vòng X ngày tới)
   * 
   * @param days - Số ngày (mặc định: 30)
   * @returns Danh sách lô sắp hết hạn
   */
  async getExpiringSoon(days: number = 30): Promise<InventoryLotResponseDto[]> {
    if (days < 1 || days > 365) {
      throw new BadRequestException('Days must be between 1 and 365');
    }
    const lots = await this.inventoryLotRepository.findExpiringSoon(days);
    return lots.map((lot) => this.convertToResponse(lot));
  }

  /**
   * Lấy danh sách lô đã hết hạn
   * 
   * @returns Danh sách lô đã hết hạn
   */
  async getExpiredLots(): Promise<InventoryLotResponseDto[]> {
    const lots = await this.inventoryLotRepository.findExpiredLots();
    return lots.map((lot) => this.convertToResponse(lot));
  }

  /**
   * Thống kê lô hàng
   * Bao gồm: tổng số, theo trạng thái, sắp hết hạn, đã hết hạn
   * 
   * @returns Object chứa các chỉ số thống kê
   */
  async getLotsStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    expiringSoon: number;
    expired: number;
  }> {
    const all = await this.inventoryLotRepository.findAll(1, 10000);
    const total = all.total;

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(InventoryLotStatus)) {
      byStatus[status] =
        await this.inventoryLotRepository.countByStatus(status);
    }

    const expiringSoon = (
      await this.inventoryLotRepository.findExpiringSoon(30)
    ).length;
    const expired = (await this.inventoryLotRepository.findExpiredLots())
      .length;

    return {
      total,
      byStatus,
      expiringSoon,
      expired,
    };
  }

  /**
   * Lấy danh sách lô hàng dạng options (cho dropdown)
   * 
   * @param options - Các tùy chọn lọc
   * @param page - Số trang
   * @param limit - Số bản ghi/trang
   * @returns Danh sách lô với thông tin cơ bản
   */
  async getOptions(
    options: {
      q?: string;
      material_id?: string;
      status?: string;
      exclude_statuses?: string[];
      warehouse_id?: string;
    },
    page: number = 1,
    limit: number = 20,
  ) {
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be >= 1');
    }

    const { data, total } = await this.inventoryLotRepository.findOptions(
      options,
      page,
      Math.min(limit, 100),
    );

    return {
      items: data.map((lot) => ({
        lot_id: lot.lot_id,
        material_id: lot.material_id,
        quantity: lot.quantity,
        unit_of_measure: lot.unit_of_measure,
        status: lot.status,
        warehouse_id: lot.warehouse_id,
        storage_location: lot.storage_location,
      })),
      total,
      page,
      limit: Math.min(limit, 100),
    };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Kiểm tra chuyển đổi trạng thái lô hàng có hợp lệ không
   * 
   * Quy tắc chuyển đổi:
   * - Quarantine → Accepted, Rejected, Depleted
   * - Accepted → Depleted, Rejected (khi retest fail)
   * - Rejected → Không thể thay đổi (terminal state)
   * - Depleted → Không thể thay đổi (terminal state)
   * 
   * @param currentStatus - Trạng thái hiện tại
   * @param newStatus - Trạng thái mới
   * @throws ConflictException nếu chuyển đổi không hợp lệ
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    if (currentStatus === newStatus) {
      return; // Cho phép cập nhật cùng trạng thái
    }

    const allowedTransitions: Record<string, string[]> = {
      [InventoryLotStatus.QUARANTINE]: [
        InventoryLotStatus.ACCEPTED,
        InventoryLotStatus.REJECTED,
        InventoryLotStatus.DEPLETED,
      ],
      [InventoryLotStatus.ACCEPTED]: [
        InventoryLotStatus.DEPLETED,
        InventoryLotStatus.REJECTED,
      ],
      [InventoryLotStatus.REJECTED]: [], // Trạng thái cuối
      [InventoryLotStatus.DEPLETED]: [], // Trạng thái cuối
    };

    if (
      !allowedTransitions[currentStatus] ||
      !allowedTransitions[currentStatus].includes(newStatus)
    ) {
      throw new ConflictException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  // ==================== QC-Test Integration Methods ====================

  /**
   * Lấy nhiều lô hàng theo danh sách ID
   * Dùng cho qc-test.service.ts → getSupplierPerformance()
   */
  async getLotsByIds(lot_ids: string[]): Promise<InventoryLotResponseDto[]> {
    if (!lot_ids || lot_ids.length === 0) {
      return [];
    }
    const lots = await this.inventoryLotRepository.findByLotIds(lot_ids);
    return lots.map((lot) => this.convertToResponse(lot));
  }

  /**
   * Lấy lô hàng theo trạng thái (không phân trang)
   * Alias cho findByStatus để hỗ trợ code QC cũ
   */
  async getLotsByStatus(status: string): Promise<InventoryLotResponseDto[]> {
    if (
      !Object.values(InventoryLotStatus).includes(status as InventoryLotStatus)
    ) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    const { data } = await this.inventoryLotRepository.findByStatus(
      status,
      1,
      9999,
    );
    return data.map((lot) => this.convertToResponse(lot));
  }

  /**
   * Cập nhật hàng loạt nhiều lô sang trạng thái Quarantine
   * Dùng cho QC pages cho bulk actions
   */
  async bulkQuarantine(
    lot_ids: string[],
  ): Promise<{ updated: number; message: string }> {
    if (!lot_ids || lot_ids.length === 0) {
      throw new BadRequestException('No lots provided');
    }

    // Validate tất cả lô tồn tại
    const lots = await this.getLotsByIds(lot_ids);
    if (lots.length !== lot_ids.length) {
      throw new NotFoundException(
        `Some lots not found. Expected ${lot_ids.length}, found ${lots.length}`,
      );
    }

    // Cập nhật sang trạng thái Quarantine
    const result = await this.inventoryLotRepository.updateStatusByIds(
      lot_ids,
      InventoryLotStatus.QUARANTINE,
    );

    return {
      updated: result.modifiedCount,
      message: `Successfully updated ${result.modifiedCount} lots to Quarantine status`,
    };
  }

  /**
   * Chuyển đổi từ InventoryLot Document sang InventoryLotResponseDto
   */
  private convertToResponse(lot: InventoryLot): InventoryLotResponseDto {
    return {
      lot_id: lot.lot_id,
      material_id: lot.material_id,
      manufacturer_name: lot.manufacturer_name,
      manufacturer_lot: lot.manufacturer_lot,
      supplier_name: lot.supplier_name,
      manufacture_date: lot.manufacture_date,
      received_date: lot.received_date,
      expiration_date: lot.expiration_date,
      in_use_expiration_date: lot.in_use_expiration_date,
      status: lot.status,
      quantity: lot.quantity,
      unit_of_measure: lot.unit_of_measure,
      warehouse_id: lot.warehouse_id,
      storage_location: lot.storage_location,
      is_sample: lot.is_sample,
      parent_lot_id: lot.parent_lot_id,
      notes: lot.notes,
      created_date: lot.created_date,
      modified_date: lot.modified_date,
      received_by: lot.received_by,
      qc_by: lot.qc_by,
      history: lot.history,
    };
  }
}
