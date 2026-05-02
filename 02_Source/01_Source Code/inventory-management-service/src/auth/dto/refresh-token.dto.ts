/**
 * RefreshTokenDto - DTO cho request làm mới access token
 * Sử dụng refresh token để lấy cặp token mới mà không cần đăng nhập lại
 */
import { IsString, IsNotEmpty } from 'class-validator';

/** DTO dùng khi refresh access token */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refresh_token: string;
}
