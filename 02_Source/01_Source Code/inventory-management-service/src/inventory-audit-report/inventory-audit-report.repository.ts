import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryAuditReport,
  InventoryAuditReportDocument,
  InventoryAuditReportStatus,
} from '../schemas/inventory-audit-report.schema';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import { Material, MaterialDocument } from '../schemas/material.schema';
import { Warehouse, WarehouseDocument } from '../schemas/warehouse.schema';

/**
 * Interface định nghĩa các bộ lọc khi tìm kiếm báo cáo
 */
export interface InventoryAuditReportFilters {
  status?: InventoryAuditReportStatus; // Lọc theo trạng thái báo cáo
  requested_by?: string;               // Lọc theo người yêu cầu
  from?: Date;                         // Lọc từ ngày tạo
  to?: Date;                           // Lọc đến ngày tạo
}

/**
 * Interface định nghĩa tham số phân trang
 */
export interface InventoryAuditReportPagination {
  page?: number;  // Số trang (bắt đầu từ 1)
  limit?: number; // Số bản ghi trên một trang
}

/**
 * Interface nội bộ dùng cho truy vấn MongoDB
 */
interface InventoryAuditReportMongoQuery {
  status?: InventoryAuditReportStatus;
  requested_by?: string;
  created_date?: {
    $gte?: Date; // Greater than or equal (từ ngày)
    $lte?: Date; // Less than or equal (đến ngày)
  };
}

/**
 * Interface định nghĩa một item trong snapshot báo cáo kiểm kê
 * Chứa thông tin chi tiết của một lô hàng tại thời điểm tạo báo cáo
 */
export interface InventoryAuditReportSnapshotItem {
  lot_id: string;            // Mã lô hàng
  material_id: string;       // Mã nguyên liệu
  material_name: string;     // Tên nguyên liệu
  warehouse_id: string;      // Mã kho
  warehouse_name: string;    // Tên kho
  storage_location: string;  // Vị trí lưu kho (zone/rack/bin)
  quantity: number;           // Số lượng tồn
  unit_of_measure: string;   // Đơn vị tính
  status: string;            // Trạng thái lô hàng
  expiration_date?: Date;    // Ngày hết hạn (nếu có)
}

/**
 * Interface nội bộ cho dữ liệu lô hàng lấy từ DB
 */
interface InventoryLotSnapshotRow {
  lot_id: string;
  material_id: string;
  warehouse_id?: string;
  storage_location?: string;
  quantity: number;
  unit_of_measure: string;
  status: string;
  expiration_date?: Date;
}

/**
 * Interface định nghĩa dữ liệu tạo mới một bản ghi báo cáo
 */
export interface CreateInventoryAuditReportPayload {
  report_id: string;               // Mã báo cáo (tự sinh)
  period_from: Date;                // Từ ngày
  period_to: Date;                  // Đến ngày
  scope_warehouse_ids: string[];    // Danh sách kho trong phạm vi báo cáo
  report_template_code: string;     // Mã mẫu báo cáo
  status: InventoryAuditReportStatus; // Trạng thái ban đầu (PENDING)
  requested_by: string;             // Người yêu cầu
  approved_by?: string;             // Người phê duyệt (tùy chọn)
  note?: string;                    // Ghi chú (tùy chọn)
}

/**
 * Repository xử lý tất cả các truy vấn database liên quan đến báo cáo kiểm kê
 * Bao gồm: tạo/sửa báo cáo, lấy snapshot tồn kho, truy vấn danh sách
 */
@Injectable()
export class InventoryAuditReportRepository {
  constructor(
    // Model báo cáo kiểm kê chính
    @InjectModel(InventoryAuditReport.name)
    private readonly reportModel: Model<InventoryAuditReportDocument>,
    // Model lô hàng - dùng để lấy snapshot tồn kho
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    // Model nguyên liệu - dùng để lấy tên nguyên liệu
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
    // Model kho - dùng để lấy tên kho
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
  ) {}

  /**
   * Tạo bản ghi báo cáo ở trạng thái PENDING (draft)
   * @param payload - Dữ liệu báo cáo cần tạo
   * @returns Bản ghi báo cáo vừa được lưu vào DB
   */
  async createDraft(payload: CreateInventoryAuditReportPayload) {
    const doc = new this.reportModel(payload);
    return doc.save();
  }

  /**
   * Cập nhật trạng thái báo cáo thành PROCESSING (đang xử lý)
   * @param reportId - Mã báo cáo cần cập nhật
   * @returns Bản ghi báo cáo đã cập nhật
   */
  async markProcessing(reportId: string) {
    return this.reportModel
      .findOneAndUpdate(
        { report_id: reportId },
        {
          status: InventoryAuditReportStatus.PROCESSING,
          failure_reason: null, // Xóa lý do lỗi cũ (nếu có)
        },
        { new: true }, // Trả về document sau khi update
      )
      .exec();
  }

  /**
   * Đánh dấu báo cáo đã sẵn sàng (READY) kèm thông tin file và chữ ký số
   * @param reportId - Mã báo cáo
   * @param data - Thông tin tóm tắt, file và chữ ký số
   * @returns Bản ghi báo cáo đã cập nhật
   */
  async markReady(
    reportId: string,
    data: {
      summary_total_items: number;      // Tổng số dòng báo cáo
      summary_total_quantity: number;    // Tổng số lượng tồn
      summary_total_value: number;       // Tổng giá trị tồn (tạm tính)
      file_storage_key: string;          // Khóa lưu trữ file PDF
      file_sha256: string;               // Mã băm SHA-256 của file PDF
      file_size_bytes: number;           // Kích thước file (bytes)
      pdf_version: string;              // Phiên bản PDF
      signed_at: Date;                  // Thời điểm ký
      signature_provider: string;       // Nhà cung cấp chữ ký (RSA_SHA256 hoặc HMAC_SHA256_FALLBACK)
      signature_serial_number?: string;  // Số serial chứng thư (nếu có)
      signature_valid_from?: Date;       // Chữ ký có hiệu lực từ
      signature_valid_to?: Date;         // Chữ ký hết hiệu lực
      approved_by?: string;              // Người phê duyệt
    },
  ) {
    return this.reportModel
      .findOneAndUpdate(
        { report_id: reportId },
        {
          ...data,
          status: InventoryAuditReportStatus.READY,
          failure_reason: null,
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Đánh dấu báo cáo thất bại (FAILED)
   * @param reportId - Mã báo cáo
   * @param reason - Lý do thất bại (sẽ cắt ngắn nếu quá 500 ký tự)
   * @returns Bản ghi báo cáo đã cập nhật
   */
  async markFailed(reportId: string, reason: string) {
    return this.reportModel
      .findOneAndUpdate(
        { report_id: reportId },
        {
          status: InventoryAuditReportStatus.FAILED,
          failure_reason: reason.slice(0, 500), // Giới hạn độ dài lý do lỗi
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Tìm báo cáo theo report_id
   * @param reportId - Mã báo cáo cần tìm
   * @returns Bản ghi báo cáo hoặc null nếu không tìm thấy
   */
  async findByReportId(reportId: string) {
    return this.reportModel.findOne({ report_id: reportId }).exec();
  }

  /**
   * Lấy danh sách báo cáo có phân trang và lọc
   * @param filters - Các điều kiện lọc (status, requested_by, from/to)
   * @param pagination - Thông số phân trang (page, limit)
   * @returns Object chứa danh sách items, tổng số bản ghi, page và limit
   */
  async findAll(
    filters: InventoryAuditReportFilters,
    pagination: InventoryAuditReportPagination,
  ) {
    const query: InventoryAuditReportMongoQuery = {};

    // Áp dụng bộ lọc trạng thái
    if (filters.status) {
      query.status = filters.status;
    }

    // Áp dụng bộ lọc người yêu cầu
    if (filters.requested_by) {
      query.requested_by = filters.requested_by;
    }

    // Áp dụng bộ lọc khoảng thời gian tạo
    if (filters.from || filters.to) {
      query.created_date = {};
      if (filters.from) {
        query.created_date.$gte = filters.from; // Từ ngày
      }
      if (filters.to) {
        query.created_date.$lte = filters.to; // Đến ngày
      }
    }

    // Tính toán phân trang
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
    const skip = (page - 1) * limit;

    // Thực hiện song song: lấy dữ liệu + đếm tổng số bản ghi
    const [items, total] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ created_date: -1 }) // Sắp xếp mới nhất trước
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reportModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Lấy snapshot (ảnh chụp) tồn kho tại thời điểm periodTo
   * Truy vấn tất cả lô hàng, sau đó join với material và warehouse để lấy tên
   * 
   * @param params - Tham số: periodTo (đến ngày), warehouseIds (kho cần lấy), includeZeroBalance (có lấy lô có số lượng = 0)
   * @returns Danh sách các item snapshot đã được sắp xếp theo kho -> nguyên liệu -> lô
   */
  async getSnapshotItems(params: {
    periodTo: Date;
    warehouseIds?: string[];
    includeZeroBalance?: boolean;
  }): Promise<InventoryAuditReportSnapshotItem[]> {
    // Điều kiện truy vấn: lấy các lô hàng được sửa đổi trước hoặc tại periodTo
    const match: Record<string, unknown> = {
      modified_date: { $lte: params.periodTo },
    };

    // Lọc theo danh sách kho (nếu có)
    if (params.warehouseIds && params.warehouseIds.length > 0) {
      match.warehouse_id = { $in: params.warehouseIds };
    }

    // Loại bỏ các lô có số lượng = 0 (trừ khi yêu cầu bao gồm)
    if (!params.includeZeroBalance) {
      match.quantity = { $gt: 0 };
    }

    // Lấy danh sách lô hàng thỏa mãn điều kiện
    const lots = await this.inventoryLotModel
      .find(match)
      .select({
        lot_id: 1,
        material_id: 1,
        warehouse_id: 1,
        storage_location: 1,
        quantity: 1,
        unit_of_measure: 1,
        status: 1,
        expiration_date: 1,
      })
      .lean<InventoryLotSnapshotRow[]>()
      .exec();

    if (lots.length === 0) {
      return [];
    }

    // Thu thập tất cả material_id và warehouse_id để query thông tin chi tiết
    const materialIds = [
      ...new Set(lots.map((lot) => String(lot.material_id))),
    ];
    const warehouseIds = [
      ...new Set(
        lots
          .map((lot) => lot.warehouse_id)
          .filter((value): value is string => typeof value === 'string'),
      ),
    ] as string[];

    // Query song song để lấy tên nguyên liệu và tên kho
    const [materials, warehouses] = await Promise.all([
      this.materialModel
        .find({ material_id: { $in: materialIds } })
        .select({ material_id: 1, material_name: 1 })
        .lean()
        .exec(),
      this.warehouseModel
        .find({ warehouse_id: { $in: warehouseIds } })
        .select({ warehouse_id: 1, warehouse_name: 1 })
        .lean()
        .exec(),
    ]);

    // Tạo Map để tra cứu nhanh tên nguyên liệu và tên kho
    const materialMap = new Map(
      materials.map((item) => [item.material_id, item.material_name]),
    );
    const warehouseMap = new Map(
      warehouses.map((item) => [item.warehouse_id, item.warehouse_name]),
    );

    // Chuyển đổi dữ liệu lô hàng thành snapshot items và sắp xếp
    return lots
      .map((lot) => ({
        lot_id: String(lot.lot_id),
        material_id: String(lot.material_id),
        material_name:
          materialMap.get(String(lot.material_id)) ?? String(lot.material_id),
        warehouse_id: lot.warehouse_id ?? 'N/A',
        warehouse_name: lot.warehouse_id
          ? (warehouseMap.get(lot.warehouse_id) ?? lot.warehouse_id)
          : 'Không xác định',
        storage_location: lot.storage_location ?? 'N/A',
        quantity: Number(lot.quantity),
        unit_of_measure: String(lot.unit_of_measure),
        status: String(lot.status),
        expiration_date: lot.expiration_date,
      }))
      .sort((a, b) => {
        // Sắp xếp: Kho -> Nguyên liệu -> Lô
        if (a.warehouse_id !== b.warehouse_id) {
          return a.warehouse_id.localeCompare(b.warehouse_id);
        }
        if (a.material_id !== b.material_id) {
          return a.material_id.localeCompare(b.material_id);
        }
        return a.lot_id.localeCompare(b.lot_id);
      });
  }
}
