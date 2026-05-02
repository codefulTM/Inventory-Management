/**
 * File: schemas/inventory-audit-report.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho collection inventory_audit_reports
 * 
 * Schema này chỉ sử dụng để đọc dữ liệu phục vụ đồng bộ analytics
 * Collection: inventory_audit_reports - Báo cáo kiểm kê định kỳ
 * Đồng bộ vào ES index: inventory_audit_reports_{YYYY}_{MM}
 * 
 * Báo cáo kiểm kê (Audit Report) ghi nhận:
 * - Số lượng thực tế vs số lượng trên hệ thống
 * - Chênh lệch tồn kho (nếu có)
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryAuditReportDocument = InventoryAuditReport & Document;

/**
 * Schema định nghĩa cấu trúc báo cáo kiểm kê
 * @collection: 'inventory_audit_reports' - Tên collection trong MongoDB
 * @timestamps: Tự động thêm created_date và modified_date
 */
@Schema({
  collection: 'inventory_audit_reports',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class InventoryAuditReport {
  @Prop() report_id: string;           // Mã báo cáo (unique identifier)
  @Prop() status: string;               // Trạng thái (draft, completed, etc.)
  @Prop() period_from: Date;            // Từ ngày (kỳ kiểm kê)
  @Prop() period_to: Date;              // Đến ngày (kỳ kiểm kê)
  @Prop() created_date: Date;           // Ngày tạo (tự động)
  @Prop() modified_date: Date;          // Ngày sửa đổi (tự động)
  @Prop({ default: false }) deleted?: boolean;   // Cờ soft delete
  @Prop() is_active?: boolean;                 // Trạng thái kích hoạt
}

export const InventoryAuditReportSchema = SchemaFactory.createForClass(InventoryAuditReport);
// Index cho modified_date (dùng cho watermark query)
InventoryAuditReportSchema.index({ modified_date: 1 });
