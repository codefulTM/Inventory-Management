import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E test for keycloak-service HTTP endpoints.
 * Requires a running Keycloak and MongoDB instance.
 * Set RUN_E2E=true to enable.
 */
const RUN_E2E = process.env.RUN_E2E === 'true';

(RUN_E2E ? describe : describe.skip)('Auth E2E (keycloak-service)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login — should return 400 on missing body', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(400);
  });

  it('POST /api/auth/register — should return 400 on missing body', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({})
      .expect(400);
  });

  it('POST /api/auth/forgot-password — should return 200 (safe response)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@test.com' })
      .expect(200);
  });
});
