/**
 * File: forgot-password.dto.ts
 * Mô tả: Data Transfer Object cho chức năng quên và đặt lại mật khẩu.
 *
 * Bao gồm 2 classes:
 * - ForgotPasswordDto: Cho bước yêu cầu đặt lại (nhập email)
 * - ResetPasswordDto: Cho bước đặt lại mật khẩu mới (có token)
 */
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Dùng cho POST /auth/forgot-password
 * User cung cấp email để nhận link đặt lại mật khẩu
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty()
  email: string;
}

/**
 * Dùng cho POST /auth/reset-password
 * User cung cấp token (từ email) và mật khẩu mới
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  new_password: string;
}
