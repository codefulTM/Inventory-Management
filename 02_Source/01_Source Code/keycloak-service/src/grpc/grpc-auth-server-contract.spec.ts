/**
 * File: grpc-auth-server-contract.spec.ts
 * Mô tả: Contract tests cho gRPC AuthService server-side (keycloak-service).
 *
 * Mục đích: Xác minh rằng AuthGrpcController ánh xạ đúng mọi RPC từ proto file
 * sang phương thức tương ứng của AuthService với đúng định dạng tham số.
 *
 * Kiểm tra:
 * - Login: chuyển username/password → authService.login, trả về TokenResponse
 * - Register: chuyển username/email/password → authService.register
 * - Refresh: chuyển refresh_token → authService.refreshToken
 * - Logout: chuyển refresh_token/username → authService.logout
 * - ForgotPassword/ResetPassword: chuyển đúng tham số
 * - GetMe: chuyển keycloak_id → authService.getMe
 *
 * Không khởi chạy gRPC server thật — chỉ dùng NestJS testing module với mocked AuthService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGrpcController } from '../auth/auth.grpc.controller';
import { AuthService } from '../auth/auth.service';

// ── Dữ liệu giả lập phản hồi theo proto contract ──────────────────────────────

/** TokenResponse giả lập — cấu trúc trả về từ Login/Refresh */
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

/** MessageResponse giả lập — cấu trúc trả về từ Logout/ForgotPassword/ResetPassword */
const messageResponse = { message: 'ok' };

/** UserResponse giả lập — cấu trúc trả về từ GetMe */
const userResponse = {
  user_id: 'user-001',
  username: 'operator1',
  email: 'op1@example.com',
  role: 'Operator',
  is_active: true,
};

// ── Mock AuthService — giả lập tất cả phương thức ────────────────────────────────

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

  // ── Login RPC — Kiểm tra ánh xạ gRPC Login → authService.login ──────────────

  describe('Login RPC', () => {
    /** Kiểm tra chuyển đúng username/password từ gRPC data */
    it('maps gRPC {username, password} → authService.login({username, password})', async () => {
      await controller.login({ username: 'operator1', password: 'Pass@123' });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { username: 'operator1', password: 'Pass@123' },
        expect.any(Object),
      );
    });

    /** Kiểm tra extract ip và user_agent thành LogContext */
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

    /** Kiểm tra trả về đúng cấu trúc TokenResponse */
    it('returns TokenResponse shape: access_token, refresh_token, user', async () => {
      const result = await controller.login({ username: 'op', password: 'pw' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('user_id');
      expect(result.user).toHaveProperty('role');
    });

    /** Kiểm tra default ip và user_agent là chuỗi rỗng khi không cung cấp */
    it('defaults ip and user_agent to empty string when omitted', async () => {
      await controller.login({ username: 'op', password: 'pw' });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ ip: '', userAgent: '' }),
      );
    });
  });

  // ── Register RPC — Kiểm tra ánh xạ gRPC Register → authService.register ────

  describe('Register RPC', () => {
    /** Kiểm tra chuyển đúng username, email, password */
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

    /** Kiểm tra trả về đúng cấu trúc RegisterResponse { message, user } */
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

  // ── Refresh RPC — Kiểm tra ánh xạ gRPC Refresh → authService.refreshToken ──

  describe('Refresh RPC', () => {
    /** Kiểm tra unwrap refresh_token và gọi đúng phương thức */
    it('unwraps { refresh_token } and calls authService.refreshToken(token)', async () => {
      await controller.refresh({ refresh_token: 'my-refresh-token' });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('my-refresh-token');
    });

    /** Kiểm tra trả về cùng cấu trúc TokenResponse như Login */
    it('returns same TokenResponse shape as Login', async () => {
      const result = await controller.refresh({ refresh_token: 'token' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_in');
    });
  });

  // ── Logout RPC — Kiểm tra ánh xạ gRPC Logout → authService.logout ──────────

  describe('Logout RPC', () => {
    /** Kiểm tra chuyển refresh_token và optional username */
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

    /** Kiểm tra trả về đúng cấu trúc MessageResponse { message } */
    it('returns MessageResponse shape { message }', async () => {
      const result = await controller.logout({ refresh_token: 'rt' });

      expect(result).toHaveProperty('message');
    });
  });

  // ── ForgotPassword RPC — Kiểm tra ánh xạ gRPC ForgotPassword ───────────────

  describe('ForgotPassword RPC', () => {
    /** Kiểm tra chuyển đúng email */
    it('passes email to authService.forgotPassword', async () => {
      await controller.forgotPassword({ email: 'user@x.com' });

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        'user@x.com',
        expect.any(Object),
      );
    });

    /** Kiểm tra trả về đúng cấu trúc MessageResponse */
    it('returns MessageResponse shape', async () => {
      const result = await controller.forgotPassword({ email: 'user@x.com' });

      expect(result).toHaveProperty('message');
    });
  });

  // ── ResetPassword RPC — Kiểm tra ánh xạ gRPC ResetPassword ─────────────────

  describe('ResetPassword RPC', () => {
    /** Kiểm tra chuyển đúng token và new_password */
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

    /** Kiểm tra trả về đúng cấu trúc MessageResponse */
    it('returns MessageResponse shape', async () => {
      const result = await controller.resetPassword({
        token: 'reset-token-abc',
        new_password: 'NewPass@123',
      });

      expect(result).toHaveProperty('message');
    });
  });

  // ── GetMe RPC — Kiểm tra ánh xạ gRPC GetMe → authService.getMe ─────────────

  describe('GetMe RPC', () => {
    /** Kiểm tra chuyển đúng keycloak_id */
    it('passes keycloak_id to authService.getMe', async () => {
      await controller.getMe({ keycloak_id: 'kc-uuid-001' });

      expect(mockAuthService.getMe).toHaveBeenCalledWith('kc-uuid-001');
    });

    /** Kiểm tra trả về đúng cấu trúc UserResponse */
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
