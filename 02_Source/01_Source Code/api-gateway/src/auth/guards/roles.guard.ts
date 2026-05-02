/**
 * File: roles.guard.ts
 * Mô tả: Guard kiểm tra phân quyền theo vai trò (Role-Based Access Control)
 * Chức năng: Kiểm tra xem user có vai trò phù hợp để truy cập route hay không
 * 
 * Thứ tự thực thi: JwtAuthGuard (xác thực JWT) → RolesGuard (kiểm tra role)
 * Sử dụng kết hợp với @Roles() decorator để chỉ định role được phép truy cập
 * 
 * Các role trong hệ thống:
 * - Manager (Quản lý)
 * - Operator (Nhân viên vận hành kho)
 * - Quality Control Technician (Kỹ thuật viên QC)
 * - IT Administrator (Quản trị viên IT)
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
 * 
 * Được đăng ký làm Global Guard trong AppModule
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Kiểm tra xem user có quyền truy cập route hay không
   * @param context - ExecutionContext chứa thông tin về route đang được gọi
   * @returns true nếu user có quyền, ném ForbiddenException nếu không có quyền
   */
  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách role yêu cầu từ @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu route không yêu cầu role cụ thể → cho phép tất cả user đã xác thực
    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.debug('[RolesGuard] No role required for this route');
      return true;
    }

    // Lấy thông tin user từ request (đã được JwtAuthGuard gán vào req.user)
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // Kiểm tra xem có thông tin user không (đã qua JwtAuthGuard chưa)
    if (!user) {
      this.logger.error('[RolesGuard] No user found in request');
      throw new ForbiddenException('Không có thông tin xác thực');
    }

    // Log thông tin kiểm tra role để debug
    this.logger.debug(
      `[RolesGuard] Checking role - User: ${user.username}, Role: ${user.role}, Required: ${requiredRoles.join(', ')}`,
    );

    // Kiểm tra xem user có role nằm trong danh sách cho phép không
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(
        `[RolesGuard] Role mismatch - User role '${user.role}' not in required roles [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `Vai trò '${user.role}' không có quyền truy cập endpoint này`,
      );
    }

    // Log thành công và cho phép đi tiếp
    this.logger.debug(
      `[RolesGuard] Role check passed for user ${user.username}`,
    );
    return true;
  }
}
