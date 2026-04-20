jest.mock(
  'uuid',
  () => ({ v4: () => '11111111-1111-4111-8111-111111111111' }),
  { virtual: true },
);

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { BinWorklistController } from '../src/inventory-lot/bin-worklist.controller';
import { BinWorklistService } from '../src/inventory-lot/bin-worklist.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

describe('BinWorklistController (e2e)', () => {
  let app: INestApplication;
  let svc: any;

  const jwtGuardMock = { canActivate: jest.fn(() => true) };
  const rolesGuardMock = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    svc = {
      getWorklist: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getBinDetails: jest.fn().mockResolvedValue({ bin_code: 'BIN-01' }),
      getBinCounts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      submitCounts: jest.fn().mockResolvedValue({ ok: true }),
      createBin: jest.fn().mockResolvedValue({ bin_code: 'BIN-NEW' }),
      updateBin: jest.fn().mockResolvedValue({ ok: true }),
      deleteBin: jest.fn().mockResolvedValue({ ok: true }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [BinWorklistController],
      providers: [{ provide: BinWorklistService, useValue: svc }],
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

  it('GET /bins/worklist forwards params', async () => {
    await request(app.getHttpServer())
      .get('/bins/worklist?warehouse_id=WH-1&q=abc&page=1&limit=20')
      .expect(200);
    expect(svc.getWorklist).toHaveBeenCalledWith('WH-1', 1, 20, 'abc');
  });

  it('GET /bins/:bin_code and counts call service', async () => {
    await request(app.getHttpServer()).get('/bins/BIN-01').expect(200);
    expect(svc.getBinDetails).toHaveBeenCalledWith('BIN-01');

    await request(app.getHttpServer())
      .get('/bins/BIN-01/counts?page=2&limit=5')
      .expect(200);
    expect(svc.getBinCounts).toHaveBeenCalledWith('BIN-01', 2, 5);
  });

  it('POST /bins/:bin_code/counts submits counts', async () => {
    await request(app.getHttpServer())
      .post('/bins/BIN-01/counts')
      .send({
        counted_by: 'operator01',
        entries: [{ material_id: 'MAT-1', counted_qty: 3 }],
      })
      .expect(201);
    expect(svc.submitCounts).toHaveBeenCalled();
  });

  it('POST/PUT/DELETE bin endpoints call service', async () => {
    await request(app.getHttpServer())
      .post('/bins')
      .send({ bin_code: 'BIN-NEW' })
      .expect(201);
    expect(svc.createBin).toHaveBeenCalled();

    await request(app.getHttpServer())
      .put('/bins/BIN-NEW')
      .send({ expected_qty: 5 })
      .expect(200);
    expect(svc.updateBin).toHaveBeenCalledWith('BIN-NEW', expect.any(Object));

    await request(app.getHttpServer()).delete('/bins/BIN-NEW').expect(200);
    expect(svc.deleteBin).toHaveBeenCalledWith('BIN-NEW');
  });
});
