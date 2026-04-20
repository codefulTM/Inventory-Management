jest.mock('uuid', () => ({ v4: () => '11111111-1111-4111-8111-111111111111' }), { virtual: true });

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { InventoryLotController } from '../src/inventory-lot/inventory-lot.controller';
import { InventoryLotService } from '../src/inventory-lot/inventory-lot.service';
import { JwtAuthGuard } from '../src/common/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/auth/roles.guard';

describe('InventoryLotController (e2e)', () => {
  let app: INestApplication;
  let svc: any;

  const jwtGuardMock = { canActivate: jest.fn(() => true) };
  const rolesGuardMock = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    svc = {
      create: jest.fn().mockResolvedValue({ _id: 'lot-1' }),
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findByStatus: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getLotsStatistics: jest.fn().mockResolvedValue({ total_lots: 0 }),
      search: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getOptions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: jest.fn().mockResolvedValue({ _id: 'lot-1' }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [InventoryLotController],
      providers: [{ provide: InventoryLotService, useValue: svc }],
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

  it('POST /inventory-lots creates a lot', async () => {
    const res = await request(app.getHttpServer()).post('/inventory-lots').send({ material_id: 'MAT-1', quantity: 10 }).expect(201);
    expect(svc.create).toHaveBeenCalled();
    expect(res.body).toHaveProperty('_id', 'lot-1');
  });

  it('GET /inventory-lots with status forwards to findByStatus', async () => {
    await request(app.getHttpServer()).get('/inventory-lots?status=Accepted&page=2&limit=5').expect(200);
    expect(svc.findByStatus).toHaveBeenCalled();
  });

  it('GET /inventory-lots/statistics calls service', async () => {
    const res = await request(app.getHttpServer()).get('/inventory-lots/statistics').expect(200);
    expect(svc.getLotsStatistics).toHaveBeenCalled();
    expect(res.body).toHaveProperty('total_lots');
  });

  it('GET /inventory-lots/:id returns lot', async () => {
    const res = await request(app.getHttpServer()).get('/inventory-lots/lot-1').expect(200);
    expect(svc.findById).toHaveBeenCalledWith('lot-1');
    expect(res.body).toHaveProperty('_id', 'lot-1');
  });
});
