/**
 * File: roles.decorator.ts
 * Mô tả: Decorator chỉ định vai trò (role) được phép truy cập route.
 *
 * Chức năng: Thiết lập metadata ROLES_KEY chứa danh sách các role được phép
 * RolesGuard sẽ đọc metadata này và kiểm tra quyền của user
 *
 * Cách sử dụng:
 * @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
 * @Get('admin-only')
 * getAdminData() { ... } // Chỉ Manager và IT Admin mới truy cập được
 *
 * Lưu ý: Phải kết hợp với @UseGuards(RolesGuard) hoặc đăng ký global RolesGuard
 */
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../schemas/user.schema';

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
