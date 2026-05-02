/**
 * File: password-reset-token.schema.ts
 * Mô tả: MongoDB schema cho collection 'password_reset_tokens'.
 *
 * Chức năng: Lưu trữ token đặt lại mật khẩu tạm thời khi user yêu cầu forgot password.
 *
 * Luồng hoạt động:
 * 1. User yêu cầu đặt lại mật khẩu → hệ thống tạo UUID token, lưu vào collection này
 * 2. Gửi email cho user chứa link với token
 * 3. User click link → nhập mật khẩu mới → hệ thống kiểm tra token (hợp lệ, chưa dùng, chưa hết hạn)
 * 4. Sau khi đặt lại thành công → đánh dấu token đã dùng (used = true)
 *
 * Token có thời hạn 15 phút và chỉ được dùng một lần.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

/**
 * PasswordResetToken — Schema lưu trữ token đặt lại mật khẩu.
 * Collection: 'password_reset_tokens' — không có timestamps tự động.
 */
@Schema({ timestamps: false, collection: 'password_reset_tokens' })
export class PasswordResetToken {
  /** Token duy nhất (UUID) — dùng trong URL đặt lại mật khẩu */
  @Prop({ required: true, unique: true })
  token: string;

  /** ID của user yêu cầu đặt lại mật khẩu */
  @Prop({ required: true })
  user_id: string;

  /** Email của user (dùng để xác nhận khi reset) */
  @Prop({ required: true })
  email: string;

  /** Thời điểm token hết hạn (thường là 15 phút sau khi tạo) */
  @Prop({ required: true })
  expires_at: Date;

  /** Trạng thái đã sử dụng — true nghĩa là token không còn hợp lệ */
  @Prop({ default: false })
  used: boolean;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
