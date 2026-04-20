import { Injectable } from '@nestjs/common';
// Schema imports chỉ để biểu diễn kiểu và giúp hiểu domain
import { InventoryTransaction } from '../schemas/inventory-transaction.schema';
import { InventoryLot } from '../schemas/inventory-lot.schema';
import { WarehouseSlip } from '../schemas/warehouse-slip.schema';
// Repository: encapsulate truy vấn DB, không dùng Model trực tiếp
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { InventoryTransactionRepository } from '../inventory-transaction/inventory-transaction.repository';
import { WarehouseSlipRepository } from '../warehouse-slip/warehouse-slip.repository';

@Injectable()
export class DashboardService {
  /**
   * DashboardService dùng các Repository để tách trách nhiệm DB ra khỏi logic báo cáo.
   * - `txRepo`  : thao tác trên collection `inventory_transactions`.
   * - `lotRepo` : thao tác trên collection `inventory_lots`.
   * - `slipRepo`: thao tác trên collection `warehouse_slips`.
   *
   * Lợi ích:
   * - Dễ mock khi viết unit test.
   * - Tái sử dụng các phương thức truy vấn chung.
   */
  constructor(
    private readonly txRepo: InventoryTransactionRepository,
    private readonly lotRepo: InventoryLotRepository,
    private readonly slipRepo: WarehouseSlipRepository,
  ) {}

  // Minimal summary: totals and top materials
  /**
   * Lấy summary tổng quan cho dashboard.
   * Mô tả ngắn (hiện tại):
   * 1) Lấy tất cả `inventory_lots` (có thể filter theo `warehouse_id`).
   * 2) Với mỗi lô, lookup tất cả `warehouse_slips.lines` có `lot_id` tương ứng và tính tổng
   *    `line_value_sum = SUM(lines.quantity * lines.unit_price)` cho lô đó.
   * 3) Dùng `lot_value = line_value_sum` (nếu không có dòng có unit_price thì `lot_value = 0`),
   *    sau đó nhóm theo `material_id` để tính `total_value` và `total_quantity`.
   *
   * Ghi chú vận hành:
   * - Cách này cộng tất cả dòng có giá để tính giá trị lô (khác với lấy "latest unit_price").
   * - Vẫn có thể bổ sung fallback (ví dụ: nếu không có line value thì dùng `lot.quantity * fallback_price`).
   * - Về hiệu năng: pipeline này thực hiện lookup + group per-lot; nếu dữ liệu lớn có thể cần pre-aggregate hoặc cache.
   */
  async getSummary(filters: { warehouseId?: string } = {}) {
    // Chuẩn bị điều kiện match cho pipeline
    const match: any = {};
    if (filters.warehouseId) match.warehouse_id = filters.warehouseId; // nếu truyền warehouseId thì lọc

    // Pipeline aggregation trên collection `inventory_lots`
    // Mục tiêu: với mỗi lot tính `lot_value` dựa trên các dòng trong `warehouse_slips.lines`
    // Giải thích các trường/operator quan trọng:
    // - `$match`: lọc document trong `inventory_lots` theo điều kiện (ví dụ `warehouse_id`).
    //   + Ở đây `match` có thể chứa `{ warehouse_id: 'WH-001' }` để giới hạn lô thuộc kho đó.
    // - `$lookup`: join sang collection `warehouse_slips` để truy xuất các `lines` liên quan tới `lot_id`.
    // - `$unwind: '$lines'`: tách mảng `lines` thành nhiều document con, mỗi document chứa 1 dòng `lines`.
    // - `$expr`: cho phép dùng expression trong $match của lookup; `$and`, `$eq`, `$ne` là các toán tử logic/so sánh.
    //   + `{ $eq: ['$lines.lot_id', '$$lotId'] }` so sánh trường `lines.lot_id` của slip với biến `$$lotId` (từ let).
    //   + `{ $ne: ['$lines.unit_price', null] }` đảm bảo chỉ tính các dòng có `unit_price` hợp lệ.
    // - Trong lookup pipeline dùng `$group` để tính `line_value_sum = SUM(lines.quantity * lines.unit_price)` cho từng lot.
    // - `$arrayElemAt`: lấy phần tử đầu của mảng kết quả lookup (`line_aggregates[0].line_value_sum`).
    // - `$ifNull`: nếu giá trị lookup không tồn tại thì fallback về 0.
    // - Cuối cùng `$group` bên ngoài nhóm theo `material_id` để tổng hợp `total_quantity` và `total_value`.
    // Lưu ý vận hành: các tên trường dùng trong pipeline (ví dụ `lot_id`, `quantity`, `unit_price`, `material_id`) là
    // tên trường trong schema `InventoryLot` và `WarehouseSlip.lines`.
    // Thay đổi chính: tính `lot_value` là tổng của các (lines.quantity * lines.unit_price) thay vì lấy latest unit_price.
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          // join sang collection `warehouse_slips`
          from: 'warehouse_slips',
          // biến local để truyền vào pipeline lookup: $$lotId sẽ nhận giá trị của inventory_lots.lot_id
          let: { lotId: '$lot_id' },
          pipeline: [
            // 1) $unwind: tách mảng `lines` ra để xử lý từng dòng riêng
            { $unwind: '$lines' },
            // 2) $match với $expr: so sánh các field của lines với biến $$lotId
            {
              $match: {
                $expr: {
                  $and: [
                    // điều kiện: dòng slip phải liên quan tới lot hiện tại
                    { $eq: ['$lines.lot_id', '$$lotId'] },
                    // và chỉ tính các dòng có unit_price (không null)
                    { $ne: ['$lines.unit_price', null] },
                  ],
                },
              },
            },
            // 3) Nhóm các dòng phù hợp của cùng một lot để tính tổng giá trị: SUM(quantity * unit_price)
            {
              $group: {
                _id: null,
                // Tổng giá trị các dòng của lô: SUM(lines.quantity * lines.unit_price)
                line_value_sum: {
                  $sum: { $multiply: ['$lines.quantity', '$lines.unit_price'] },
                },
                // Tổng số lượng theo các dòng slip (không bắt buộc dùng, nhưng lưu để tham khảo)
                line_quantity_sum: { $sum: '$lines.quantity' },
              },
            },
            // 4) Chỉ giữ giá trị aggregate cần thiết
            { $project: { _id: 0, line_value_sum: 1, line_quantity_sum: 1 } },
          ],
          as: 'line_aggregates',
        },
      },
      {
        $addFields: {
          // Lấy giá trị tổng line_value_sum từ kết quả lookup: line_aggregates[0].line_value_sum
          // - $arrayElemAt lấy phần tử đầu tiên của mảng `line_aggregates` (nếu lookup không rỗng)
          // - $ifNull đảm bảo nếu không có aggregate (mảng rỗng) thì trả về 0
          lot_value: {
            $ifNull: [
              { $arrayElemAt: ['$line_aggregates.line_value_sum', 0] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$material_id',
          total_quantity: { $sum: '$quantity' }, // tổng lượng theo material
          total_value: { $sum: '$lot_value' }, // tổng giá trị theo material (tổng các lot_value)
        },
      },
    ];

    // Chạy aggregation qua repository nhằm tách concerns
    const rows = await this.lotRepo.aggregate(pipeline);

    // Tính tổng quantity & value toàn hệ thống từ kết quả nhóm theo material
    const total_quantity = rows.reduce(
      (s, r) => s + (r.total_quantity || 0),
      0,
    );
    const total_value = rows.reduce((s, r) => s + (r.total_value || 0), 0);

    // Lấy top materials theo total_quantity giảm dần, giới hạn 10
    const topMaterials = rows
      .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
      .slice(0, 10)
      .map((r: any) => ({
        material_id: r._id,
        total_quantity: r.total_quantity,
      }));

    // Trả về object summary cho frontend
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

    // match điều kiện transaction_type theo metric (in/out)
    const match: any = {};
    if (metric === 'in') match.transaction_type = 'Receipt';
    else match.transaction_type = { $in: ['Usage', 'Disposal'] };

    // range ngày
    if (from || to) match.transaction_date = {};
    if (from) match.transaction_date.$gte = new Date(from);
    if (to) match.transaction_date.$lte = new Date(to);

    // Chuẩn bị pipeline: bắt đầu bằng match transaction
    const pipeline: any[] = [{ $match: match }];

    // Nếu cần filter theo kho thì lookup inventory_lots để biết warehouse_id của lot
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

    // Chọn format cho grouping theo interval (day/week/month)
    const dateFormat =
      interval === 'month'
        ? '%Y-%m'
        : interval === 'week'
          ? '%Y-%V'
          : '%Y-%m-%d';

    // Group theo chu kỳ thời gian và tính tổng quantity
    // Giải thích các phần chính:
    // - `$dateToString`: format ngày thành chu kỳ (ví dụ '2026-04-20' cho day, '2026-16' cho week, '2026-04' cho month)
    // - `_id` của group dùng giá trị chu kỳ (period) để dễ chuyển thành time-series trên client
    // - `$sum: '$quantity'` cộng dồn `quantity` của các transaction trong cùng period
    // - `$sort: { _id: 1 }` sắp xếp kết quả theo thời gian tăng dần
    pipeline.push({
      $group: {
        _id: {
          // $dateToString chuyển `transaction_date` sang chuỗi theo định dạng `dateFormat`
          $dateToString: { format: dateFormat, date: '$transaction_date' },
        },
        // Tổng lượng trong mỗi period
        total_quantity: { $sum: '$quantity' },
      },
    });
    // Sắp xếp theo period để client có thể hiển thị chuỗi thời gian đúng thứ tự
    pipeline.push({ $sort: { _id: 1 } });

    // Chạy aggregation qua repository (không truy cập model trực tiếp)
    const rows = await this.txRepo.aggregate(pipeline);

    // Chuyển kết quả để phù hợp với client API: [{ period, total_quantity }]
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
    // Pagination defaults
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    // Filter theo ngày nếu có
    const match: any = {};
    if (params.from || params.to) match.transaction_date = {};
    if (params.from) match.transaction_date.$gte = new Date(params.from);
    if (params.to) match.transaction_date.$lte = new Date(params.to);

    // Pipeline xây dựng cho truy vấn drilldown
    const pipeline: any[] = [];
    if (params.materialId) {
      // Nếu lọc theo `materialId`:
      // - `$lookup` join sang `inventory_lots` dựa trên `lot_id` (localField/foreignField)
      // - `$unwind` tách mảng `lot_docs` để có access trực tiếp tới `lot_docs.material_id`
      // - `$match` lọc các transaction mà lot liên quan có `material_id` tương ứng
      pipeline.push({
        $lookup: {
          from: 'inventory_lots',
          localField: 'lot_id',
          foreignField: 'lot_id',
          as: 'lot_docs',
        },
      });
      // Sau lookup, `lot_docs` là mảng; unwind để mỗi document chứa 1 lot_doc
      pipeline.push({ $unwind: '$lot_docs' });
      // Lọc transaction sao cho `lot_docs.material_id` khớp với params.materialId
      pipeline.push({ $match: { 'lot_docs.material_id': params.materialId } });
    }

    // Nếu có điều kiện match do from/to thì thêm vào đầu pipeline
    if (Object.keys(match).length) pipeline.unshift({ $match: match });

    // Gắn thêm sort/skip/limit cho pagination
    // Giải thích:
    // - `$sort`: sắp xếp transaction theo `transaction_date` giảm dần (mới nhất trước)
    // - `$skip`: bỏ qua (page-1)*limit documents để thực hiện pagination
    // - `$limit`: lấy đúng `limit` documents cho 1 trang
    const agg = pipeline.concat([
      { $sort: { transaction_date: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Chạy đồng thời: items page hiện tại và tổng số item (count)
    // Chạy đồng thời:
    // - `items`: trang hiện tại với sort/skip/limit áp dụng
    // - `totalObj`: tổng số item khớp filter (dùng `$count` để biết tổng để client render pagination)
    const [items, totalObj] = await Promise.all([
      this.txRepo.aggregate(agg),
      this.txRepo.aggregate(pipeline.concat([{ $count: 'total' }])),
    ]);

    const total = totalObj[0]?.total ?? 0; // tổng count trả về
    return { items, total, page, limit };
  }
}
