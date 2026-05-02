/**
 * User DTOs - Data Transfer Objects cho module User
 *
 * Bao gồm:
 * - CreateUserDto: Dữ liệu tạo user mới
 * - UpdateUserDto: Dữ liệu cập nhật user
 * - LockUserDto: Dữ liệu khóa/mở khóa tài khoản
 * - ChangePasswordDto: Dữ liệu đổi mật khẩu
 * - UserResponseDto: Response trả về cho client
 * - PaginatedUserResponseDto: Response phân trang
 */
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsIn,
} from 'class-validator';
import { UserRole } from '../../schemas/user.schema';

// ─── Create ──────────────────────────────────────────────────────────────────

/** DTO dùng khi tạo user mới qua Manager/IT Admin */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  keycloak_id?: string;
}

// ─── Update ──────────────────────────────────────────────────────────────────

/** DTO dùng khi cập nhật thông tin user (chỉ các trường được phép) */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  username?: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

/** DTO dùng khi khóa tài khoản user (lock_type: locked hoặc deactivated) */
export class LockUserDto {
  @IsIn(['locked', 'deactivated'])
  lock_type: 'locked' | 'deactivated';

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  lock_reason: string;
}

/** DTO dùng khi đặt lại mật khẩu cho user */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  new_password: string;
}

// ─── Response ────────────────────────────────────────────────────────────────

/** DTO trả về thông tin user cho client (không bao gồm password, keycloak secret...) */
export class UserResponseDto {
  user_id: string;
  keycloak_id?: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  lock_type?: 'locked' | 'deactivated';
  lock_reason?: string;
  last_login?: Date;
  created_date?: Date;
  modified_date?: Date;
}

/** DTO trả về danh sách user có phân trang (dùng cho GET /users) */
export class PaginatedUserResponseDto {
  data: UserResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
