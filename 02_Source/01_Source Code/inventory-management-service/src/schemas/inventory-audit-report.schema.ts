import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

/**
 * InventoryAuditReportSchema - Schema định nghĩa báo cáo kiểm kê tồn kho trong MongoDB
 *
 * Collection: inventory_audit_reports
 *
 * Mô tả: Lưu trữ các báo cáo kiểm kê định kỳ (periodic stocktake reports).
 * Mỗi báo cáo đại diện cho một lần kiểm kê tồn kho trong một khoảng thời gian.
 *
 * Vòng đời báo cáo:
 * PENDING → PROCESSING → READY (hoặc FAILED)
 *
 * Các trường chính:
 * - report_id: Mã báo cáo duy nhất (RPT-XXX)
 * - period_from/period_to: Kỳ báo cáo (từ ngày, đến ngày)
 * - scope_warehouse_ids: Danh sách kho trong phạm vi báo cáo
 * - status: Trạng thái báo cáo (PENDING, PROCESSING, READY, FAILED)
 * - summary_*: Tổng hợp (số dòng, số lượng, giá trị)
 * - file_storage_key: Khóa lưu trữ file PDF
 * - file_sha256: Mã băm SHA-256 của file PDF
 * - signature_*: Thông tin chữ ký số
 * - requested_by: Người yêu cầu báo cáo
 * - approved_by: Người phê duyệt
 * - failure_reason: Lý do thất bại (nếu có)
 */
export type InventoryAuditReportDocument = InventoryAuditReport & Document;

/** Trạng thái báo cáo kiểm kê
 * - PENDING: Chờ xử lý
 * - PROCESSING: Đang xử lý (render PDF, ký số, lưu trữ)
 * - READY: Sẵn sàng (có thể tải về)
 * - FAILED: Thất bại (có lý do trong failure_reason)
 */
export enum InventoryAuditReportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

const options: SchemaOptions = {
  collection: 'inventory_audit_reports',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryAuditReport {
  /** Mã báo cáo duy nhất (RPT-XXX) - Business key */
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  report_id: string;

  /** Từ ngày (kỳ báo cáo) */
  @Prop({ type: Date, required: true })
  period_from: Date;

  /** Đến ngày (kỳ báo cáo) */
  @Prop({ type: Date, required: true })
  period_to: Date;

  /** Danh sách mã kho trong phạm vi báo cáo (scope) */
  @Prop({ type: [String], default: [] })
  scope_warehouse_ids: string[];

  /** Mã mẫu báo cáo (mặc định: STATUTORY_V1) */
  @Prop({
    type: String,
    required: true,
    maxlength: 50,
    default: 'STATUTORY_V1',
  })
  report_template_code: string;

  /** Trạng thái báo cáo: PENDING → PROCESSING → READY/FAILED */
  @Prop({
    type: String,
    enum: Object.values(InventoryAuditReportStatus),
    required: true,
  })
  status: InventoryAuditReportStatus;

  /** Tổng số dòng báo cáo (số lô hàng được kiểm kê) */
  @Prop({ type: Number, default: 0 })
  summary_total_items: number;

  /** Tổng số lượng tồn kho tại thời điểm báo cáo */
  @Prop({ type: Number, default: 0 })
  summary_total_quantity: number;

  /** Tổng giá trị tồn kho (tạm tính = tổng số lượng × đơn giá) */
  @Prop({ type: Number, default: 0 })
  summary_total_value: number;

  /** Khóa lưu trữ file PDF (tên file hoặc đường dẫn) */
  @Prop({ type: String, maxlength: 300, required: false })
  file_storage_key?: string;

  /** Mã băm SHA-256 của file PDF (dùng để xác thực tính toàn vẹn) */
  @Prop({ type: String, maxlength: 128, required: false })
  file_sha256?: string;

  /** Kích thước file PDF (bytes) */
  @Prop({ type: Number, required: false })
  file_size_bytes?: number;

  /** Phiên bản PDF (vd: "1.0") */
  @Prop({ type: String, maxlength: 20, required: false })
  pdf_version?: string;

  /** Thời điểm ký số file PDF */
  @Prop({ type: Date, required: false })
  signed_at?: Date;

  /** Nhà cung cấp chữ ký số (RSA_SHA256 hoặc HMAC_SHA256_FALLBACK) */
  @Prop({ type: String, maxlength: 50, required: false })
  signature_provider?: string;

  /** Số serial chứng thư số (nếu dùng RSA) */
  @Prop({ type: String, maxlength: 128, required: false })
  signature_serial_number?: string;

  /** Chữ ký số có hiệu lực từ ngày */
  @Prop({ type: Date, required: false })
  signature_valid_from?: Date;

  /** Chữ ký số hết hiệu lực ngày */
  @Prop({ type: Date, required: false })
  signature_valid_to?: Date;

  /** Người yêu cầu/tạo báo cáo (username hoặc user ID) */
  @Prop({ type: String, required: true, maxlength: 50 })
  requested_by: string;

  /** Người phê duyệt báo cáo (Manager) */
  @Prop({ type: String, required: false, maxlength: 50 })
  approved_by?: string;

  /** Ghi chú thêm về báo cáo */
  @Prop({ type: String, required: false, maxlength: 500 })
  note?: string;

  /** Lý do thất bại (nếu status = FAILED) */
  @Prop({ type: String, required: false, maxlength: 500 })
  failure_reason?: string;
}

export const InventoryAuditReportSchema =
  SchemaFactory.createForClass(InventoryAuditReport);

// ==================== Indexes ====================

// Unique index trên report_id (business key)
InventoryAuditReportSchema.index({ report_id: 1 }, { unique: true });

// Compound index: trạng thái + ngày tạo (lấy báo cáo theo trạng thái, mới nhất trước)
InventoryAuditReportSchema.index({ status: 1, created_date: -1 });

// Compound index: người yêu cầu + ngày tạo (báo cáo cá nhân)
InventoryAuditReportSchema.index({ requested_by: 1, created_date: -1 });

// Compound index: kỳ báo cáo (từ ngày, đến ngày)
InventoryAuditReportSchema.index({ period_from: 1, period_to: 1 });
