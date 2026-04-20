import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from '../../schemas/inventory-transaction.schema';
import { QCTest, QCTestDocument } from '../../schemas/qc-test.schema';
import { AuditLog, AuditLogDocument } from '../../audit-log/audit-log.schema';

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    @InjectModel(InventoryTransaction.name)
    private readonly inventoryTransactionModel: Model<InventoryTransactionDocument>,
    @InjectModel(QCTest.name)
    private readonly qcTestModel: Model<QCTestDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async getInventoryStatus(): Promise<
    Array<{
      material_id: string;
      lot_id: string;
      quantity: number;
      status: string;
      expiration_date?: Date;
    }>
  > {
    const lots = await this.inventoryLotModel
      .find({})
      .sort({ expiration_date: 1 })
      .lean()
      .exec();

    return lots.map((l: any) => ({
      material_id: l.material_id,
      lot_id: l.lot_id,
      quantity: l.quantity,
      status: l.status,
      expiration_date: l.expiration_date,
    }));
  }

  async getMaterialUsage(
    from?: Date,
    to?: Date,
  ): Promise<Array<{ material_id: string; transaction_count: number; total_quantity: number }>> {
    const match: any = {};
    if (from || to) {
      match.transaction_date = {};
      if (from) match.transaction_date.$gte = from;
      if (to) match.transaction_date.$lte = to;
    }

    const pipeline: any[] = [];
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    pipeline.push(
      {
        $lookup: {
          from: 'inventory_lots',
          localField: 'lot_id',
          foreignField: 'lot_id',
          as: 'lot_docs',
        },
      },
      {
        $addFields: {
          material_id: { $ifNull: [{ $arrayElemAt: ['$lot_docs.material_id', 0] }, null] },
        },
      },
      {
        $group: {
          _id: '$material_id',
          transaction_count: { $sum: 1 },
          total_quantity: { $sum: '$quantity' },
        },
      },
      {
        $project: {
          material_id: '$_id',
          transaction_count: 1,
          total_quantity: 1,
          _id: 0,
        },
      },
      { $sort: { total_quantity: -1 } },
    );

    const rows = await this.inventoryTransactionModel.aggregate(pipeline as any).exec();
    return rows as Array<{ material_id: string; transaction_count: number; total_quantity: number }>;
  }

  async getQcPerformance(): Promise<
    Array<{ supplier_name: string; approved: number; rejected: number; quality_rate: number }>
  > {
    const pipeline = [
      {
        $lookup: {
          from: 'inventory_lots',
          localField: 'lot_id',
          foreignField: 'lot_id',
          as: 'lot_docs',
        },
      },
      {
        $addFields: {
          supplier_name: { $ifNull: [{ $arrayElemAt: ['$lot_docs.supplier_name', 0] }, 'Unknown'] },
        },
      },
      {
        $group: {
          _id: '$supplier_name',
          approved: { $sum: { $cond: [{ $eq: ['$result_status', 'Pass'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$result_status', 'Fail'] }, 1, 0] } },
        },
      },
      {
        $project: {
          supplier_name: '$_id',
          approved: 1,
          rejected: 1,
          quality_rate: {
            $cond: [
              { $eq: [{ $add: ['$approved', '$rejected'] }, 0] },
              0,
              { $multiply: [{ $divide: ['$approved', { $add: ['$approved', '$rejected'] }] }, 100] },
            ],
          },
          _id: 0,
        },
      },
      { $sort: { quality_rate: -1 } },
    ];

    const rows = await this.qcTestModel.aggregate(pipeline as any).exec();
    return rows as Array<{ supplier_name: string; approved: number; rejected: number; quality_rate: number }>;
  }

  async getAuditTrail(): Promise<
    Array<{
      action: string;
      entity: string;
      performed_by: string;
      performed_at: Date;
      details?: Record<string, unknown>;
    }>
  > {
    const docs = await this.auditLogModel.find({}).sort({ timestamp: -1 }).limit(200).lean().exec();

    return docs.map((d: any) => ({
      action: d.action,
      entity: d.details?.entity || d.details?.lot_id || d.details?.transaction_id || '',
      performed_by: d.username,
      performed_at: d.timestamp,
      details: d.details,
    }));
  }
}
