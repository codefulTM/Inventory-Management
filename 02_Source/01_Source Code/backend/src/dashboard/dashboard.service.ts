import { Injectable } from '@nestjs/common';
import { InventoryTransaction } from '../schemas/inventory-transaction.schema';
import { InventoryLot } from '../schemas/inventory-lot.schema';
import { WarehouseSlip } from '../schemas/warehouse-slip.schema';
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { InventoryTransactionRepository } from '../inventory-transaction/inventory-transaction.repository';
import { WarehouseSlipRepository } from '../warehouse-slip/warehouse-slip.repository';

@Injectable()
export class DashboardService {
  /**
   * DashboardService dùng các Repository để tách trách nhiệm DB ra khỏi logic báo cáo.
   * Không dùng trực tiếp Model nữa theo yêu cầu — giúp dễ test và tái sử dụng.
   */
  constructor(
    private readonly txRepo: InventoryTransactionRepository,
    private readonly lotRepo: InventoryLotRepository,
    private readonly slipRepo: WarehouseSlipRepository,
  ) {}

  // Minimal summary: totals and top materials
  /**
   * Lấy summary tổng quan cho dashboard.
   * - Tính `total_quantity` từ `inventory_lots` (có filter theo kho nếu truyền vào).
   * - Tính `total_value` thủ công: cho mỗi lô lấy `unit_price` gần nhất từ `warehouse_slips.lines` (nếu có),
   *   rồi nhân với `quantity` để tính giá trị lô, sau đó cộng vào tổng theo material.
   * Lý do: tránh phụ thuộc vào collection `inventory_valuation_summaries`.
   */
  async getSummary(filters: { warehouseId?: string } = {}) {
    const match: any = {};
    if (filters.warehouseId) match.warehouse_id = filters.warehouseId;

    // Pipeline: nhóm theo material_id, tính tổng quantity và tổng value (dùng unit_price gần nhất của lô)
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'warehouse_slips',
          let: { lotId: '$lot_id' },
          pipeline: [
            { $unwind: '$lines' },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$lines.lot_id', '$$lotId'] },
                    { $ne: ['$lines.unit_price', null] },
                  ],
                },
              },
            },
            { $sort: { confirmed_at: -1, created_date: -1 } },
            { $limit: 1 },
            { $project: { unit_price: '$lines.unit_price' } },
          ],
          as: 'latest_line',
        },
      },
      {
        $addFields: {
          unit_price: {
            $ifNull: [{ $arrayElemAt: ['$latest_line.unit_price', 0] }, 0],
          },
          lot_value: {
            $multiply: [
              '$quantity',
              {
                $ifNull: [{ $arrayElemAt: ['$latest_line.unit_price', 0] }, 0],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$material_id',
          total_quantity: { $sum: '$quantity' },
          total_value: { $sum: '$lot_value' },
        },
      },
    ];

    const rows = await this.lotRepo.aggregate(pipeline);

    const total_quantity = rows.reduce(
      (s, r) => s + (r.total_quantity || 0),
      0,
    );
    const total_value = rows.reduce((s, r) => s + (r.total_value || 0), 0);

    const topMaterials = rows
      .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
      .slice(0, 10)
      .map((r: any) => ({
        material_id: r._id,
        total_quantity: r.total_quantity,
      }));

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

    const rows = await this.txRepo.aggregate(pipeline);
    return rows.map((r: any) => ({
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
      this.txRepo.aggregate(agg),
      this.txRepo.aggregate(pipeline.concat([{ $count: 'total' }])),
    ]);

    const total = totalObj[0]?.total ?? 0;
    return { items, total, page, limit };
  }
}
