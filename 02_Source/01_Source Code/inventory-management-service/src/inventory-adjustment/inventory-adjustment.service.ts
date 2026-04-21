import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { QueryInventoryAdjustmentDto } from './dto/query-inventory-adjustment.dto';
import {
  InventoryAdjustmentFilterOptions,
  InventoryAdjustmentPaginationOptions,
  InventoryAdjustmentRepository,
} from './inventory-adjustment.repository';
import { InventoryAdjustmentReasonCode } from '../schemas/inventory-adjustment.schema';
import { RedisIdService } from '../redis-id/redis-id.service';

export interface RequesterContext {
  actor: string;
  role?: string;
}

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    private readonly repo: InventoryAdjustmentRepository,
    private readonly redisIdService: RedisIdService,
  ) {}

  async create(dto: CreateInventoryAdjustmentDto, requester: RequesterContext) {
    if (dto.adjustment_quantity === 0) {
      throw new BadRequestException('adjustment_quantity cannot be zero');
    }

    if (
      dto.reason_code === InventoryAdjustmentReasonCode.OTHER &&
      (!dto.reason_note || dto.reason_note.trim().length < 10)
    ) {
      throw new BadRequestException(
        'reason_note must contain at least 10 characters when reason_code is OTHER',
      );
    }

    return this.repo.runInTransaction(async (session) => {
      const lot = await this.repo.findLotByLotId(dto.lot_id, session);
      if (!lot) {
        throw new NotFoundException(
          `Inventory lot ${dto.lot_id} was not found for adjustment`,
        );
      }

      const quantityBefore = lot.quantity;
      const quantityAfter = quantityBefore + dto.adjustment_quantity;

      if (quantityAfter < 0) {
        throw new ConflictException('Inventory quantity cannot be negative');
      }

      const materialTotalQuantityBefore = await this.repo.sumMaterialQuantity(
        lot.material_id,
        session,
      );
      const materialTotalQuantityAfter =
        materialTotalQuantityBefore + dto.adjustment_quantity;

      if (materialTotalQuantityAfter < 0) {
        throw new ConflictException(
          'Material total quantity cannot be negative after adjustment',
        );
      }

      const valuationBefore =
        materialTotalQuantityBefore * dto.unit_cost_snapshot;
      const valuationAfter =
        materialTotalQuantityAfter * dto.unit_cost_snapshot;
      const valuationDelta = dto.adjustment_quantity * dto.unit_cost_snapshot;

      const adjustmentId = await this.redisIdService.nextId('ADJ');
      const transactionId = await this.redisIdService.nextId('TXN');

      const updatedLot = await this.repo.updateLotQuantity(
        lot.lot_id,
        quantityAfter,
        session,
      );
      if (!updatedLot) {
        throw new NotFoundException(
          `Inventory lot ${dto.lot_id} not found while updating quantity`,
        );
      }

      await this.repo.createAdjustmentTransaction(
        {
          transaction_id: transactionId,
          lot_id: lot.lot_id,
          quantity: dto.adjustment_quantity,
          unit_of_measure: lot.unit_of_measure,
          performed_by: requester.actor,
          notes: dto.reason_note,
          reference_number: `adjustment:${adjustmentId}`,
          adjustment_id: adjustmentId,
          adjustment_reason_code: dto.reason_code,
          transaction_date: new Date(),
        },
        session,
      );

      const adjustment = await this.repo.createAdjustment(
        {
          adjustment_id: adjustmentId,
          lot_id: lot.lot_id,
          material_id: lot.material_id,
          adjustment_quantity: dto.adjustment_quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          reason_code: dto.reason_code,
          reason_note: dto.reason_note,
          unit_cost_snapshot: dto.unit_cost_snapshot,
          valuation_before: valuationBefore,
          valuation_after: valuationAfter,
          valuation_delta: valuationDelta,
          performed_by: requester.actor,
          approved_by: requester.actor,
          linked_transaction_id: transactionId,
        },
        session,
      );

      await this.repo.upsertValuationSummary(
        lot.material_id,
        materialTotalQuantityAfter,
        dto.unit_cost_snapshot,
        valuationAfter,
        adjustmentId,
        requester.actor,
        session,
      );

      return {
        adjustment_id: adjustment.adjustment_id,
        lot_before: {
          lot_id: lot.lot_id,
          quantity: quantityBefore,
          unit_of_measure: lot.unit_of_measure,
        },
        lot_after: {
          lot_id: lot.lot_id,
          quantity: quantityAfter,
          unit_of_measure: lot.unit_of_measure,
        },
        transaction_id: transactionId,
        valuation_before: valuationBefore,
        valuation_after: valuationAfter,
        valuation_delta: valuationDelta,
        material_id: lot.material_id,
        reason_code: dto.reason_code,
        reason_note: dto.reason_note,
        performed_by: requester.actor,
        created_date: adjustment.created_date,
      };
    });
  }

  async findAll(query: QueryInventoryAdjustmentDto) {
    const filters: InventoryAdjustmentFilterOptions = {
      lot_id: query.lot_id,
      material_id: query.material_id,
      performed_by: query.performed_by,
      reason_code: query.reason_code,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    const paging: InventoryAdjustmentPaginationOptions = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };

    return this.repo.findAll(filters, paging);
  }

  async findOne(adjustmentId: string) {
    const item = await this.repo.findOneByAdjustmentId(adjustmentId);
    if (!item) {
      throw new NotFoundException(
        `Inventory adjustment ${adjustmentId} was not found`,
      );
    }

    return item;
  }
}
