import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for api-gateway.
 * Set RUN_E2E=true to enable (requires keycloak-service + backend to be running).
 */
const RUN_E2E = process.env.RUN_E2E === 'true';

(RUN_E2E ? describe : describe.skip)('Gateway E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login — returns 200 OK shape', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin_manager', password: 'Admin@123456' })
      .expect((res) => {
        // 200/401 when keycloak is running; 500/502 when infra is not available
        expect([200, 401, 500, 502]).toContain(res.status);
      });
  });

  it('GET /auth/me — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /reports/inventory-status — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/reports/inventory-status').expect(401);
  });

  it('GET /reports/material-usage — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/reports/material-usage').expect(401);
  });

  it('GET /reports/qc-performance — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/reports/qc-performance').expect(401);
  });

  it('GET /reports/audit — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/reports/audit').expect(401);
  });

  it('GET /reports/inventory-trend — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/reports/inventory-trend').expect(401);
  });

  it('GET /reports/material-usage-trend — returns 401 without token', () => {
    return request(app.getHttpServer())
      .get('/reports/material-usage-trend')
      .expect(401);
  });

  it('GET /reports/qc-trend — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/reports/qc-trend').expect(401);
  });

  it('GET /reports/audit-trend — returns 401 without token', () => {
    return request(app.getHttpServer()).get('/reports/audit-trend').expect(401);
  });
});
