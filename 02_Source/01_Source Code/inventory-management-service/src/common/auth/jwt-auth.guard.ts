import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * JwtAuthGuard - Guard bảo vệ các routes bằng JWT Bearer token
 * 
 * Chức năng:
 * - Kế thừa từ AuthGuard('jwt') của Passport để xác thực JWT token
 * - Tự động kiểm tra token trong Authorization header (Bearer token)
 * - Hỗ trợ decorator @Public() để bỏ qua xác thực cho một số routes công khai
 * - Xử lý lỗi khi token không hợp lệ hoặc hết hạn
 * 
 * Cách sử dụng:
 * - Mặc định: Tất cả routes đều yêu cầu JWT token (được đăng ký global trong AppModule)
 * - Để bỏ qua: Thêm decorator @Public() vào controller hoặc method
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Kiểm tra xem request có được phép truy cập hay không
   * @param context - ExecutionContext chứa thông tin về route được gọi
   * @returns true nếu được phép truy cập, false hoặc throws exception nếu không
   */
  canActivate(context: ExecutionContext) {
    // Kiểm tra xem route có được đánh dấu @Public() không
    // Kiểm tra cả method và class (controller)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu route là public, cho phép truy cập mà không cần token
    if (isPublic) return true;

    // Ngược lại, gọi phương thức của Passport để xác thực JWT
    return super.canActivate(context);
  }

  /**
   * Xử lý kết quả xác thực từ Passport
   * @param err - Lỗi nếu có (token hết hạn, không hợp lệ...)
   * @param user - Thông tin user đã được JwtStrategy.validate() trả về
   * @returns Thông tin user nếu hợp lệ
   * @throws UnauthorizedException nếu token không hợp lệ hoặc không có user
   */
  handleRequest<TUser>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ?? new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn')
      );
    }
    return user;
  }
}
