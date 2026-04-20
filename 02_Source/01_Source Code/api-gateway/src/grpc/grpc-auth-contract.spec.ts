/**
 * Contract tests — gRPC AuthService contract (api-gateway ↔ keycloak-service)
 *
 * Verifies that AuthGatewayService correctly maps HTTP-level inputs to the
 * expected gRPC call shapes defined in auth.proto.  No real gRPC server is
 * needed — the client is mocked to capture what the gateway sends.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AuthGatewayService } from '../auth/auth.service';
import { AUTH_SERVICE_TOKEN } from './grpc.module';

// ── proto-defined response shapes ─────────────────────────────────────────

const tokenResponse = {
  access_token: 'eyJhbGc.payload.sig',
  refresh_token: 'refresh-token-xyz',
  expires_in: 300,
  refresh_expires_in: 1800,
  token_type: 'Bearer',
  session_state: 'session-abc',
  scope: 'openid',
  user: {
    user_id: 'user-001',
    username: 'operator1',
    email: 'op1@example.com',
    role: 'Operator',
    keycloak_id: 'kc-001',
    is_active: true,
  },
};

const messageResponse = { message: 'ok' };

const userResponse = {
  user_id: 'user-001',
  username: 'operator1',
  email: 'op1@example.com',
  role: 'Operator',
  keycloak_id: 'kc-001',
  is_active: true,
  lock_type: '',
  lock_reason: '',
};

// ── mock gRPC service (captures call shapes) ───────────────────────────────

const mockGrpcAuthService = {
  login: jest.fn().mockReturnValue(of(tokenResponse)),
  register: jest.fn().mockReturnValue(of({ message: 'registered', user: userResponse })),
  refresh: jest.fn().mockReturnValue(of(tokenResponse)),
  logout: jest.fn().mockReturnValue(of(messageResponse)),
  forgotPassword: jest.fn().mockReturnValue(of(messageResponse)),
  resetPassword: jest.fn().mockReturnValue(of(messageResponse)),
  getMe: jest.fn().mockReturnValue(of(userResponse)),
};

const mockGrpcClient = {
  getService: jest.fn().mockReturnValue(mockGrpcAuthService),
};

describe('AuthService gRPC contract (api-gateway ↔ keycloak-service)', () => {
  let service: AuthGatewayService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGatewayService,
        { provide: AUTH_SERVICE_TOKEN, useValue: mockGrpcClient },
      ],
    }).compile();

    service = testModule.get<AuthGatewayService>(AuthGatewayService);
    service.onModuleInit();
  });

  // ── service discovery ───────────────────────────────────────────────────

  it('resolves the "AuthService" package from the gRPC client', () => {
    expect(mockGrpcClient.getService).toHaveBeenCalledWith('AuthService');
  });

  // ── Login contract ──────────────────────────────────────────────────────

  describe('Login RPC', () => {
    it('sends username + password to gRPC Login', async () => {
      await service.login({ username: 'operator1', password: 'Pass@123' });

      expect(mockGrpcAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'operator1', password: 'Pass@123' }),
      );
    });

    it('forwards optional ip and user_agent fields', async () => {
      await service.login({ username: 'op', password: 'pw', ip: '1.2.3.4', user_agent: 'Mozilla' });

      expect(mockGrpcAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '1.2.3.4', user_agent: 'Mozilla' }),
      );
    });

    it('response includes access_token, refresh_token and user shape', async () => {
      const result = await service.login({ username: 'op', password: 'pw' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('user_id');
      expect(result.user).toHaveProperty('role');
    });
  });

  // ── Register contract ───────────────────────────────────────────────────

  describe('Register RPC', () => {
    it('sends username, email and password to gRPC Register', async () => {
      await service.register({ username: 'newuser', email: 'new@x.com', password: 'Pass@123' });

      expect(mockGrpcAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'new@x.com',
          password: 'Pass@123',
        }),
      );
    });
  });

  // ── Refresh contract ────────────────────────────────────────────────────

  describe('Refresh RPC', () => {
    it('wraps refresh_token string in { refresh_token } object for gRPC', async () => {
      await service.refresh('my-refresh-token');

      expect(mockGrpcAuthService.refresh).toHaveBeenCalledWith(
        { refresh_token: 'my-refresh-token' },
      );
    });

    it('response has same TokenResponse shape as Login', async () => {
      const result = await service.refresh('token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_in');
    });
  });

  // ── Logout contract ─────────────────────────────────────────────────────

  describe('Logout RPC', () => {
    it('sends refresh_token and optional metadata to gRPC Logout', async () => {
      await service.logout({ refresh_token: 'rt', username: 'op', ip: '1.2.3.4' });

      expect(mockGrpcAuthService.logout).toHaveBeenCalledWith(
        expect.objectContaining({ refresh_token: 'rt', username: 'op' }),
      );
    });

    it('response has MessageResponse shape: { message }', async () => {
      const result = await service.logout({ refresh_token: 'rt' });

      expect(result).toHaveProperty('message');
    });
  });

  // ── ForgotPassword contract ─────────────────────────────────────────────

  describe('ForgotPassword RPC', () => {
    it('sends email to gRPC ForgotPassword', async () => {
      await service.forgotPassword({ email: 'user@x.com' });

      expect(mockGrpcAuthService.forgotPassword).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@x.com' }),
      );
    });
  });

  // ── ResetPassword contract ──────────────────────────────────────────────

  describe('ResetPassword RPC', () => {
    it('sends token and new_password to gRPC ResetPassword', async () => {
      await service.resetPassword({ token: 'reset-token', new_password: 'NewPass@123' });

      expect(mockGrpcAuthService.resetPassword).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'reset-token', new_password: 'NewPass@123' }),
      );
    });
  });

  // ── GetMe contract ──────────────────────────────────────────────────────

  describe('GetMe RPC', () => {
    it('sends keycloak_id to gRPC GetMe', async () => {
      await service.getMe('kc-uuid-001');

      expect(mockGrpcAuthService.getMe).toHaveBeenCalledWith(
        { keycloak_id: 'kc-uuid-001' },
      );
    });

    it('response has UserResponse shape', async () => {
      const result = await service.getMe('kc-uuid-001');

      expect(result).toHaveProperty('user_id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('is_active');
    });
  });
});
