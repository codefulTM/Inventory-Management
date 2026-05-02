/**
 * File: roles.decorator.ts
 * Mô tả: Decorator @Roles() dùng để chỉ định vai trò được phép truy cập route
 * Chức năng: Lưu trữ danh sách role vào metadata để RolesGuard kiểm tra
 * 
 * Cách sử dụng: Thêm @Roles(...) phía trên method hoặc class controller
 * Có thể chỉ định một hoặc nhiều role cùng lúc
 * 
 * Ví dụ:
 * - @Roles(UserRole.MANAGER) - Chỉ Manager được truy cập
 * - @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR) - Cả hai role đều được
 * 
 * Kết hợp với RolesGuard để thực thi kiểm tra phân quyền
 */
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../schemas/user.schema';

// Key dùng để lưu trữ metadata trong Reflector
export const ROLES_KEY = 'roles';

/**
 * @Roles(...roles) — chỉ định role được phép truy cập route.
 * Dùng kết hợp với RolesGuard.
 *
 * @example
 * @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
 * @Get('admin-only')
 * getAdminData() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
