/**
 * File: app.module.ts
 * Mô tả: Root module (module gốc) của keycloak-service.
 *
 * Chức năng: Kết hợp tất cả các module con để tạo thành ứng dụng hoàn chỉnh.
 * Thứ tự import quan trọng: AuthModule phải được import sau cùng để đảm bảo
 * JwtAuthGuard và RolesGuard được đăng ký global (do AuthModule exports chúng).
 *
 * Các module con:
 * - ConfigModule: Quản lý biến môi trường (.env)
 * - DatabaseModule: Kết nối MongoDB qua Mongoose
 * - KeycloakModule: Tích hợp với Keycloak Admin REST API (Global module)
 * - MailModule: Gửi email (nodemailer với Gmail SMTP)
 * - AuditLogModule: Ghi log các hành động quan trọng của user
 * - UserModule: Quản lý user trong MongoDB local
 * - AuthModule: Xác thực, phân quyền, JWT strategy, guards
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { KeycloakModule } from './keycloak/keycloak.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MailModule } from './mail/mail.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    // ConfigModule được set global để có thể inject ConfigService ở bất kỳ đâu
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,   // Kết nối MongoDB
    KeycloakModule,   // Keycloak service (Global - có thể dùng ở mọi nơi)
    MailModule,       // Email service
    AuditLogModule,   // Audit logging
    UserModule,       // User CRUD operations
    AuthModule,       // Auth: JWT, Guards, Strategies (import sau cùng để global guards hoạt động)
  ],
})
export class AppModule {}
