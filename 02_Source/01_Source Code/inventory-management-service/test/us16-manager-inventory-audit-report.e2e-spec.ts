import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';

jest.mock('../src/schemas/user.schema', () => ({
  UserRole: {
    MANAGER: 'Manager',
    OPERATOR: 'Operator',
    QC_TECHNICIAN: 'Quality Control Technician',
    IT_ADMINISTRATOR: 'IT Administrator',
  },
}));

import { InventoryAuditReportController } from '../src/inventory-audit-report/inventory-audit-report.controller';
import { InventoryAuditReportService } from '../src/inventory-audit-report/inventory-audit-report.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/schemas/user.schema';

class TestRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { role?: UserRole } }>();
    return req.user?.role === UserRole.MANAGER;
  }
}

describe('US16 Manager Export Inventory Audit Report (e2e)', () => {
  type AuthRequest = Request & {
    user?: {
      username: string;
      keycloak_id: string;
      email: string;
      role: UserRole;
    };
  };

  let app: INestApplication<App>;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    download: jest.Mock;
  };

  beforeAll(async () => {
    service = {
      create: jest.fn().mockResolvedValue({
        report_id: '11111111-1111-4111-8111-111111111111',
        status: 'READY',
        requested_by: 'manager01',
        requested_at: '2026-04-04T10:00:00.000Z',
      }),
      findAll: jest.fn().mockResolvedValue({
        items: [
          {
            report_id: '11111111-1111-4111-8111-111111111111',
            status: 'READY',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
      findOne: jest.fn().mockResolvedValue({
        report_id: '11111111-1111-4111-8111-111111111111',
        status: 'READY',
      }),
      download: jest.fn().mockResolvedValue({
        fileBuffer: Buffer.from('%PDF-1.4\nUS16 MOCK\n'),
        fileName: '11111111-1111-4111-8111-111111111111.pdf',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InventoryAuditReportController],
      providers: [
        {
          provide: InventoryAuditReportService,
          useValue: service,
        },
        {
          provide: RolesGuard,
          useClass: TestRolesGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: AuthRequest, _res: Response, next: NextFunction) => {
      const username = req.header('x-user') ?? 'e2e-manager';
      const roleHeader = req.header('x-role');
      const role =
        roleHeader === UserRole.MANAGER ? UserRole.MANAGER : UserRole.OPERATOR;

      req.user = {
        username,
        keycloak_id: 'kc-e2e',
        email: 'e2e@example.local',
        role,
      };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Manager can create inventory audit report', async () => {
    const res = await request(app.getHttpServer())
      .post('/inventory-audit-reports')
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .send({
        period_from: '2026-04-01T00:00:00.000Z',
        period_to: '2026-04-30T00:00:00.000Z',
        scope_warehouse_ids: ['WH-HN-01'],
        include_zero_balance: false,
        report_template_code: 'STATUTORY_V1',
      })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        report_id: '11111111-1111-4111-8111-111111111111',
      }),
    );

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ report_template_code: 'STATUTORY_V1' }),
      expect.objectContaining({ actor: 'kc-e2e' }),
    );
  });

  it('Non-manager cannot create inventory audit report', async () => {
    await request(app.getHttpServer())
      .post('/inventory-audit-reports')
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .send({
        period_from: '2026-04-01T00:00:00.000Z',
        period_to: '2026-04-30T00:00:00.000Z',
      })
      .expect(403);
  });

  it('Manager can query reports list', async () => {
    const res = await request(app.getHttpServer())
      .get('/inventory-audit-reports?page=1&limit=20&status=READY')
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(200);

    expect((res.body as { total?: number }).total).toBe(1);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'READY' }),
    );
  });

  it('Manager can get report detail', async () => {
    const reportId = '11111111-1111-4111-8111-111111111111';

    const res = await request(app.getHttpServer())
      .get(`/inventory-audit-reports/${reportId}`)
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(200);

    expect((res.body as { report_id?: string }).report_id).toBe(reportId);
  });

  it('Manager can download report pdf', async () => {
    const reportId = '11111111-1111-4111-8111-111111111111';

    await request(app.getHttpServer())
      .get(`/inventory-audit-reports/${reportId}/download`)
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(200)
      .expect('Content-Type', /application\/pdf/)
      .expect(
        'Content-Disposition',
        'attachment; filename="11111111-1111-4111-8111-111111111111.pdf"',
      );

    expect(service.download).toHaveBeenCalledWith(reportId);
  });

  it('maps not found from service to HTTP 404', async () => {
    service.findOne.mockRejectedValueOnce(
      new NotFoundException('Report not found'),
    );

    const reportId = '22222222-2222-4222-8222-222222222222';

    await request(app.getHttpServer())
      .get(`/inventory-audit-reports/${reportId}`)
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(404);
  });

  it('maps bad request from download service to HTTP 400', async () => {
    service.download.mockRejectedValueOnce(
      new BadRequestException('Report is not ready for download'),
    );

    const reportId = '33333333-3333-4333-8333-333333333333';

    await request(app.getHttpServer())
      .get(`/inventory-audit-reports/${reportId}/download`)
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(400);
  });
});
