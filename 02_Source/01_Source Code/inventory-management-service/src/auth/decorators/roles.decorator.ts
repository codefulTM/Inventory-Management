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
