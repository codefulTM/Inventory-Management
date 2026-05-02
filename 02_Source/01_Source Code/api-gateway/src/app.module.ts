/**
 * File: app.module.ts
 * Mô tả: Root Module (Module gốc) của API Gateway
 * Chức năng: Cấu hình tất cả các module con và Global Guards
 * 
 * Kiến trúc bảo mật:
 * - JwtAuthGuard: Được đăng ký toàn cục (APP_GUARD) → Tất cả route đều yêu cầu JWT trừ khi có @Public()
 * - RolesGuard: Được đăng ký toàn cục → Kiểm tra phân quyền role sau khi đã xác thực JWT
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { GrpcModule } from './grpc/grpc.module';
import { ProxyModule } from './proxy/proxy.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    // ConfigModule toàn cục - cho phép sử dụng ConfigService ở mọi nơi trong ứng dụng
    ConfigModule.forRoot({ isGlobal: true }),
    // GrpcModule - quản lý kết nối gRPC đến keycloak-service và metrics-service
    GrpcModule,
    // AuthModule - xử lý xác thực: login, register, logout, refresh token
    AuthModule,
    // ReportsModule - xử lý các báo cáo thông qua gRPC đến metrics-service
    ReportsModule,
    // ProxyModule - chuyển tiếp request HTTP đến backend và ai-service
    ProxyModule,
  ],
  providers: [
    // Đăng ký JwtAuthGuard làm Global Guard - bảo vệ tất cả các route bằng JWT
    // Chỉ những route có @Public() decorator mới bỏ qua được guard này
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Đăng ký RolesGuard làm Global Guard - kiểm tra quyền truy cập dựa trên role
    // Kết hợp với @Roles() decorator để chỉ định role được phép truy cập
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
