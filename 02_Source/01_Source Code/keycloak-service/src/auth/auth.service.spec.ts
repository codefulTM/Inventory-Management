import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { getModelToken } from '@nestjs/mongoose';
import { PasswordResetToken } from '../schemas/password-reset-token.schema';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserRole } from '../schemas/user.schema';

describe('AuthService', () => {
  let service: AuthService;

  const mockKeycloakService = {
    loginUser: jest.fn(),
    findKeycloakUserByUsername: jest.fn(),
    getRealmRolesForUser: jest.fn(),
    refreshToken: jest.fn(),
    logoutUser: jest.fn(),
    createUser: jest.fn(),
    resetPassword: jest.fn(),
  };
  const mockUserService = {
    findByUsername: jest.fn(),
    findByKeycloakId: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };
  const mockMailService = { sendResetPasswordEmail: jest.fn() };
  const mockAuditLogService = { log: jest.fn().mockResolvedValue(undefined) };
  const mockResetTokenModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: UserService, useValue: mockUserService },
        { provide: MailService, useValue: mockMailService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: getModelToken(PasswordResetToken.name), useValue: mockResetTokenModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should throw UnauthorizedException when account is deactivated', async () => {
      mockUserService.findByUsername.mockResolvedValue({
        is_active: false,
        lock_type: 'deactivated',
        lock_reason: 'violation',
      });

      await expect(
        service.login({ username: 'user1', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should call keycloakService.loginUser on valid credentials', async () => {
      mockUserService.findByUsername.mockResolvedValue({
        is_active: true,
        user_id: 'u1',
        username: 'user1',
        email: 'user1@test.com',
        role: UserRole.OPERATOR,
        keycloak_id: 'kc1',
        updateLastLogin: jest.fn(),
      });
      mockKeycloakService.loginUser.mockResolvedValue({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 300,
        refresh_expires_in: 1800,
        token_type: 'Bearer',
        session_state: 'ss',
        scope: 'openid',
      });

      const result = await service.login({ username: 'user1', password: 'pass' });
      expect(mockKeycloakService.loginUser).toHaveBeenCalledWith('user1', 'pass');
      expect(result).toHaveProperty('access_token');
    });
  });

  describe('register', () => {
    it('should throw ConflictException when username already exists', async () => {
      mockUserService.findByUsername.mockResolvedValue({ username: 'existing' });

      await expect(
        service.register({ username: 'existing', email: 'e@test.com', password: 'P@ss1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user in Keycloak and MongoDB', async () => {
      mockUserService.findByUsername.mockResolvedValue(null);
      mockUserService.findByEmail.mockResolvedValue(null);
      mockKeycloakService.createUser.mockResolvedValue('kc-new-id');
      mockUserService.create.mockResolvedValue({
        user_id: 'u2',
        username: 'newuser',
        email: 'new@test.com',
        role: UserRole.OPERATOR,
      });

      const result = await service.register({
        username: 'newuser',
        email: 'new@test.com',
        password: 'P@ss1!',
      });

      expect(mockKeycloakService.createUser).toHaveBeenCalled();
      expect(mockUserService.create).toHaveBeenCalled();
      expect(result.message).toBe('Đăng ký thành công');
    });
  });
});
