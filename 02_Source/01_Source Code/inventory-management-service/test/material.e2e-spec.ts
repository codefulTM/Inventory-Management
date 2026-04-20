jest.mock(
  'uuid',
  () => ({ v4: () => '11111111-1111-4111-8111-111111111111' }),
  { virtual: true },
);

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { MaterialController } from '../src/material/material.controller';
import { MaterialService } from '../src/material/material.service';
import { JwtAuthGuard } from '../src/common/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/auth/roles.guard';

describe('MaterialController (e2e)', () => {
  let app: INestApplication;
  let svc: any;

  const jwtGuardMock = { canActivate: jest.fn(() => true) };
  const rolesGuardMock = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    svc = {
      findAll: jest.fn().mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      search: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getOptions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      filterByType: jest.fn().mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      findById: jest
        .fn()
        .mockResolvedValue({ _id: 'mat-1', material_id: 'MAT-1' }),
      create: jest.fn().mockResolvedValue({ _id: 'mat-1' }),
      update: jest.fn().mockResolvedValue({ ok: true }),
      delete: jest.fn().mockResolvedValue({ ok: true }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [MaterialController],
      providers: [{ provide: MaterialService, useValue: svc }],
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useValue(jwtGuardMock);
    moduleBuilder.overrideGuard(RolesGuard).useValue(rolesGuardMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /materials forwards paging to service', async () => {
    await request(app.getHttpServer())
      .get('/materials?page=1&limit=10')
      .expect(200);
    expect(svc.findAll).toHaveBeenCalled();
  });

  it('GET /materials/search requires q', async () => {
    await request(app.getHttpServer()).get('/materials/search').expect(400);
  });

  it('POST /materials creates a material', async () => {
    const payload = {
      material_id: 'MAT-1',
      part_number: 'PN-1',
      material_name: 'Test Material',
      material_type: 'API',
    };
    const res = await request(app.getHttpServer())
      .post('/materials')
      .send(payload)
      .expect(201);
    expect(svc.create).toHaveBeenCalled();
    expect(res.body).toHaveProperty('_id', 'mat-1');
  });
});
