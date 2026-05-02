/**
 * RegisterDto - DTO cho request tự đăng ký tài khoản
 * User tự đăng ký sẽ được gán role Operator mặc định
 */
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';

/** DTO dùng khi user tự đăng ký tài khoản mới (chỉ role Operator) */
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
