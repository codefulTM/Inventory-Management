import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  InventoryAdjustment,
  InventoryAdjustmentDocument,
  InventoryAdjustmentReasonCode,
} from '../schemas/inventory-adjustment.schema';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from '../schemas/inventory-transaction.schema';
import {
  InventoryValuationSummary,
  InventoryValuationSummaryDocument,
} from '../schemas/inventory-valuation-summary.schema';
import { TransactionType } from '../inventory-transaction/dto/create-inventory-transaction.dto';

export interface InventoryAdjustmentPaginationOptions {
  page?: number;
  limit?: number;
}

export interface InventoryAdjustmentFilterOptions {
  lot_id?: string;
  material_id?: string;
  performed_by?: string;
  reason_code?: InventoryAdjustmentReasonCode;
  from?: Date;
  to?: Date;
}

export interface CreateInventoryAdjustmentPayload {
  adjustment_id: string;
  lot_id: string;
  material_id: string;
  adjustment_quantity: number;
  quantity_before: number;
  quantity_after: number;
  reason_code: InventoryAdjustmentReasonCode;
  reason_note?: string;
  unit_cost_snapshot: number;
  valuation_before: number;
  valuation_after: number;
  valuation_delta: number;
  performed_by: string;
  approved_by?: string;
  linked_transaction_id: string;
}

export interface CreateAdjustmentTransactionPayload {
  transaction_id: string;
  lot_id: string;
  quantity: number;
  unit_of_measure: string;
  reference_number?: string;
  performed_by: string;
  notes?: string;
  adjustment_id: string;
  adjustment_reason_code: InventoryAdjustmentReasonCode;
  transaction_date: Date;
}

@Injectable()
export class InventoryAdjustmentRepository {
  private readonly logger = new Logger(InventoryAdjustmentRepository.name);

  constructor(
    @InjectModel(InventoryAdjustment.name)
    private readonly adjustmentModel: Model<InventoryAdjustmentDocument>,
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    @InjectModel(InventoryTransaction.name)
    private readonly transactionModel: Model<InventoryTransactionDocument>,
    @InjectModel(InventoryValuationSummary.name)
    private readonly valuationSummaryModel: Model<InventoryValuationSummaryDocument>,
  ) {}

  async runInTransaction<T>(
    work: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.adjustmentModel.db.startSession();

    try {
      let result: T | undefined;

      try {
        await session.withTransaction(async () => {
          result = await work(session);
        });
      } catch (error) {
        if (!this.isUnsupportedTransactionError(error)) {
          throw error;
        }

        this.logger.warn(
          'MongoDB deployment does not support transactions, retrying without transaction.',
        );

        result = await work();
      }

      if (result === undefined) {
        throw new Error('Transaction completed without a result');
      }

      return result;
    } finally {
      await session.endSession();
    }
  }

  private isUnsupportedTransactionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return message.includes(
      'transaction numbers are only allowed on a replica set member or mongos',
    );
  }

  async findLotByLotId(lotId: string, session?: ClientSession) {
    const query = this.inventoryLotModel.findOne({ lot_id: lotId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async sumMaterialQuantity(materialId: string, session?: ClientSession) {
    const pipeline = [
      {
        $match: {
          material_id: materialId,
        },
      },
      {
        $group: {
          _id: '$material_id',
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ];

    const aggregate = this.inventoryLotModel.aggregate<{
      _id: string;
      totalQuantity: number;
    }>(pipeline);

    if (session) {
      aggregate.session(session);
    }

    const rows = await aggregate.exec();
    return rows[0]?.totalQuantity ?? 0;
  }

  async updateLotQuantity(
    lotId: string,
    quantity: number,
    session?: ClientSession,
  ) {
    return this.inventoryLotModel
      .findOneAndUpdate(
        { lot_id: lotId },
        { quantity },
        { new: true, ...(session ? { session } : {}) },
      )
      .exec();
  }

  async createAdjustmentTransaction(
    payload: CreateAdjustmentTransactionPayload,
    session?: ClientSession,
  ) {
    const doc = new this.transactionModel({
      transaction_id: payload.transaction_id,
      lot_id: payload.lot_id,
      transaction_type: TransactionType.Adjustment,
      quantity: payload.quantity,
      unit_of_measure: payload.unit_of_measure,
      transaction_date: payload.transaction_date,
      reference_number: payload.reference_number,
      performed_by: payload.performed_by,
      notes: payload.notes,
      adjustment_id: payload.adjustment_id,
      adjustment_reason_code: payload.adjustment_reason_code,
    });

    if (session) {
      return doc.save({ session });
    }

    return doc.save();
  }

  async createAdjustment(
    payload: CreateInventoryAdjustmentPayload,
    session?: ClientSession,
  ) {
    const doc = new this.adjustmentModel(payload);

    if (session) {
      return doc.save({ session });
    }

    return doc.save();
  }

  async upsertValuationSummary(
    materialId: string,
    totalQuantity: number,
    unitCostReference: number,
    totalValue: number,
    adjustmentId: string,
    updatedBy: string,
    session?: ClientSession,
  ) {
    return this.valuationSummaryModel
      .findOneAndUpdate(
        { material_id: materialId },
        {
          material_id: materialId,
          total_quantity: totalQuantity,
          unit_cost_reference: unitCostReference,
          total_value: totalValue,
          last_adjustment_id: adjustmentId,
          last_updated_by: updatedBy,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          ...(session ? { session } : {}),
        },
      )
      .exec();
  }

  async findAll(
    filters: InventoryAdjustmentFilterOptions = {},
    pagination: InventoryAdjustmentPaginationOptions = { page: 1, limit: 20 },
  ) {
    const mongoQuery: {
      lot_id?: string;
      material_id?: string;
      performed_by?: string;
      reason_code?: InventoryAdjustmentReasonCode;
      created_date?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = {};

    if (filters.lot_id) {
      mongoQuery.lot_id = filters.lot_id;
    }

    if (filters.material_id) {
      mongoQuery.material_id = filters.material_id;
    }

    if (filters.performed_by) {
      mongoQuery.performed_by = filters.performed_by;
    }

    if (filters.reason_code) {
      mongoQuery.reason_code = filters.reason_code;
    }

    if (filters.from || filters.to) {
      mongoQuery.created_date = {};
      if (filters.from) mongoQuery.created_date.$gte = filters.from;
      if (filters.to) mongoQuery.created_date.$lte = filters.to;
    }

    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.adjustmentModel
        .find(mongoQuery)
        .sort({ created_date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.adjustmentModel.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findOneByAdjustmentId(adjustmentId: string) {
    return this.adjustmentModel.findOne({ adjustment_id: adjustmentId }).exec();
  }
}
