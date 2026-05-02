/**
 * UserSchema - Schema định nghĩa người dùng hệ thống trong MongoDB
 *
 * Collection: users
 *
 * Mô tả: Lưu trữ thông tin người dùng đã được đồng bộ từ Keycloak.
 * Không lưu mật khẩu — xác thực qua Keycloak.
 *
 * Các role trong hệ thống:
 * - Manager: Quản lý kho, có quyền cao nhất trong nghiệp vụ
 * - Operator: Nhân viên vận hành kho (nhập/xuất, quản lý lô)
 * - QC_TECHNICIAN: Kỹ thuật viên kiểm tra chất lượng
 * - IT_ADMINISTRATOR: Quản trị viên hệ thống
 *
 * Các trường chính:
 * - user_id: ID nội bộ (UUID, tự động sinh)
 * - keycloak_id: ID từ Keycloak (dùng để đồng bộ)
 * - username, email: Thông tin đăng nhập
 * - role: Vai trò trong hệ thống
 * - is_active: Trạng thái hoạt động
 * - lock_type, lock_reason: Thông tin khóa tài khoản
 * - last_login: Thời điểm đăng nhập cuối cùng
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

/** Enum định nghĩa các vai trò người dùng trong hệ thống */
export enum UserRole {
  MANAGER = 'Manager',
  OPERATOR = 'Operator',
  QC_TECHNICIAN = 'Quality Control Technician',
  IT_ADMINISTRATOR = 'IT Administrator',
}

// Trường thời gian (timestamp) được đổi tên để khớp với tên trong mô hình miền
const options: SchemaOptions = {
  collection: 'users',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * Người dùng hệ thống
 */
@Schema(options)
export class User {
  @Prop({ type: String, default: uuidv4 })
  user_id: string;

  /** ID của user bên Keycloak — dùng để tra cứu / đồng bộ */
  @Prop({ type: String })
  keycloak_id?: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  username: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  email: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.OPERATOR,
  })
  role: UserRole;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: String, enum: ['locked', 'deactivated'], default: null })
  lock_type?: 'locked' | 'deactivated';

  @Prop({ type: String, default: null })
  lock_reason?: string;

  @Prop({ type: Date, default: null })
  last_login?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ user_id: 1 }, { unique: true });
UserSchema.index({ keycloak_id: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ is_active: 1 });
