/**
 * File: register.dto.ts
 * Mô tả: Data Transfer Object cho chức năng đăng ký tài khoản mới.
 *
 * Chức năng: Validate thông tin đăng ký (tự đăng ký - chỉ tạo role Operator)
 * Được sử dụng trong POST /auth/register
 */
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Username không được để trống' })
  @MaxLength(50)
  username: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password không được để trống' })
  @MinLength(8, { message: 'Password tối thiểu 8 ký tự' })
  password: string;
}
