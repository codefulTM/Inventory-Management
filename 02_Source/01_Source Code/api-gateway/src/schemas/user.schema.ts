/**
 * File: user.schema.ts
 * Mô tả: Định nghĩa Mongoose Schema cho User (Người dùng hệ thống)
 * Chức năng: Lưu trữ thông tin người dùng trong MongoDB, đồng bộ với Keycloak
 * 
 * Schema này được dùng bởi API Gateway để lưu cache thông tin user,
 * mapping từ Keycloak JWT token sang hệ thống phân quyền nội bộ
 * 
 * Lưu ý: user_id là UUID, keycloak_id là ID tham chiếu đến Keycloak user
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

/**
 * Enum định nghĩa 4 vai trò người dùng trong hệ thống
 * Giá trị này phải khớp với role trong JWT token và Keycloak
 */
export enum UserRole {
  MANAGER = 'Manager',                  // Quản lý - xem báo cáo, quản lý kho
  OPERATOR = 'Operator',                // Nhân viên vận hành - nhập/xuất kho
  QC_TECHNICIAN = 'Quality Control Technician',  // Kỹ thuật viên QC - kiểm tra chất lượng
  IT_ADMINISTRATOR = 'IT Administrator',         // Quản trị viên IT - quản lý user, hệ thống
}

// Trường thời gian (timestamp) được đổi tên để khớp với tên trong mô hình miền
const options: SchemaOptions = {
  collection: 'users',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * Người dùng hệ thống — lưu thông tin user trong MongoDB
 * Đồng bộ với Keycloak qua keycloak_id
 */
@Schema(options)
export class User {
  @Prop({ type: String, default: uuidv4 })
  user_id: string;  // ID nội bộ của hệ thống (UUID)

  /** ID của user bên Keycloak — dùng để tra cứu / đồng bộ */
  @Prop({ type: String })
  keycloak_id?: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  username: string;  // Tên đăng nhập

  @Prop({ type: String, required: true, maxlength: 100 })
  email: string;  // Email liên hệ

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.OPERATOR,
  })
  role: UserRole;  // Vai trò người dùng (mặc định: Operator)

  @Prop({ type: Boolean, default: true })
  is_active: boolean;  // Trạng thái hoạt động (true = đang hoạt động)

  @Prop({ type: String, enum: ['locked', 'deactivated'], default: null })
  lock_type?: 'locked' | 'deactivated';  // Loại khóa tài khoản

  @Prop({ type: String, default: null })
  lock_reason?: string;  // Lý do khóa tài khoản

  @Prop({ type: Date, default: null })
  last_login?: Date;  // Thời điểm đăng nhập cuối cùng
}

export const UserSchema = SchemaFactory.createForClass(User);

// Tạo Mongoose Schema từ class User
export const UserSchema = SchemaFactory.createForClass(User);

// Định nghĩa indexes cho MongoDB — tối ưu truy vấn
UserSchema.index({ user_id: 1 }, { unique: true });           // Index duy nhất theo user_id
UserSchema.index({ keycloak_id: 1 }, { unique: true, sparse: true }); // Index duy nhất theo keycloak_id (cho phép null)
UserSchema.index({ username: 1 }, { unique: true });           // Index duy nhất theo username
UserSchema.index({ email: 1 }, { unique: true });              // Index duy nhất theo email
UserSchema.index({ role: 1 });                                  // Index thường theo role (lọc theo vai trò)
UserSchema.index({ is_active: 1 });                             // Index thường theo is_active (lọc user hoạt động)
