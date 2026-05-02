/**
 * LoginDto - DTO cho request đăng nhập
 * Chứa username và password để xác thực qua Keycloak
 */
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/** DTO dùng khi user đăng nhập vào hệ thống */
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
