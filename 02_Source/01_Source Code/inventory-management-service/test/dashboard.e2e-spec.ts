import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DashboardController } from '../src/dashboard/dashboard.controller';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { JwtAuthGuard } from '../src/common/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/auth/roles.guard';

jest.mock(
  'uuid',
  () => ({
    v4: () => '11111111-1111-4111-8111-111111111111',
  }),
  { virtual: true },
);
describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let svc: {
    getSummary: jest.Mock;
    getTrends: jest.Mock;
    getDrilldown: jest.Mock;
  };

  const jwtGuardMock = { canActivate: jest.fn(() => true) };
  const rolesGuardMock = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    svc = {
      getSummary: jest.fn().mockResolvedValue({ total_kpis: 3, items: [] }),
      getTrends: jest.fn().mockResolvedValue({ points: [] }),
      getDrilldown: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: svc }],
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

  it('GET /dashboard/summary forwards query args to service', async () => {
    const from = '2026-04-01T00:00:00Z';
    const to = '2026-04-30T23:59:59Z';

    const res = await request(app.getHttpServer())
      .get('/dashboard/summary')
      .query({ warehouseId: 'WH-01', from, to })
      .expect(200);

    expect(res.body).toEqual({ total_kpis: 3, items: [] });
    expect(svc.getSummary).toHaveBeenCalledWith({
      warehouseId: 'WH-01',
      from,
      to,
    });
  });

  it('GET /dashboard/trends forwards metric and options to service', async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard/trends')
      .query({
        metric: 'in',
        from: '2026-04-01',
        to: '2026-04-30',
        interval: 'day',
        warehouseId: 'WH-01',
      })
      .expect(200);

    expect(res.body).toEqual({ points: [] });
    expect(svc.getTrends).toHaveBeenCalledWith({
      metric: 'in',
      from: '2026-04-01',
      to: '2026-04-30',
      interval: 'day',
      warehouseId: 'WH-01',
    });
  });

  it('GET /dashboard/drilldown parses paging and forwards to service', async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard/drilldown')
      .query({
        metric: 'out',
        page: '2',
        limit: '50',
        materialId: 'MAT-01',
        from: '2026-04-01',
        to: '2026-04-30',
      })
      .expect(200);

    expect(res.body).toEqual({ items: [], total: 0 });
    expect(svc.getDrilldown).toHaveBeenCalledWith({
      metric: 'out',
      page: 2,
      limit: 50,
      materialId: 'MAT-01',
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });
});
