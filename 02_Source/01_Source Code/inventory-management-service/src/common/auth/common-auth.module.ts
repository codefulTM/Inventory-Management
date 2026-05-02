/**
 * CommonAuthModule - Module xác thực và phân quyền dùng chung
 * 
 * Chức năng chính:
 * - Cung cấp JWT validation guards cho backend
 * - Sử dụng Passport với chiến lược JWT để xác thực Bearer token
 * - Phân quyền dựa trên roles (RolesGuard)
 * 
 * Lưu ý: Các thao tác xác thực (login, register, reset password...) 
 * được xử lý bởi keycloak-service, module này chỉ validate token locally qua JWKS
 * 
 * Export:
 * - JwtAuthGuard: Bảo vệ routes yêu cầu JWT token hợp lệ
 * - RolesGuard: Kiểm tra quyền truy cập dựa trên roles
 * - JwtStrategy: Chiến lược xác thực JWT (được Passport sử dụng)
 */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    // Đăng ký Passport với chiến lược mặc định là 'jwt'
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Import UserModule để JwtStrategy có thể truy vấn thông tin user
    UserModule,
  ],
  // Cung cấp các guards và strategy
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
  // Export để các module khác có thể sử dụng (đặc biệt là AppModule đăng ký global guards)
  exports: [JwtAuthGuard, RolesGuard, JwtStrategy],
})
export class CommonAuthModule {}
