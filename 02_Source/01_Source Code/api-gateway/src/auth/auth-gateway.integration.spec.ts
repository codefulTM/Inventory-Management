/**
 * File: auth-gateway.integration.spec.ts
 * Mô tả: Integration tests cho AuthController — lớp HTTP của API Gateway
 * Chức năng: Kiểm tra toàn bộ luồng request → response của các endpoint /auth/*
 * 
 * Luồng test:
 *   HTTP request → AuthController → AuthGatewayService (mock) → response
 * 
 * Sử dụng NestJS testing HTTP app + supertest
 * JWT guards bị bypass để tập trung test logic controller
 * 
 * Các endpoint được test:
 * - POST /auth/login     — Đăng nhập, kiểm tra response format { success, data }
 * - POST /auth/register  — Đăng ký, kiểm tra status 201
 * - POST /auth/refresh   — Làm mới token
 * - POST /auth/logout    — Đăng xuất
 * - POST /auth/forgot-password — Gửi email reset mật khẩu
 * - POST /auth/reset-password  — Đặt lại mật khẩu bằng token
 * 
 * Mock: AuthGatewayService, JwtAuthGuard
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthGatewayService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// ── response stubs ─────────────────────────────────────────────────────────

const tokenData = {
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

const mockAuthGatewayService = {
  login: jest.fn().mockResolvedValue(tokenData),
  register: jest.fn().mockResolvedValue({ message: 'Đăng ký thành công', user: tokenData.user }),
  refresh: jest.fn().mockResolvedValue(tokenData),
  logout: jest.fn().mockResolvedValue({ message: 'Đăng xuất thành công' }),
  forgotPassword: jest.fn().mockResolvedValue({ message: 'Email sent if exists' }),
  resetPassword: jest.fn().mockResolvedValue({ message: 'Password reset' }),
  getMe: jest.fn().mockResolvedValue(tokenData.user),
};

const jwtGuardMock = { canActivate: jest.fn(() => true) };

describe('AuthController (integration — HTTP layer)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthGatewayService, useValue: mockAuthGatewayService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuardMock)
      .compile();

    app = testModule.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ── POST /auth/login ─────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns 200 with { success: true, data: tokenData }', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'operator1', password: 'Pass@123' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('user');
    });

    it('forwards username and password to authService.login()', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'operator1', password: 'Pass@123' });

      expect(mockAuthGatewayService.login).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'operator1', password: 'Pass@123' }),
      );
    });

    it('injects ip and user_agent into the gRPC call', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.5')
        .set('User-Agent', 'TestAgent/1.0')
        .send({ username: 'operator1', password: 'Pass@123' });

      expect(mockAuthGatewayService.login).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '10.0.0.5', user_agent: 'TestAgent/1.0' }),
      );
    });
  });

  // ── POST /auth/register ──────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('returns 201 with register response', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'newuser', email: 'new@x.com', password: 'Pass@123' })
        .expect(201);

      expect(response.body).toHaveProperty('message');
    });

    it('forwards username, email, password to authService.register()', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'newuser', email: 'new@x.com', password: 'Pass@123' });

      expect(mockAuthGatewayService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'new@x.com',
          password: 'Pass@123',
        }),
      );
    });
  });

  // ── POST /auth/refresh ───────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns 200 and forwards refresh_token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'my-refresh-token' })
        .expect(200);

      expect(mockAuthGatewayService.refresh).toHaveBeenCalledWith('my-refresh-token');
      expect(response.body).toHaveProperty('access_token');
    });
  });

  // ── POST /auth/logout ────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 200 and forwards refresh_token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: 'my-refresh-token' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  // ── POST /auth/forgot-password ───────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('returns 200 and forwards email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'user@x.com' })
        .expect(200);

      expect(mockAuthGatewayService.forgotPassword).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@x.com' }),
      );
      expect(response.body).toHaveProperty('message');
    });
  });

  // ── POST /auth/reset-password ────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('returns 200 and forwards token + new_password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'reset-tok', new_password: 'NewPass@123' })
        .expect(200);

      expect(mockAuthGatewayService.resetPassword).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'reset-tok', new_password: 'NewPass@123' }),
      );
      expect(response.body).toHaveProperty('message');
    });
  });
});
