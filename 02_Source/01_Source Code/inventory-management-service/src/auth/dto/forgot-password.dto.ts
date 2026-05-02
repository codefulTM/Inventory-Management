/**
 * ForgotPasswordDto & ResetPasswordDto - DTOs cho luồng quên mật khẩu
 * - ForgotPasswordDto: Gửi yêu cầu đặt lại mật khẩu (chứa email)
 * - ResetPasswordDto: Đặt lại mật khẩu mới (chứa token và mật khẩu mới)
 */
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/** DTO dùng khi user yêu cầu gửi link đặt lại mật khẩu */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty()
  email: string;
}

/** DTO dùng khi user đặt lại mật khẩu bằng token từ email */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  new_password: string;
}
