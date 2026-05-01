import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { NextFunction, Request, Response } from 'express';

jest.mock('../src/schemas/user.schema', () => ({
  UserRole: {
    MANAGER: 'Manager',
    OPERATOR: 'Operator',
    QC_TECHNICIAN: 'Quality Control Technician',
    IT_ADMINISTRATOR: 'IT Administrator',
  },
}));

import { InventoryTransactionController } from '../src/inventory-transaction/inventory-transaction.controller';
import { InventoryTransactionService } from '../src/inventory-transaction/inventory-transaction.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/schemas/user.schema';

class TestRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { role?: UserRole } }>();
    return req.user?.role === UserRole.OPERATOR;
  }
}

describe('US26 Operator My History (e2e)', () => {
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
    getMyHistory: jest.Mock;
    getMyHistoryDetail: jest.Mock;
  };

  beforeAll(async () => {
    service = {
      getMyHistory: jest.fn().mockResolvedValue({
        items: [
          {
            transaction_id: '11111111-1111-4111-8111-111111111111',
            reference_number: 'REF-001',
            lot_id: 'LOT-001',
            material_id: 'MAT-001',
            performed_by: 'operator01',
          },
        ],
        total: 1,
      }),
      getMyHistoryDetail: jest.fn().mockResolvedValue({
        transaction_id: '11111111-1111-4111-8111-111111111111',
        performed_by: 'operator01',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InventoryTransactionController],
      providers: [
        {
          provide: InventoryTransactionService,
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
      const username = req.header('x-user') ?? 'e2e-user';
      const roleHeader = req.header('x-role');
      const role =
        roleHeader === UserRole.OPERATOR ? UserRole.OPERATOR : UserRole.MANAGER;

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

  it('Operator can query my-history list with keyword', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/transactions/my-history?page=1&limit=20&transaction_type=Receipt&keyword=REF-001',
      )
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .expect(200);

    expect((res.body as { total?: number }).total).toBe(1);
    expect(service.getMyHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_type: 'Receipt',
        keyword: 'REF-001',
      }),
      expect.objectContaining({ page: 1, limit: 20 }),
      'operator01',
    );
  });

  it('Non-operator cannot access my-history list', async () => {
    await request(app.getHttpServer())
      .get('/transactions/my-history')
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(403);
  });

  it('maps ForbiddenException from detail endpoint to HTTP 403', async () => {
    service.getMyHistoryDetail.mockRejectedValueOnce(
      new ForbiddenException(
        'You do not have permission to view this transaction',
      ),
    );

    await request(app.getHttpServer())
      .get('/transactions/my-history/11111111-1111-4111-8111-111111111111')
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .expect(403);
  });

  it('maps NotFoundException from detail endpoint to HTTP 404', async () => {
    service.getMyHistoryDetail.mockRejectedValueOnce(
      new NotFoundException('Inventory transaction not found'),
    );

    await request(app.getHttpServer())
      .get('/transactions/my-history/22222222-2222-4222-8222-222222222222')
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .expect(404);
  });
});
