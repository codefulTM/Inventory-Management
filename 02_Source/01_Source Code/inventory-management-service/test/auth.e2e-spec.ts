jest.mock(
  'uuid',
  () => ({
    v4: () => '11111111-1111-4111-8111-111111111111',
  }),
  { virtual: true },
);

jest.mock('../src/auth/auth.service', () => ({
  AuthService: class AuthService {},
}));

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { UserRepository } from '../src/user/user.repository';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: {
    login: jest.Mock;
    register: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
    getMe: jest.Mock;
  };
  let userRepository: {
    findByKeycloakId: jest.Mock;
  };
  let currentUser: Record<string, unknown>;

  const jwtAuthGuardMock = {
    canActivate: jest.fn((context) => {
      context.switchToHttp().getRequest().user = currentUser;
      return true;
    }),
  };

  beforeEach(async () => {
    currentUser = { keycloak_id: 'kc-user-1' };

    authService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      getMe: jest.fn(),
    };

    userRepository = {
      findByKeycloakId: jest.fn(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UserRepository, useValue: userRepository },
      ],
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useValue(jwtAuthGuardMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /auth/login returns the token envelope used by the frontend', async () => {
    authService.login.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      user: {
        user_id: 'user-1',
        username: 'manager-1',
        email: 'manager@example.com',
        role: 'Manager',
        is_active: true,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-forwarded-for', '203.0.113.10')
      .set('user-agent', 'auth-e2e')
      .send({ username: 'manager-1', password: 'Password123!' })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        user: {
          user_id: 'user-1',
          username: 'manager-1',
          email: 'manager@example.com',
          role: 'Manager',
          is_active: true,
        },
      },
    });
    expect(authService.login).toHaveBeenCalledWith(
      { username: 'manager-1', password: 'Password123!' },
      {
        ip: '203.0.113.10',
        userAgent: 'auth-e2e',
      },
    );
  });

  it('POST /auth/register delegates operator registration', async () => {
    authService.register.mockResolvedValue({
      message: 'Đăng ký thành công',
      user: {
        user_id: 'user-2',
        username: 'operator-1',
        email: 'operator@example.com',
        role: 'Operator',
      },
    });

    const payload = {
      username: 'operator-1',
      email: 'operator@example.com',
      password: 'Password123!',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({
      message: 'Đăng ký thành công',
      user: {
        user_id: 'user-2',
        username: 'operator-1',
        email: 'operator@example.com',
        role: 'Operator',
      },
    });
    expect(authService.register).toHaveBeenCalledWith(payload);
  });

  it('POST /auth/logout resolves the actor username through the repository fallback', async () => {
    currentUser = { keycloak_id: 'kc-user-1' };
    userRepository.findByKeycloakId.mockResolvedValue({
      username: 'manager-1',
    });
    authService.logout.mockResolvedValue({ message: 'Đăng xuất thành công' });

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refresh_token: 'refresh-token' })
      .expect(200);

    expect(response.body).toEqual({ message: 'Đăng xuất thành công' });
    expect(userRepository.findByKeycloakId).toHaveBeenCalledWith('kc-user-1');
    expect(authService.logout).toHaveBeenCalledWith(
      'refresh-token',
      'manager-1',
      undefined,
      expect.objectContaining({ userAgent: '' }),
    );
  });

  it('GET /auth/me returns the current user record', async () => {
    authService.getMe.mockResolvedValue({
      user_id: 'user-1',
      username: 'manager-1',
      email: 'manager@example.com',
      role: 'Manager',
      is_active: true,
      keycloak_id: 'kc-user-1',
    });

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(200);

    expect(response.body).toEqual({
      user_id: 'user-1',
      username: 'manager-1',
      email: 'manager@example.com',
      role: 'Manager',
      is_active: true,
      keycloak_id: 'kc-user-1',
    });
    expect(authService.getMe).toHaveBeenCalledWith('kc-user-1');
  });
});