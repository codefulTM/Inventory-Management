/**
 * File: auth.grpc.controller.spec.ts
 * Mô tả: Unit tests cho AuthGrpcController — gRPC controller trong keycloak-service.
 *
 * Kiểm tra:
 * - AuthGrpcController gọi đúng phương thức của AuthService với đúng tham số
 * - Chuyển đổi dữ liệu từ gRPC request sang AuthService method calls chính xác
 * - Extract ip và user_agent từ gRPC data thành LogContext đúng định dạng
 *
 * Mock: AuthService được mock hoàn toàn — không gọi Keycloak hay MongoDB thật.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGrpcController } from './auth.grpc.controller';
import { AuthService } from './auth.service';

describe('AuthGrpcController', () => {
  let controller: AuthGrpcController;
  // Mock AuthService: giả lập tất cả phương thức xác thực
  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGrpcController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();
    controller = module.get<AuthGrpcController>(AuthGrpcController);
    jest.clearAllMocks();
  });

  /** Kiểm tra gRPC Login gọi authService.login đúng tham số */
  it('should call authService.login with correct args', async () => {
    mockAuthService.login.mockResolvedValue({ access_token: 'at' });
    await controller.login({ username: 'u', password: 'p', ip: '127.0.0.1', user_agent: 'jest' });
    expect(mockAuthService.login).toHaveBeenCalledWith(
      { username: 'u', password: 'p' },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );
  });

  /** Kiểm tra gRPC Register gọi authService.register */
  it('should call authService.register', async () => {
    mockAuthService.register.mockResolvedValue({ message: 'OK' });
    await controller.register({ username: 'u', email: 'e@x.com', password: 'p' });
    expect(mockAuthService.register).toHaveBeenCalled();
  });

  /** Kiểm tra gRPC GetMe gọi authService.getMe với đúng keycloak_id */
  it('should call authService.getMe', async () => {
    mockAuthService.getMe.mockResolvedValue({ user_id: 'u1' });
    await controller.getMe({ keycloak_id: 'kc1' });
    expect(mockAuthService.getMe).toHaveBeenCalledWith('kc1');
  });
});
