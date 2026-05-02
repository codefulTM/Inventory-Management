/**
 * File: user.dto.ts
 * Mô tả: Data Transfer Objects cho module quản lý user.
 *
 * Bao gồm các DTO:
 * - CreateUserDto: Tạo user mới (bởi Manager/IT Admin)
 * - UpdateUserDto: Cập nhật thông tin user
 * - LockUserDto: Khóa tài khoản với lý do
 * - ChangePasswordDto: Đặt lại mật khẩu
 * - UserResponseDto: Phản hồi thông tin user
 * - PaginatedUserResponseDto: Phản hồi danh sách user có phân trang
 *
 * Tất cả DTO sử dụng class-validator để tự động validate dữ liệu đầu vào.
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

// ─── Create — DTO tạo user mới ───────────────────────────────────────────────

/**
 * CreateUserDto — Dữ liệu đầu vào để tạo user mới
 * Được dùng trong POST /api/users (Manager/IT Admin tạo user)
 */
export class CreateUserDto {
  /** Tên đăng nhập (tối đa 50 ký tự) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  /** Địa chỉ email (tối đa 100 ký tự) */
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  /** Vai trò trong hệ thống. Mặc định là OPERATOR nếu không cung cấp */
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  @IsOptional()
  role?: UserRole;

  /** ID Keycloak (optional, thường được gán sau khi tạo user trong Keycloak) */
  @IsString()
  @IsOptional()
  keycloak_id?: string;
}

// ─── Update — DTO cập nhật thông tin user ────────────────────────────────────

/**
 * UpdateUserDto — Dữ liệu đầu vào để cập nhật user
 * Tất cả fields đều optional — chỉ cập nhật field nào được cung cấp
 */
export class UpdateUserDto {
  /** Tên đăng nhập mới (tối đa 50 ký tự) */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  username?: string;

  /** Email mới (tối đa 100 ký tự) */
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  @MaxLength(100)
  email?: string;

  /** Vai trò mới trong hệ thống */
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  @IsOptional()
  role?: UserRole;

  /** Trạng thái hoạt động của tài khoản */
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

/**
 * LockUserDto — Dữ liệu để khóa tài khoản user
 * Phân biệt giữa 'locked' (khóa tạm thời) và 'deactivated' (vô hiệu hóa)
 */
export class LockUserDto {
  /** Loại khóa: 'locked' = khóa tạm thời, 'deactivated' = vô hiệu hóa */
  @IsIn(['locked', 'deactivated'])
  lock_type: 'locked' | 'deactivated';

  /** Lý do khóa tài khoản (tối đa 500 ký tự) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  lock_reason: string;
}

/**
 * ChangePasswordDto — Dữ liệu để đặt lại mật khẩu user
 */
export class ChangePasswordDto {
  /** Mật khẩu mới */
  @IsString()
  @IsNotEmpty()
  new_password: string;
}

// ─── Response — DTO phản hồi dữ liệu user ────────────────────────────────────

/**
 * UserResponseDto — Cấu trúc phản hồi thông tin một user
 * Được trả về từ các API endpoint liên quan đến user
 */
export class UserResponseDto {
  /** ID nội bộ của user trong hệ thống */
  user_id: string;
  /** ID của user trong Keycloak (để đồng bộ) */
  keycloak_id?: string;
  /** Tên đăng nhập */
  username: string;
  /** Địa chỉ email */
  email: string;
  /** Vai trò trong hệ thống */
  role: UserRole;
  /** Trạng thái hoạt động */
  is_active: boolean;
  /** Loại khóa tài khoản (nếu bị khóa) */
  lock_type?: 'locked' | 'deactivated';
  /** Lý do khóa tài khoản */
  lock_reason?: string;
  /** Thời điểm đăng nhập cuối cùng */
  last_login?: Date;
  /** Thời điểm tạo tài khoản */
  created_date?: Date;
  /** Thời điểm cập nhật cuối cùng */
  modified_date?: Date;
}

/**
 * PaginatedUserResponseDto — Cấu trúc phản hồi danh sách user có phân trang
 */
export class PaginatedUserResponseDto {
  /** Danh sách user trong trang hiện tại */
  data: UserResponseDto[];
  /** Thông tin phân trang */
  pagination: {
    /** Trang hiện tại */
    page: number;
    /** Số lượng user mỗi trang */
    limit: number;
    /** Tổng số user */
    total: number;
    /** Tổng số trang */
    totalPages: number;
  };
}
