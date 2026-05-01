/**
 * Contract tests — gRPC AuthService server side (keycloak-service)
 *
 * Verifies that AuthGrpcController correctly maps every proto-defined RPC
 * to the matching AuthService method with the correct argument shapes.
 * No real gRPC server — just the NestJS testing module with a mocked AuthService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGrpcController } from '../auth/auth.grpc.controller';
import { AuthService } from '../auth/auth.service';

// ── proto-defined response stubs ────────────────────────────────────────────

const tokenResponse = {
  access_token: 'eyJhbGc.payload.sig',
  refresh_token: 'refresh-xyz',
  expires_in: 300,
  token_type: 'Bearer',
  user: {
    user_id: 'user-001',
    username: 'operator1',
    email: 'op1@example.com',
    role: 'Operator',
    is_active: true,
  },
};

const messageResponse = { message: 'ok' };

const userResponse = {
  user_id: 'user-001',
  username: 'operator1',
  email: 'op1@example.com',
  role: 'Operator',
  is_active: true,
};

// ── mock AuthService ────────────────────────────────────────────────────────

const mockAuthService = {
  login: jest.fn().mockResolvedValue(tokenResponse),
  register: jest.fn().mockResolvedValue({ message: 'Đăng ký thành công', user: userResponse }),
  refreshToken: jest.fn().mockResolvedValue(tokenResponse),
  logout: jest.fn().mockResolvedValue(messageResponse),
  forgotPassword: jest.fn().mockResolvedValue(messageResponse),
  resetPassword: jest.fn().mockResolvedValue(messageResponse),
  getMe: jest.fn().mockResolvedValue(userResponse),
};

describe('AuthGrpcController — gRPC server contract (keycloak-service ↔ auth.proto)', () => {
  let controller: AuthGrpcController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [AuthGrpcController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = testModule.get<AuthGrpcController>(AuthGrpcController);
  });

  // ── Login ───────────────────────────────────────────────────────────────

  describe('Login RPC', () => {
    it('maps gRPC {username, password} → authService.login({username, password})', async () => {
      await controller.login({ username: 'operator1', password: 'Pass@123' });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { username: 'operator1', password: 'Pass@123' },
        expect.any(Object),
      );
    });

    it('extracts ip and user_agent into LogContext', async () => {
      await controller.login({
        username: 'op',
        password: 'pw',
        ip: '10.0.0.1',
        user_agent: 'Mozilla/5.0',
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'op', password: 'pw' }),
        expect.objectContaining({ ip: '10.0.0.1', userAgent: 'Mozilla/5.0' }),
      );
    });

    it('returns TokenResponse shape: access_token, refresh_token, user', async () => {
      const result = await controller.login({ username: 'op', password: 'pw' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('user_id');
      expect(result.user).toHaveProperty('role');
    });

    it('defaults ip and user_agent to empty string when omitted', async () => {
      await controller.login({ username: 'op', password: 'pw' });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ ip: '', userAgent: '' }),
      );
    });
  });

  // ── Register ────────────────────────────────────────────────────────────

  describe('Register RPC', () => {
    it('passes username, email, password to authService.register', async () => {
      await controller.register({
        username: 'newuser',
        email: 'new@x.com',
        password: 'Pass@123',
      });

      expect(mockAuthService.register).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@x.com',
        password: 'Pass@123',
      });
    });

    it('returns { message, user } RegisterResponse shape', async () => {
      const result = await controller.register({
        username: 'newuser',
        email: 'new@x.com',
        password: 'Pass@123',
      });

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
    });
  });

  // ── Refresh ─────────────────────────────────────────────────────────────

  describe('Refresh RPC', () => {
    it('unwraps { refresh_token } and calls authService.refreshToken(token)', async () => {
      await controller.refresh({ refresh_token: 'my-refresh-token' });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('my-refresh-token');
    });

    it('returns same TokenResponse shape as Login', async () => {
      const result = await controller.refresh({ refresh_token: 'token' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_in');
    });
  });

  // ── Logout ──────────────────────────────────────────────────────────────

  describe('Logout RPC', () => {
    it('passes refresh_token and optional username to authService.logout', async () => {
      await controller.logout({
        refresh_token: 'rt',
        username: 'operator1',
        ip: '1.2.3.4',
      });

      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'rt',
        'operator1',
        undefined,
        expect.objectContaining({ ip: '1.2.3.4' }),
      );
    });

    it('returns MessageResponse shape { message }', async () => {
      const result = await controller.logout({ refresh_token: 'rt' });

      expect(result).toHaveProperty('message');
    });
  });

  // ── ForgotPassword ──────────────────────────────────────────────────────

  describe('ForgotPassword RPC', () => {
    it('passes email to authService.forgotPassword', async () => {
      await controller.forgotPassword({ email: 'user@x.com' });

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        'user@x.com',
        expect.any(Object),
      );
    });

    it('returns MessageResponse shape', async () => {
      const result = await controller.forgotPassword({ email: 'user@x.com' });

      expect(result).toHaveProperty('message');
    });
  });

  // ── ResetPassword ───────────────────────────────────────────────────────

  describe('ResetPassword RPC', () => {
    it('passes token and new_password to authService.resetPassword', async () => {
      await controller.resetPassword({
        token: 'reset-token-abc',
        new_password: 'NewPass@123',
      });

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'reset-token-abc',
        'NewPass@123',
        expect.any(Object),
      );
    });

    it('returns MessageResponse shape', async () => {
      const result = await controller.resetPassword({
        token: 'reset-token-abc',
        new_password: 'NewPass@123',
      });

      expect(result).toHaveProperty('message');
    });
  });

  // ── GetMe ────────────────────────────────────────────────────────────────

  describe('GetMe RPC', () => {
    it('passes keycloak_id to authService.getMe', async () => {
      await controller.getMe({ keycloak_id: 'kc-uuid-001' });

      expect(mockAuthService.getMe).toHaveBeenCalledWith('kc-uuid-001');
    });

    it('returns UserResponse shape: user_id, username, email, role, is_active', async () => {
      const result = await controller.getMe({ keycloak_id: 'kc-uuid-001' });

      expect(result).toHaveProperty('user_id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('is_active');
    });
  });
});
