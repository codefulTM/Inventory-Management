/**
 * File: audit-log.schema.ts
 * Mô tả: MongoDB schema cho collection 'audit_logs' — nhật ký kiểm toán.
 *
 * Chức năng: Định nghĩa cấu trúc lưu trữ các sự kiện audit log, bao gồm:
 * - Thông tin người thực hiện (username, user_id)
 * - Loại hành động (từ enum AuditAction)
 * - Thông tin ngữ cảnh (IP, User Agent)
 * - Chi tiết bổ sung (dạng object linh hoạt)
 * - Thời gian xảy ra sự kiện
 *
 * Indexes: timestamp (desc), username, action — tối ưu cho truy vấn phân tích log.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * AuditAction — Enum định nghĩa các loại hành động được ghi nhận trong audit log.
 * Bao gồm: đăng nhập/đăng xuất, quản lý user, đặt lại mật khẩu, cập nhật tồn kho.
 */
export enum AuditAction {
  /** Đăng nhập thành công */
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  /** Đăng nhập thất bại */
  LOGIN_FAILED = 'LOGIN_FAILED',
  /** Đăng xuất thành công */
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
  /** Đăng xuất thất bại */
  LOGOUT_FAILED = 'LOGOUT_FAILED',
  /** Tạo user mới */
  USER_CREATED = 'USER_CREATED',
  /** Cập nhật thông tin user */
  USER_UPDATED = 'USER_UPDATED',
  /** Khóa tài khoản user */
  USER_LOCKED = 'USER_LOCKED',
  /** Mở khóa tài khoản user */
  USER_UNLOCKED = 'USER_UNLOCKED',
  /** Yêu cầu đặt lại mật khẩu (gửi email) */
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  /** Hoàn tất đặt lại mật khẩu */
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  /** Cập nhật lot tồn kho (từ event cross-module) */
  INVENTORY_LOT_UPDATED = 'INVENTORY_LOT_UPDATED',
}

/**
 * AuditLog — Schema lưu trữ nhật ký kiểm toán.
 * Collection: 'audit_logs' — immutable (không sửa đổi sau khi ghi).
 */
@Schema({ collection: 'audit_logs' })
export class AuditLog {
  /** Tên đăng nhập của người thực hiện hành động */
  @Prop({ required: true })
  username: string;

  /** ID nội bộ của user (optional, có thể null với action tự động) */
  @Prop()
  user_id?: string;

  /** Loại hành động (từ enum AuditAction) */
  @Prop({ required: true, enum: Object.values(AuditAction) })
  action: AuditAction;

  /** Địa chỉ IP của client */
  @Prop()
  ip?: string;

  /** Chuỗi User Agent của trình duyệt/client */
  @Prop()
  user_agent?: string;

  /** Chi tiết bổ sung (dạng key-value, linh hoạt theo từng loại action) */
  @Prop({ type: Object })
  details?: Record<string, any>;

  /** Thời điểm xảy ra sự kiện (mặc định là thời điểm hiện tại) */
  @Prop({ type: Date, default: () => new Date() })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes: tối ưu cho các truy vấn phổ biến
AuditLogSchema.index({ timestamp: -1 }); // Sắp xếp theo thời gian mới nhất
AuditLogSchema.index({ username: 1 });   // Lọc theo người dùng
AuditLogSchema.index({ action: 1 });     // Lọc theo loại hành động
