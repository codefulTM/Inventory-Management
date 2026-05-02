/**
 * File: roles.guard.ts
 * Mô tả: Guard kiểm tra quyền truy cập dựa trên vai trò (role) của user.
 *
 * Chức năng:
 * - Chạy sau khi JwtAuthGuard đã xác thực thành công
 * - Đọc metadata @Roles() từ route hoặc controller
 * - Kiểm tra xem user có vai trò nằm trong danh sách yêu cầu không
 * - Nếu user không có quyền → ném ForbiddenException
 *
 * Sử dụng:
 * - Được đăng ký là global guard trong AppModule
 * - Kết hợp với decorator @Roles(UserRole.MANAGER, ...) để chỉ định quyền truy cập
 *
 * Ví dụ: @Roles(UserRole.MANAGER) @Get('admin-only') → Chỉ Manager mới truy cập được
 */
import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * RolesGuard — kiểm tra role của user sau khi JwtAuthGuard xác thực.
 * Dùng kết hợp với @Roles(...) decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách role yêu cầu từ @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu route không yêu cầu role cụ thể → cho phép
    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.debug('[RolesGuard] No role required for this route');
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      this.logger.error('[RolesGuard] No user found in request');
      throw new ForbiddenException('Không có thông tin xác thực');
    }

    this.logger.debug(
      `[RolesGuard] Checking role - User: ${user.username}, Role: ${user.role}, Required: ${requiredRoles.join(', ')}`,
    );

    // Kiểm tra user có role nằm trong danh sách yêu cầu không
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(
        `[RolesGuard] Role mismatch - User role '${user.role}' not in required roles [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `Vai trò '${user.role}' không có quyền truy cập endpoint này`,
      );
    }

    this.logger.debug(
      `[RolesGuard] Role check passed for user ${user.username}`,
    );
    return true;
  }
}
