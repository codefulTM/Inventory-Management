/**
 * File: login.dto.ts
 * Mô tả: Data Transfer Object cho chức năng đăng nhập.
 *
 * Chức năng: Định nghĩa cấu trúc và validation rules cho request body
 * khi user gửi POST /auth/login
 *
 * Validation: Sử dụng class-validator decorators để tự động validate
 */
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username không được để trống' })
  @MaxLength(50)
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Password không được để trống' })
  @MinLength(6, { message: 'Password tối thiểu 6 ký tự' })
  password: string;
}
