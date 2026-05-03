/**
 * File: auth.module.ts
 * Mô tả: Module xác thực (Authentication Module)
 * Chức năng: Quản lý tất cả các thành phần liên quan đến xác thực và phân quyền
 *
 * Các thành phần chính:
 * - PassportModule: Sử dụng JWT làm chiến lược mặc định
 * - AuthController: Xử lý các HTTP request /auth/*
 * - AuthGatewayService: Gọi gRPC đến keycloak-service
 * - JwtStrategy: Chiến lược xác thực JWT với Keycloak JWKS
 * - JwtAuthGuard: Guard bảo vệ route bằng JWT
 * - RolesGuard: Guard kiểm tra phân quyền theo role
 */
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport"; // Note: Passport là middleware xác thực cho Node.js, hỗ trợ nhiều chiến lược như JWT, OAuth(Google, Facebook),...
import { AuthController } from "./auth.controller";
import { AuthGatewayService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

@Module({
  // Đăng ký Passport với chiến lược JWT mặc định
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  // Controller xử lý các route /auth/*
  controllers: [AuthController],
  // Các provider cung cấp dịch vụ xác thực và phân quyền
  providers: [AuthGatewayService, JwtStrategy, JwtAuthGuard, RolesGuard],
  // Export để các module khác có thể sử dụng (AppModule đã đăng ký global guard)
  exports: [AuthGatewayService, JwtAuthGuard, RolesGuard, JwtStrategy],
})
export class AuthModule {}
