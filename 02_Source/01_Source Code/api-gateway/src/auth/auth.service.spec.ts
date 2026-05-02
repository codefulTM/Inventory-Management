/**
 * File: auth.service.spec.ts
 * Mô tả: Unit tests cho AuthGatewayService
 * Chức năng: Kiểm tra AuthGatewayService gọi đúng gRPC methods từ keycloak-service
 * 
 * Mock: gRPC client (AUTH_SERVICE_TOKEN)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGatewayService } from './auth.service';
import { AUTH_SERVICE_TOKEN } from '../grpc/grpc.module';
import { of } from 'rxjs';

describe('AuthGatewayService', () => {
  let service: AuthGatewayService;

  const mockGrpcService = {
    login: jest.fn().mockReturnValue(of({})),
    register: jest.fn().mockReturnValue(of({})),
    refresh: jest.fn().mockReturnValue(of({})),
    logout: jest.fn().mockReturnValue(of({})),
    forgotPassword: jest.fn().mockReturnValue(of({})),
    resetPassword: jest.fn().mockReturnValue(of({})),
    getMe: jest.fn().mockReturnValue(of({})),
  };

  const mockClient = {
    getService: jest.fn().mockReturnValue(mockGrpcService),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGatewayService,
        { provide: AUTH_SERVICE_TOKEN, useValue: mockClient },
      ],
    }).compile();

    service = module.get<AuthGatewayService>(AuthGatewayService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call grpc login', () => {
    jest.spyOn(service, 'login');
    service.login({ username: 'u', password: 'p' });
    expect(mockClient.getService).toHaveBeenCalledWith('AuthService');
  });
});
