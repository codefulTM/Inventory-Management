import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Request } from 'express';

/** Paths that are always public — no JWT required */
const PUBLIC_PATHS = [
  '/ai-agents/health',
  '/ai/test-connection',
  '/health',
];

/**
 * JwtAuthGuard — bảo vệ route bằng JWT Bearer token.
 * Route được đánh dấu @Public() sẽ bỏ qua guard này.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Kiểm tra xem route có được đánh dấu @Public() không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    // Bypass JWT for well-known public proxy paths
    const req = context.switchToHttp().getRequest<Request>();
    if (PUBLIC_PATHS.includes(req.path)) return true;

    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ?? new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn')
      );
    }
    return user;
  }
}
