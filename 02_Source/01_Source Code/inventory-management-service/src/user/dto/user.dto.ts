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

export class LockUserDto {
  @IsIn(['locked', 'deactivated'])
  lock_type: 'locked' | 'deactivated';

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  lock_reason: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  new_password: string;
}

// ─── Response ────────────────────────────────────────────────────────────────

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

export class PaginatedUserResponseDto {
  data: UserResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
