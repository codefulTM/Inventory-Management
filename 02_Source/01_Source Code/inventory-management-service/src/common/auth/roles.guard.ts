import { Injectable, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';
import { AuthenticatedUser } from './jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Không có thông tin xác thực');
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) throw new ForbiddenException(`Vai trò '${user.role}' không có quyền truy cập endpoint này`);
    return true;
  }
}
