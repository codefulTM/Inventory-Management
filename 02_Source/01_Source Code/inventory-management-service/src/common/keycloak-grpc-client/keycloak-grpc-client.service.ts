import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';

export const KEYCLOAK_GRPC_CLIENT = 'KEYCLOAK_GRPC_CLIENT';

interface KeycloakAdminGrpcService {
  createKeycloakUser(data: {
    username: string;
    email: string;
    password: string;
    role: string;
    first_name?: string;
    last_name?: string;
  }): Observable<{ keycloak_id: string }>;

  updateKeycloakUser(data: {
    keycloak_id: string;
    email?: string;
    role?: string;
    first_name?: string;
    last_name?: string;
  }): Observable<{ message: string }>;

  deleteKeycloakUser(data: { keycloak_id: string }): Observable<{ message: string }>;

  setUserEnabled(data: {
    keycloak_id: string;
    enabled: boolean;
  }): Observable<{ message: string }>;

  resetUserPassword(data: {
    keycloak_id: string;
    new_password: string;
  }): Observable<{ message: string }>;
}

/**
 * KeycloakGrpcClientService — backend-side client that calls
 * keycloak-service via gRPC for Keycloak admin operations.
 *
 * Replaces the old direct KeycloakService in the backend's user module.
 */
@Injectable()
export class KeycloakGrpcClientService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakGrpcClientService.name);
  private grpcService: KeycloakAdminGrpcService;

  constructor(
    @Inject(KEYCLOAK_GRPC_CLIENT) private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.grpcService = this.client.getService<KeycloakAdminGrpcService>(
      'KeycloakAdminService',
    );
  }

  async createUser(data: {
    username: string;
    email: string;
    password: string;
    role: string;
    firstName?: string;
    lastName?: string;
  }): Promise<string> {
    const res = await lastValueFrom(
      this.grpcService.createKeycloakUser({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        first_name: data.firstName,
        last_name: data.lastName,
      }),
    );
    this.logger.log(`Created Keycloak user via gRPC: ${data.username}`);
    return res.keycloak_id;
  }

  async updateUser(
    keycloakId: string,
    data: { email?: string; role?: string; firstName?: string; lastName?: string },
  ): Promise<void> {
    await lastValueFrom(
      this.grpcService.updateKeycloakUser({
        keycloak_id: keycloakId,
        email: data.email,
        role: data.role,
        first_name: data.firstName,
        last_name: data.lastName,
      }),
    );
  }

  async deleteUser(keycloakId: string): Promise<void> {
    await lastValueFrom(
      this.grpcService.deleteKeycloakUser({ keycloak_id: keycloakId }),
    );
  }

  async setUserEnabled(keycloakId: string, enabled: boolean): Promise<void> {
    await lastValueFrom(
      this.grpcService.setUserEnabled({ keycloak_id: keycloakId, enabled }),
    );
  }

  async resetPassword(keycloakId: string, newPassword: string): Promise<void> {
    await lastValueFrom(
      this.grpcService.resetUserPassword({
        keycloak_id: keycloakId,
        new_password: newPassword,
      }),
    );
  }
}
