import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';
import { AUTH_SERVICE_TOKEN } from '../grpc/grpc.module';

interface AuthGrpcService {
  login(data: {
    username: string;
    password: string;
    ip?: string;
    user_agent?: string;
  }): Observable<any>;
  register(data: { username: string; email: string; password: string }): Observable<any>;
  refresh(data: { refresh_token: string }): Observable<any>;
  logout(data: {
    refresh_token: string;
    username?: string;
    ip?: string;
    user_agent?: string;
  }): Observable<any>;
  forgotPassword(data: { email: string; ip?: string; user_agent?: string }): Observable<any>;
  resetPassword(data: {
    token: string;
    new_password: string;
    ip?: string;
    user_agent?: string;
  }): Observable<any>;
  getMe(data: { keycloak_id: string }): Observable<any>;
}

/**
 * AuthGatewayService — wraps gRPC client calls to keycloak-service.
 */
@Injectable()
export class AuthGatewayService implements OnModuleInit {
  private grpcService: AuthGrpcService;

  constructor(
    @Inject(AUTH_SERVICE_TOKEN) private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.grpcService = this.client.getService<AuthGrpcService>('AuthService');
  }

  login(data: { username: string; password: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.login(data));
  }

  register(data: { username: string; email: string; password: string }) {
    return lastValueFrom(this.grpcService.register(data));
  }

  refresh(refresh_token: string) {
    return lastValueFrom(this.grpcService.refresh({ refresh_token }));
  }

  logout(data: { refresh_token: string; username?: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.logout(data));
  }

  forgotPassword(data: { email: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.forgotPassword(data));
  }

  resetPassword(data: { token: string; new_password: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.resetPassword(data));
  }

  getMe(keycloak_id: string) {
    return lastValueFrom(this.grpcService.getMe({ keycloak_id }));
  }
}
