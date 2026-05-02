/**
 * File: refresh-token.dto.ts
 * Mô tả: Data Transfer Object cho chức năng làm mới access_token.
 *
 * Chức năng: Validate refresh_token trong request body
 * Được sử dụng trong POST /auth/refresh
 */
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refresh_token: string;
}
