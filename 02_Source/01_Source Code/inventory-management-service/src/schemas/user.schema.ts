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

/** Enum định nghĩa các vai trò người dùng trong hệ thống
 * - MANAGER: Quản lý kho, có quyền cao nhất (duyệt, điều chỉnh, xóa)
 * - OPERATOR: Nhân viên vận hành (nhập hàng, xuất hàng, quản lý lô)
 * - QC_TECHNICIAN: Kỹ thuật viên QC (kiểm tra chất lượng, cách ly lô)
 * - IT_ADMINISTRATOR: Quản trị hệ thống (cấu hình, backup, monitor)
 */
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
 * Người dùng hệ thống (đồng bộ từ Keycloak)
 * Tất cả xác thực đều thông qua Keycloak, không lưu mật khẩu tại đây.
 */
@Schema(options)
export class User {
  /** ID nội bộ (UUID) - tự động sinh, dùng làm business key trong hệ thống */
  @Prop({ type: String, default: uuidv4 })
  user_id: string;

  /** ID của user bên Keycloak — dùng để tra cứu / đồng bộ
   * Đây là link giữa hệ thống và Keycloak
   */
  @Prop({ type: String })
  keycloak_id?: string;

  /** Tên đăng nhập (unique) */
  @Prop({ type: String, required: true, maxlength: 50 })
  username: string;

  /** Email (unique) - dùng để gửi thông báo, reset password */
  @Prop({ type: String, required: true, maxlength: 100 })
  email: string;

  /** Vai trò trong hệ thống - quyết định quyền hạn (permissions)
   * Mặc định: OPERATOR (quyền thấp nhất trong vận hành)
   */
  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.OPERATOR,
  })
  role: UserRole;

  /** Trạng thái hoạt động (true: đang hoạt động, false: đã vô hiệu hóa) */
  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  /** Loại khóa tài khoản:
   * - 'locked': Bị khóa do nhập sai nhiều lần
   * - 'deactivated': Bị vô hiệu hóa bởi Admin
   */
  @Prop({ type: String, enum: ['locked', 'deactivated'], default: null })
  lock_type?: 'locked' | 'deactivated';

  /** Lý do khóa tài khoản (vd: "Nhập sai 5 lần", "Vi phạm quy định") */
  @Prop({ type: String, default: null })
  lock_reason?: string;

  /** Thời điểm đăng nhập cuối cùng - dùng để phát hiện bất thường */
  @Prop({ type: Date, default: null })
  last_login?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ==================== Indexes - Chỉ mục cơ sở dữ liệu ====================

// Unique index trên user_id (business key nội bộ)
UserSchema.index({ user_id: 1 }, { unique: true });

// Unique index trên keycloak_id (để đồng bộ - sparse: cho phép null)
UserSchema.index({ keycloak_id: 1 }, { unique: true, sparse: true });

// Unique index trên username (không cho phép trùng tên đăng nhập)
UserSchema.index({ username: 1 }, { unique: true });

// Unique index trên email (không cho phép trùng email)
UserSchema.index({ email: 1 }, { unique: true });

// Index lọc theo role (vai trò)
UserSchema.index({ role: 1 });

// Index lọc theo trạng thái hoạt động
UserSchema.index({ is_active: 1 });
