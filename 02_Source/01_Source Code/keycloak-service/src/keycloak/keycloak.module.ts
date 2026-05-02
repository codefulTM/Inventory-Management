/**
 * File: keycloak.module.ts
 * Mô tả: Module tích hợp với Keycloak Identity Provider.
 *
 * Đặc điểm: Được đánh dấu @Global() nên có thể inject KeycloakService
 * ở bất kỳ đâu trong ứng dụng mà không cần import lại.
 *
 * Chức năng:
 * - Cung cấp KeycloakService để tương tác với Keycloak Admin REST API
 * - Expose gRPC endpoints cho các tác vụ quản trị user (thông qua KeycloakAdminGrpcController)
 *
 * Các service khác sử dụng KeycloakService để:
 * - Tạo/sửa/xóa user trong Keycloak
 * - Đặt lại mật khẩu user
 * - Gán vai trò (roles) cho user
 * - Kiểm tra trạng thái user
 */
import { Module, Global } from '@nestjs/common';
import { KeycloakService } from './keycloak.service';
import { KeycloakAdminGrpcController } from './keycloak.admin.grpc.controller';

/**
 * KeycloakModule — Global module.
 * Cung cấp KeycloakService + exposes gRPC admin endpoints.
 */
@Global()
@Module({
  controllers: [KeycloakAdminGrpcController],
  providers: [KeycloakService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
