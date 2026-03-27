/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { InventoryLot } from 'src/schemas/inventory-lot.schema';

@Injectable()
export class InventoryLotService {
  constructor(
    private readonly inventoryLotRepository: InventoryLotRepository,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  async create(
    createDto: CreateInventoryLotDto,
  ): Promise<InventoryLotResponseDto> {
    // Validate dates
    if (
      new Date(createDto.received_date) > new Date(createDto.expiration_date)
    ) {
      throw new BadRequestException(
        'Received date must be before expiration date',
      );
    }

    // Validate quantity
    const quantity = createDto.quantity;
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // For sample lots, parent_lot_id is optional but recommended
    if (createDto.is_sample && !createDto.parent_lot_id) {
      console.warn('Sample lot created without parent_lot_id');
    }

    // Set received_by nếu có (giả sử lấy từ createDto hoặc context, ở đây demo hardcode)
    const lotToCreate = {
      ...createDto,
      received_by: createDto['received_by'] || 'operator1',
    };
    const createdLot = await this.inventoryLotRepository.create(lotToCreate);

    // Create a corresponding receipt transaction for the newly created lot
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

  async findById(lot_id: string): Promise<InventoryLotResponseDto> {
    const lot = await this.inventoryLotRepository.findById(lot_id);
    if (!lot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }
    return this.convertToResponse(lot);
  }

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

  async findSamplesByParentLot(
    parent_lot_id: string,
  ): Promise<InventoryLotResponseDto[]> {
    const lots =
      await this.inventoryLotRepository.findSamplesByParentLot(parent_lot_id);
    return lots.map((lot) => this.convertToResponse(lot));
  }

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

  async filterLots(
    filter: InventoryLotSearchParams,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedInventoryLotResponse> {
    // Validate status if provided
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

  async update(
    lot_id: string,
    updateDto: Partial<UpdateInventoryLotDto>,
  ): Promise<InventoryLotResponseDto> {
    // Verify lot exists
    const existingLot = await this.inventoryLotRepository.findById(lot_id);
    if (!existingLot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }

    // Validate dates if both provided
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
      // Determine quantity change and validate new quantity
      const quantityDelta = updateDto.quantity - existingLot.quantity;
      const quantityChanged = quantityDelta !== 0;

      if (updateDto.quantity < 0) {
        throw new BadRequestException('Quantity cannot be negative');
      }

      // Check if lot would become Depleted
      if (
        updateDto.quantity === 0 &&
        existingLot.status !== InventoryLotStatus.DEPLETED
      ) {
        updateDto.status = InventoryLotStatus.DEPLETED;
      }

      if (quantityChanged) {
        // Create inventory transaction for quantity change (Receipt if +, Usage if -)
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

    // Validate status transitions
    if (updateDto.status) {
      this.validateStatusTransition(existingLot.status, updateDto.status);
    }

    // Nếu update qc_by thì push vào history và set qc_by
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

    return this.convertToResponse(updatedLot);
  }

  async updateStatus(
    lot_id: string,
    newStatus: string,
  ): Promise<InventoryLotResponseDto> {
    // Verify lot exists
    const existingLot = await this.inventoryLotRepository.findById(lot_id);
    if (!existingLot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(existingLot.status, newStatus);

    // If marking as Depleted but quantity still > 0, adjust quantity and record a Usage transaction.
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

  async delete(lot_id: string): Promise<{ success: boolean; message: string }> {
    // Verify lot exists
    const lot = await this.inventoryLotRepository.findById(lot_id);
    if (!lot) {
      throw new NotFoundException(`Inventory lot ${lot_id} not found`);
    }

    // Only allow delete when:
    //  1) there are no related transactions at all
    //  2) OR the only transaction is the initial receipt created when the lot was created
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

    // Remove the auto-created receipt transaction when deleting the lot
    if (isInitialReceipt) {
      await this.inventoryTransactionService.deleteByLotId(lot_id);
    }

    await this.inventoryLotRepository.delete(lot_id);
    return {
      success: true,
      message: `Inventory lot ${lot_id} deleted successfully`,
    };
  }

  async getExpiringSoon(days: number = 30): Promise<InventoryLotResponseDto[]> {
    if (days < 1 || days > 365) {
      throw new BadRequestException('Days must be between 1 and 365');
    }
    const lots = await this.inventoryLotRepository.findExpiringSoon(days);
    return lots.map((lot) => this.convertToResponse(lot));
  }

  async getExpiredLots(): Promise<InventoryLotResponseDto[]> {
    const lots = await this.inventoryLotRepository.findExpiredLots();
    return lots.map((lot) => this.convertToResponse(lot));
  }

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

  // ==================== Private Helper Methods ====================

  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    // Valid transitions:
    // Quarantine → Accepted, Rejected, Depleted
    // Accepted → Depleted, Rejected (on retest failure)
    // Rejected → permanent (cannot change)
    // Depleted → permanent (cannot change)

    if (currentStatus === newStatus) {
      return; // Same status is allowed
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
      [InventoryLotStatus.REJECTED]: [], // Terminal state
      [InventoryLotStatus.DEPLETED]: [], // Terminal state
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

  private convertToResponse(lot: InventoryLot): InventoryLotResponseDto {
    return {
      lot_id: lot.lot_id,
      material_id: lot.material_id,
      manufacturer_name: lot.manufacturer_name,
      manufacturer_lot: lot.manufacturer_lot,
      supplier_name: lot.supplier_name,
      received_date: lot.received_date,
      expiration_date: lot.expiration_date,
      in_use_expiration_date: lot.in_use_expiration_date,
      status: lot.status,
      quantity: lot.quantity,
      unit_of_measure: lot.unit_of_measure,
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
