// Import các decorator và lớp từ NestJS Mongoose để định nghĩa schema
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// Import Document từ Mongoose để tạo kiểu dữ liệu kết hợp
import { Document } from 'mongoose';

// Tạo kiểu dữ liệu kết hợp giữa AuditLog class và Mongoose Document
export type AuditLogDocument = AuditLog & Document;

/**
 * Enum định nghĩa tất cả các hành động có thể được ghi lại trong audit log
 * Mỗi hành động đại diện cho một sự kiện quan trọng trong hệ thống
 */
export enum AuditAction {
  // Các hành động liên quan đến đăng nhập/đăng xuất
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',           // Đăng nhập thành công
  LOGIN_FAILED = 'LOGIN_FAILED',             // Đăng nhập thất bại
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',         // Đăng xuất thành công
  LOGOUT_FAILED = 'LOGOUT_FAILED',          // Đăng xuất thất bại

  // Các hành động liên quan đến quản lý người dùng
  USER_CREATED = 'USER_CREATED',            // Tạo người dùng mới
  USER_UPDATED = 'USER_UPDATED',            // Cập nhật thông tin người dùng
  USER_LOCKED = 'USER_LOCKED',              // Khóa tài khoản người dùng
  USER_UNLOCKED = 'USER_UNLOCKED',          // Mở khóa tài khoản người dùng

  // Các hành động liên quan đến đặt lại mật khẩu
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',   // Yêu cầu đặt lại mật khẩu
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',   // Hoàn tất đặt lại mật khẩu

  // Các hành động liên quan đến kho
  INVENTORY_LOT_UPDATED = 'INVENTORY_LOT_UPDATED',         // Cập nhật lô hàng tồn kho
}

/**
 * Schema định nghĩa cấu trúc dữ liệu của Audit Log trong MongoDB
 * Lưu trữ thông tin về mọi hành động quan trọng trong hệ thống
 * 
 * @Schema decorator với collection='audit_logs' để chỉ định tên collection trong MongoDB
 */
@Schema({ collection: 'audit_logs' })
export class AuditLog {
  // Tên người dùng thực hiện hành động (bắt buộc)
  @Prop({ required: true })
  username: string;

  // ID của người dùng (tùy chọn, có thể không có nếu là hành động hệ thống)
  @Prop()
  user_id?: string;

  // Loại hành động (bắt buộc, phải là một trong các giá trị trong AuditAction)
  @Prop({ required: true, enum: Object.values(AuditAction) })
  action: AuditAction;

  // Địa chỉ IP của người dùng (tùy chọn)
  @Prop()
  ip?: string;

  // Thông tin User Agent của trình duyệt (tùy chọn)
  @Prop()
  user_agent?: string;

  // Chi tiết bổ sung về hành động (đối tượng linh hoạt, tùy chọn)
  // Ví dụ: { target: 'user123', changes: {...} }
  @Prop({ type: Object })
  details?: Record<string, any>;

  // Thời điểm xảy ra hành động (mặc định là thời điểm hiện tại)
  @Prop({ type: Date, default: () => new Date() })
  timestamp: Date;
}

// Tạo Mongoose Schema từ class AuditLog
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Tạo các index để tối ưu hóa truy vấn:
// Index theo timestamp giảm dần (mới nhất trước) - thường dùng để sắp xếp
AuditLogSchema.index({ timestamp: -1 });
// Index theo username để tìm kiếm nhanh theo người dùng
AuditLogSchema.index({ username: 1 });
// Index theo action để lọc nhanh theo loại hành động
AuditLogSchema.index({ action: 1 });
