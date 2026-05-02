/**
 * UserModule - Module quản lý người dùng
 *
 * Chức năng:
 * - CRUD user (tạo, đọc, cập nhật, xóa)
 * - Phân quyền theo role (Manager, Operator, QC Technician, IT Administrator)
 * - Đồng bộ user giữa MongoDB và Keycloak (qua gRPC)
 * - Gửi email thông báo khi tạo tài khoản mới
 * - Ghi log kiểm toán cho mọi thay đổi user
 *
 * Dependencies:
 * - MailModule: Gửi email thông báo tài khoản
 * - AuditLogModule: Ghi log kiểm toán
 * - KeycloakGrpcClientModule: Đồng bộ với Keycloak qua gRPC
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { MailModule } from '../mail/mail.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { KeycloakGrpcClientModule } from '../common/keycloak-grpc-client/keycloak-grpc-client.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MailModule,
    AuditLogModule,
    KeycloakGrpcClientModule,
  ],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
