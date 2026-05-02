/**
 * File: user.schema.ts
 * Mô tả: MongoDB Mongoose schema cho collection 'users' — lưu thông tin người dùng.
 *
 * Chức năng: Định nghĩa cấu trúc dữ liệu user trong MongoDB local, bao gồm:
 * - Thông tin định danh: user_id (UUID), keycloak_id (liên kết với Keycloak)
 * - Thông tin cá nhân: username, email
 * - Phân quyền: role (Manager, Operator, QC Technician, IT Administrator)
 * - Trạng thái: is_active, lock_type, lock_reason, last_login
 * - Timestamps: created_date, modified_date (tự động cập nhật)
 *
 * Indexes: user_id (unique), keycloak_id (unique, sparse), username (unique),
 *          email (unique), role, is_active — tối ưu cho truy vấn phổ biến.
 *
 * Lưu ý: Không lưu password trong MongoDB — password được quản lý bởi Keycloak.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

/**
 * UserRole — Enum định nghĩa các vai trò trong hệ thống Inventory Management.
 * Mỗi role tương ứng với một role trong Keycloak realm.
 */
export enum UserRole {
  /** Quản lý — có quyền tạo/sửa/xóa user, xem báo cáo */
  MANAGER = 'Manager',
  /** Nhân viên vận hành kho — nhận/xuất hàng, quản lý lô hàng */
  OPERATOR = 'Operator',
  /** Nhân viên kiểm soát chất lượng — kiểm tra QC, phê duyệt lô hàng */
  QC_TECHNICIAN = 'Quality Control Technician',
  /** Quản trị viên IT — quản lý hệ thống, cấu hình, phân quyền */
  IT_ADMINISTRATOR = 'IT Administrator',
}

// Trường thời gian (timestamp) được đổi tên để khớp với convention của hệ thống
const options: SchemaOptions = {
  collection: 'users',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * User — Schema lưu trữ thông tin người dùng trong MongoDB.
 * Đây là bản sao local của user trong Keycloak, dùng để:
 * - Truy vấn nhanh thông tin user mà không cần gọi Keycloak API
 * - Lưu trữ các field bổ sung (lock_type, lock_reason, last_login)
 * - Ánh xạ JWT token (qua keycloak_id) sang user trong hệ thống
 */
@Schema(options)
export class User {
  /** ID nội bộ của user (UUID tự sinh) — khóa chính logic */
  @Prop({ type: String, default: uuidv4 })
  user_id: string;

  /** ID của user bên Keycloak — dùng để tra cứu / đồng bộ với IdP */
  @Prop({ type: String })
  keycloak_id?: string;

  /** Tên đăng nhập (duy nhất, tối đa 50 ký tự) */
  @Prop({ type: String, required: true, maxlength: 50 })
  username: string;

  /** Địa chỉ email (duy nhất, tối đa 100 ký tự) */
  @Prop({ type: String, required: true, maxlength: 100 })
  email: string;

  /** Vai trò trong hệ thống (mặc định: OPERATOR) */
  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.OPERATOR,
  })
  role: UserRole;

  /** Trạng thái hoạt động — false nghĩa là tài khoản bị khóa/vô hiệu hóa */
  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  /** Loại khóa: 'locked' = khóa tạm thời (có thể mở), 'deactivated' = vô hiệu hóa */
  @Prop({ type: String, enum: ['locked', 'deactivated'], default: null })
  lock_type?: 'locked' | 'deactivated';

  /** Lý do khóa tài khoản — ghi nhận để audit */
  @Prop({ type: String, default: null })
  lock_reason?: string;

  /** Thời điểm đăng nhập cuối cùng — cập nhật mỗi khi login thành công */
  @Prop({ type: Date, default: null })
  last_login?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes: tối ưu cho các truy vấn phổ biến
UserSchema.index({ user_id: 1 }, { unique: true });          // Tìm theo user_id
UserSchema.index({ keycloak_id: 1 }, { unique: true, sparse: true }); // Ánh xạ từ JWT
UserSchema.index({ username: 1 }, { unique: true });          // Tìm theo username
UserSchema.index({ email: 1 }, { unique: true });             // Tìm theo email
UserSchema.index({ role: 1 });                                // Lọc theo role
UserSchema.index({ is_active: 1 });                           // Lọc theo trạng thái
