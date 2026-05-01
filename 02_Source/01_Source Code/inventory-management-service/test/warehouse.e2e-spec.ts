jest.mock(
  'uuid',
  () => ({ v4: () => '11111111-1111-4111-8111-111111111111' }),
  { virtual: true },
);

import { INestApplication, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { WarehouseController } from '../src/warehouse/warehouse.controller';
import { WarehouseService } from '../src/warehouse/warehouse.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

describe('WarehouseController (e2e)', () => {
  let app: INestApplication;
  let svc: any;

  const jwtGuardMock = { canActivate: jest.fn(() => true) };
  const rolesGuardMock = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    svc = {
      findAll: jest
        .fn()
        .mockResolvedValue({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      search: jest
        .fn()
        .mockResolvedValue({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      getOptions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: jest.fn().mockResolvedValue({ _id: '1', warehouse_id: 'WH-1' }),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, _id: 'created' })),
      update: jest.fn().mockResolvedValue({ updated: true }),
      delete: jest.fn().mockResolvedValue({ message: 'deleted' }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [WarehouseController],
      providers: [{ provide: WarehouseService, useValue: svc }],
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

  it('GET /warehouses forwards paging to service', async () => {
    const res = await request(app.getHttpServer())
      .get('/warehouses?page=2&limit=5')
      .expect(200);
    expect(svc.findAll).toHaveBeenCalled();
  });

  it('GET /warehouses/search without q returns 400', async () => {
    await request(app.getHttpServer()).get('/warehouses/search').expect(400);
  });

  it('POST /warehouses creates a warehouse', async () => {
    const payload = { warehouse_id: 'WH-NEW', warehouse_name: 'New' };
    const res = await request(app.getHttpServer())
      .post('/warehouses')
      .send(payload)
      .expect(201);
    expect(svc.create).toHaveBeenCalledWith(
      expect.objectContaining({ warehouse_id: 'WH-NEW' }),
    );
    expect(res.body).toHaveProperty('_id', 'created');
  });

  it('GET /warehouses/:id returns warehouse', async () => {
    const res = await request(app.getHttpServer())
      .get('/warehouses/1')
      .expect(200);
    expect(res.body).toHaveProperty('warehouse_id', 'WH-1');
    expect(svc.findById).toHaveBeenCalledWith('1');
  });
});
