import {
  CanActivate,
  ConflictException,
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

import { InventoryAdjustmentController } from '../src/inventory-adjustment/inventory-adjustment.controller';
import { InventoryAdjustmentService } from '../src/inventory-adjustment/inventory-adjustment.service';
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

describe('US10 Manager Inventory Adjustment (e2e)', () => {
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
  };

  beforeAll(async () => {
    service = {
      create: jest.fn().mockResolvedValue({
        adjustment_id: '11111111-1111-4111-8111-111111111111',
        transaction_id: '22222222-2222-4222-8222-222222222222',
        valuation_before: 1000,
        valuation_after: 950,
        valuation_delta: -50,
      }),
      findAll: jest.fn().mockResolvedValue({
        items: [
          {
            adjustment_id: '11111111-1111-4111-8111-111111111111',
            reason_code: 'DAMAGED',
          },
        ],
        total: 1,
      }),
      findOne: jest.fn().mockResolvedValue({
        adjustment_id: '11111111-1111-4111-8111-111111111111',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InventoryAdjustmentController],
      providers: [
        {
          provide: InventoryAdjustmentService,
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

  it('Manager can create inventory adjustment', async () => {
    const res = await request(app.getHttpServer())
      .post('/inventory-adjustments')
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .send({
        lot_id: 'd9e2d622-06d0-4c77-a79d-509dbfa2b8a1',
        adjustment_quantity: -5,
        reason_code: 'DAMAGED',
        reason_note: 'Hư hỏng trong kho',
        unit_cost_snapshot: 10,
      })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        adjustment_id: '11111111-1111-4111-8111-111111111111',
      }),
    );

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reason_code: 'DAMAGED',
      }),
      expect.objectContaining({ actor: 'manager01' }),
    );
  });

  it('Non-manager cannot create inventory adjustment', async () => {
    await request(app.getHttpServer())
      .post('/inventory-adjustments')
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .send({
        lot_id: 'd9e2d622-06d0-4c77-a79d-509dbfa2b8a1',
        adjustment_quantity: -5,
        reason_code: 'DAMAGED',
        unit_cost_snapshot: 10,
      })
      .expect(403);
  });

  it('Manager can query adjustments list', async () => {
    const res = await request(app.getHttpServer())
      .get('/inventory-adjustments?page=1&limit=20&reason_code=DAMAGED')
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(200);

    expect((res.body as { total?: number }).total).toBe(1);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ reason_code: 'DAMAGED' }),
    );
  });

  it('maps conflict error from service to HTTP 409', async () => {
    service.create.mockRejectedValueOnce(
      new ConflictException('Inventory quantity cannot be negative'),
    );

    await request(app.getHttpServer())
      .post('/inventory-adjustments')
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .send({
        lot_id: 'd9e2d622-06d0-4c77-a79d-509dbfa2b8a1',
        adjustment_quantity: -500,
        reason_code: 'DAMAGED',
        unit_cost_snapshot: 10,
      })
      .expect(409);
  });

  it('maps not found detail to HTTP 404', async () => {
    service.findOne.mockRejectedValueOnce(
      new NotFoundException('Inventory adjustment not found'),
    );

    await request(app.getHttpServer())
      .get('/inventory-adjustments/33333333-3333-4333-8333-333333333333')
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .expect(404);
  });
});
