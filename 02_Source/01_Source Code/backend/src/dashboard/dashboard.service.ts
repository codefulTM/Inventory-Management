import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryTransactionDocument,
  InventoryTransaction,
} from '../schemas/inventory-transaction.schema';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import {
  InventoryValuationSummary,
  InventoryValuationSummaryDocument,
} from '../schemas/inventory-valuation-summary.schema';
import {
  WarehouseSlip,
  WarehouseSlipDocument,
} from '../schemas/warehouse-slip.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private readonly txModel: Model<InventoryTransactionDocument>,
    @InjectModel(InventoryLot.name)
    private readonly lotModel: Model<InventoryLotDocument>,
    @InjectModel(InventoryValuationSummary.name)
    private readonly valuationModel: Model<InventoryValuationSummaryDocument>,
    @InjectModel(WarehouseSlip.name)
    private readonly slipModel: Model<WarehouseSlipDocument>,
  ) {}

  // Minimal summary: totals and top materials
  async getSummary(filters: { warehouseId?: string } = {}) {
    const match: any = {};
    if (filters.warehouseId) match.warehouse_id = filters.warehouseId;

    const [lotAgg, valuationAgg] = await Promise.all([
      this.lotModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$material_id',
              total_quantity: { $sum: '$quantity' },
            },
          },
        ])
        .exec(),
      this.valuationModel
        .aggregate([
          { $group: { _id: null, total_value: { $sum: '$total_value' } } },
        ])
        .exec(),
    ]);

    const total_quantity = lotAgg.reduce(
      (s, r) => s + (r.total_quantity || 0),
      0,
    );
    const topMaterials = lotAgg
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10)
      .map((r) => ({ material_id: r._id, total_quantity: r.total_quantity }));

    const total_value = valuationAgg[0]?.total_value ?? 0;

    return {
      total_quantity,
      total_value,
      top_materials: topMaterials,
    };
  }

  // trends: time-series of in/out quantities
  async getTrends(params: {
    metric: 'in' | 'out';
    from?: string;
    to?: string;
    interval?: 'day' | 'week' | 'month';
    warehouseId?: string;
  }) {
    const { metric, from, to, interval = 'day', warehouseId } = params;
    const match: any = {};
    if (metric === 'in') match.transaction_type = 'Receipt';
    else match.transaction_type = { $in: ['Usage', 'Disposal'] };

    if (from || to) match.transaction_date = {};
    if (from) match.transaction_date.$gte = new Date(from);
    if (to) match.transaction_date.$lte = new Date(to);

    // optional lookup to inventory_lots to filter by warehouse
    const pipeline: any[] = [{ $match: match }];
    if (warehouseId) {
      pipeline.push({
        $lookup: {
          from: 'inventory_lots',
          localField: 'lot_id',
          foreignField: 'lot_id',
          as: 'lot',
        },
      });
      pipeline.push({ $unwind: '$lot' });
      pipeline.push({ $match: { 'lot.warehouse_id': warehouseId } });
    }

    // build date bucketing
    const dateFormat =
      interval === 'month'
        ? '%Y-%m'
        : interval === 'week'
          ? '%Y-%V'
          : '%Y-%m-%d';

    pipeline.push({
      $group: {
        _id: {
          $dateToString: { format: dateFormat, date: '$transaction_date' },
        },
        total_quantity: { $sum: '$quantity' },
      },
    });
    pipeline.push({ $sort: { _id: 1 } });

    const rows = await this.txModel.aggregate(pipeline).exec();
    return rows.map((r) => ({
      period: r._id,
      total_quantity: r.total_quantity,
    }));
  }

  // drilldown: paginated transactions or slips
  async getDrilldown(params: {
    page?: number;
    limit?: number;
    materialId?: string;
    from?: string;
    to?: string;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const match: any = {};
    if (params.from || params.to) match.transaction_date = {};
    if (params.from) match.transaction_date.$gte = new Date(params.from);
    if (params.to) match.transaction_date.$lte = new Date(params.to);

    const pipeline: any[] = [];
    if (params.materialId) {
      pipeline.push({
        $lookup: {
          from: 'inventory_lots',
          localField: 'lot_id',
          foreignField: 'lot_id',
          as: 'lot_docs',
        },
      });
      pipeline.push({ $unwind: '$lot_docs' });
      pipeline.push({ $match: { 'lot_docs.material_id': params.materialId } });
    }

    if (Object.keys(match).length) pipeline.unshift({ $match: match });

    const agg = pipeline.concat([
      { $sort: { transaction_date: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const [items, totalObj] = await Promise.all([
      this.txModel.aggregate(agg).exec(),
      this.txModel.aggregate(pipeline.concat([{ $count: 'total' }])).exec(),
    ]);

    const total = totalObj[0]?.total ?? 0;
    return { items, total, page, limit };
  }
}
