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

  @GrpcMethod('KeycloakAdminService', 'DeleteKeycloakUser')
  async deleteKeycloakUser(data: { keycloak_id: string }) {
    await this.keycloakService.deleteUser(data.keycloak_id);
    return { message: 'User deleted successfully' };
  }

  @GrpcMethod('KeycloakAdminService', 'SetUserEnabled')
  async setUserEnabled(data: { keycloak_id: string; enabled: boolean }) {
    await this.keycloakService.setUserEnabled(data.keycloak_id, data.enabled);
    return { message: `User ${data.enabled ? 'enabled' : 'disabled'} successfully` };
  }

  @GrpcMethod('KeycloakAdminService', 'ResetUserPassword')
  async resetUserPassword(data: { keycloak_id: string; new_password: string }) {
    await this.keycloakService.resetPassword(data.keycloak_id, data.new_password);
    return { message: 'Password reset successfully' };
  }
}
