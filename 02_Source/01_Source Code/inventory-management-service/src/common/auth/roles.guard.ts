import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';
import { AuthenticatedUser } from './jwt.strategy';

/**
 * RolesGuard - Guard kiểm tra quyền truy cập dựa trên role của user
 * 
 * Chức năng:
 * - Chạy SAU khi JwtAuthGuard đã xác thực thành công
 * - Đọc metadata @Roles() để lấy danh sách role yêu cầu
 * - Kiểm tra xem user có role nằm trong danh sách yêu cầu không
 * - Throw ForbiddenException nếu user không có quyền
 * 
 * Cách sử dụng:
 * - Thêm decorator @Roles(UserRole.MANAGER) vào controller hoặc method
 * - Nếu không có @Roles(), mọi user đã xác thực đều được truy cập
 * 
 * Flow: Request → JwtAuthGuard (xác thực) → RolesGuard (phân quyền) → Handler
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Kiểm tra xem user có quyền truy cập route hay không
   * @param context - ExecutionContext chứa thông tin về route
   * @returns true nếu được phép truy cập
   * @throws ForbiddenException nếu không có quyền
   */
  canActivate(context: ExecutionContext): boolean {
    // Đọc metadata @Roles() từ handler (method) và class (controller)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu route không yêu cầu role cụ thể → cho phép tất cả user đã xác thực
    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.debug('[RolesGuard] No role required for this route');
      return true;
    }

    // Lấy request và user từ request (đã được JwtAuthGuard gắn vào)
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // Kiểm tra có user không (JwtAuthGuard phải chạy trước đó)
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
