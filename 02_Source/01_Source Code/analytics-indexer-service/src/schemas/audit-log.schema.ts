/**
 * File: schemas/audit-log.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho collection audit_logs
 * 
 * Schema này chỉ sử dụng để đọc dữ liệu phục vụ đồng bộ analytics
 * Collection: audit_logs - Ghi nhận lịch sử hoạt động người dùng
 * 
 * Đặc biệt: Collection này sử dụng 'timestamp' làm trường ngày chính
 * (không phải modified_date như các collection khác)
 * 
 * Sync vào ES index: inventory_audit_reports_{YYYY}_{MM}
 * (Map vào index báo cáo kiểm kê, không phải audit_logs)
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * Schema định nghĩa cấu trúc nhật ký kiểm toán (audit log)
 * @collection: 'audit_logs' - Tên collection trong MongoDB
 * @timestamps: false - Không tự động thêm createdAt/updatedAt
 * (Sử dụng trường timestamp có sẵn)
 */
@Schema({
  collection: 'audit_logs',
  timestamps: false,
})
export class AuditLog {
  @Prop() username: string;              // Tên đăng nhập người dùng
  @Prop() user_id: string;                // ID người dùng
  @Prop() action: string;                 // Hành động (LOGIN, CREATE, UPDATE, DELETE, etc.)
  @Prop() ip: string;                     // Địa chỉ IP thực hiện
  @Prop({ type: Object }) details?: Record<string, any>;  // Chi tiết hành động (entity, ID, etc.)
  
  /** Trường ngày chính của collection này (dùng cho watermark query) */
  @Prop() timestamp: Date;
  
  /**
   * Trường alias để BaseCollectionSync có thể dùng modified_date
   * Sync subclass sẽ map timestamp -> modified_date trước khi index vào ES
   */
  @Prop() modified_date?: Date;
  @Prop() created_date?: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
// Index trên timestamp cho truy vấn watermark (đồng bộ tăng dần)
AuditLogSchema.index({ timestamp: 1 });
// Index dự phòng cho modified_date
AuditLogSchema.index({ modified_date: 1 });
