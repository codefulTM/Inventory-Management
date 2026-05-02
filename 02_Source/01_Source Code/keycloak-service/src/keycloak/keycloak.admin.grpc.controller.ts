/**
 * File: keycloak.admin.grpc.controller.ts
 * Mô tả: gRPC Controller cung cấp các phương thức quản trị Keycloak user.
 *
 * Chức năng: Đây là "admin bridge" cho phép backend-service (NestJS chính)
 * thực hiện các thao tác quản trị user thông qua gRPC thay vì
 * tự gọi Keycloak Admin REST API.
 *
 * Các phương thức:
 * - CreateKeycloakUser: Tạo user mới trong Keycloak
 * - UpdateKeycloakUser: Cập nhật thông tin user
 * - DeleteKeycloakUser: Xóa user khỏi Keycloak
 * - SetUserEnabled: Kích hoạt/vô hiệu hóa user
 * - ResetUserPassword: Đặt lại mật khẩu user
 *
 * Service name: 'KeycloakAdminService' (khớp với auth.proto)
 */
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { KeycloakService } from './keycloak.service';

/**
 * KeycloakAdminGrpcController — exposes Keycloak admin operations via gRPC.
 * Used by the backend's user module (KeycloakGrpcClientService).
 * Service name matches auth.proto `KeycloakAdminService`.
 */
@Controller()
export class KeycloakAdminGrpcController {
  constructor(private readonly keycloakService: KeycloakService) {}

  /**
   * Tạo user mới trong Keycloak
   * Được gọi bởi backend-service khi Manager/IT Admin tạo user mới
   */
  @GrpcMethod('KeycloakAdminService', 'CreateKeycloakUser')
  async createKeycloakUser(data: {
    username: string;
    email: string;
    password: string;
    role: string;
    first_name?: string;
    last_name?: string;
  }) {
    const keycloak_id = await this.keycloakService.createUser({
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role,
      firstName: data.first_name,
      lastName: data.last_name,
    });
    return { keycloak_id };
  }

  /**
   * Cập nhật thông tin user trong Keycloak
   * Đồng bộ thay đổi từ MongoDB sang Keycloak
   */
  @GrpcMethod('KeycloakAdminService', 'UpdateKeycloakUser')
  async updateKeycloakUser(data: {
    keycloak_id: string;
    email?: string;
    role?: string;
    first_name?: string;
    last_name?: string;
  }) {
    await this.keycloakService.updateUser(data.keycloak_id, {
      email: data.email,
      role: data.role,
      firstName: data.first_name,
      lastName: data.last_name,
    });
    return { message: 'User updated successfully' };
  }

  /**
   * Xóa user khỏi Keycloak
   * Thường được gọi sau khi xóa user khỏi MongoDB
   */
  @GrpcMethod('KeycloakAdminService', 'DeleteKeycloakUser')
  async deleteKeycloakUser(data: { keycloak_id: string }) {
    await this.keycloakService.deleteUser(data.keycloak_id);
    return { message: 'User deleted successfully' };
  }

  /**
   * Kích hoạt hoặc vô hiệu hóa user trong Keycloak
   * @param enabled - true = kích hoạt, false = vô hiệu hóa
   */
  @GrpcMethod('KeycloakAdminService', 'SetUserEnabled')
  async setUserEnabled(data: { keycloak_id: string; enabled: boolean }) {
    await this.keycloakService.setUserEnabled(data.keycloak_id, data.enabled);
    return { message: `User ${data.enabled ? 'enabled' : 'disabled'} successfully` };
  }

  /**
   * Đặt lại mật khẩu cho user trong Keycloak
   * Không gửi email thông báo - chỉ đặt lại trực tiếp
   */
  @GrpcMethod('KeycloakAdminService', 'ResetUserPassword')
  async resetUserPassword(data: { keycloak_id: string; new_password: string }) {
    await this.keycloakService.resetPassword(data.keycloak_id, data.new_password);
    return { message: 'Password reset successfully' };
  }
}
