import { Test, TestingModule } from '@nestjs/testing';
import { AuthGrpcController } from './auth.grpc.controller';
import { AuthService } from './auth.service';

describe('AuthGrpcController', () => {
  let controller: AuthGrpcController;
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

  it('should call authService.login with correct args', async () => {
    mockAuthService.login.mockResolvedValue({ access_token: 'at' });
    await controller.login({ username: 'u', password: 'p', ip: '127.0.0.1', user_agent: 'jest' });
    expect(mockAuthService.login).toHaveBeenCalledWith(
      { username: 'u', password: 'p' },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );
  });

  it('should call authService.register', async () => {
    mockAuthService.register.mockResolvedValue({ message: 'OK' });
    await controller.register({ username: 'u', email: 'e@x.com', password: 'p' });
    expect(mockAuthService.register).toHaveBeenCalled();
  });

  it('should call authService.getMe', async () => {
    mockAuthService.getMe.mockResolvedValue({ user_id: 'u1' });
    await controller.getMe({ keycloak_id: 'kc1' });
    expect(mockAuthService.getMe).toHaveBeenCalledWith('kc1');
  });
});
