import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { NextFunction, Request, Response } from 'express';

jest.mock('uuid', () => ({
  v4: () => '11111111-1111-4111-8111-111111111111',
}));

jest.mock('../src/schemas/user.schema', () => ({
  UserRole: {
    MANAGER: 'Manager',
    OPERATOR: 'Operator',
    QC_TECHNICIAN: 'Quality Control Technician',
    IT_ADMINISTRATOR: 'IT Administrator',
  },
}));

import { ImportExportOrderController } from '../src/import-export-order/import-export-order.controller';
import { ImportExportOrderService } from '../src/import-export-order/import-export-order.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/schemas/user.schema';
import { ImportExportOrderStatus } from '../src/schemas/import-export-order.schema';

const uploadDir = join(process.cwd(), 'uploads', 'import-export-orders');

class TestRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { role?: UserRole } }>();
    const role = req.user?.role;

    return role === UserRole.OPERATOR || role === UserRole.MANAGER;
  }
}

describe('US24 ImportExportOrder (e2e)', () => {
  type MockCreateDto = Record<string, unknown>;
  type MockRequester = { actor: string; role?: UserRole };
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
    getAll: jest.Mock;
    getWorklist: jest.Mock;
    getOne: jest.Mock;
    update: jest.Mock;
    addAttachment: jest.Mock;
    resolveScanCode: jest.Mock;
    confirm: jest.Mock;
    reject: jest.Mock;
  };

  let baselineUploadFiles = new Set<string>();

  beforeAll(async () => {
    mkdirSync(uploadDir, { recursive: true });
    baselineUploadFiles = new Set(readdirSync(uploadDir));

    service = {
      create: jest
        .fn()
        .mockImplementation((dto: MockCreateDto, requester: MockRequester) => ({
          ...dto,
          order_id: '11111111-1111-4111-8111-111111111111',
          status: ImportExportOrderStatus.PENDING_CONFIRMATION,
          created_by: requester.actor,
        })),
      getAll: jest.fn(),
      getWorklist: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
      getOne: jest.fn(),
      update: jest.fn(),
      addAttachment: jest.fn().mockResolvedValue({
        order_id: '11111111-1111-4111-8111-111111111111',
        attachments: [
          {
            original_name: 'invoice.pdf',
            mime_type: 'application/pdf',
          },
        ],
      }),
      resolveScanCode: jest.fn(),
      confirm: jest.fn().mockResolvedValue({
        order_id: '11111111-1111-4111-8111-111111111111',
        status: ImportExportOrderStatus.CONFIRMED,
      }),
      reject: jest.fn().mockResolvedValue({
        order_id: '11111111-1111-4111-8111-111111111111',
        status: ImportExportOrderStatus.REJECTED,
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ImportExportOrderController],
      providers: [
        {
          provide: ImportExportOrderService,
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
      const allowedRoles = new Set<string>([
        UserRole.OPERATOR,
        UserRole.MANAGER,
        UserRole.QC_TECHNICIAN,
        UserRole.IT_ADMINISTRATOR,
      ]);
      const role = allowedRoles.has(roleHeader ?? '')
        ? (roleHeader as UserRole)
        : UserRole.OPERATOR;

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

  it('Operator can create inbound pending order', async () => {
    const res = await request(app.getHttpServer())
      .post('/import-export-orders')
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .send({
        order_type: 'Inbound',
        warehouse_id: 'WH-01',
        items: [
          {
            material_id: 'MAT-001',
            quantity: 3,
            unit_of_measure: 'kg',
          },
        ],
      })
      .expect(201);

    const responseBody = res.body as { status?: string };
    expect(responseBody.status).toBe(
      ImportExportOrderStatus.PENDING_CONFIRMATION,
    );
    expect(service.create).toHaveBeenCalled();
  });

  it('Operator can create outbound pending order', async () => {
    const res = await request(app.getHttpServer())
      .post('/import-export-orders')
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .send({
        order_type: 'Outbound',
        warehouse_id: 'WH-01',
        items: [
          {
            material_id: 'MAT-001',
            lot_id: 'LOT-001',
            quantity: 2,
            unit_of_measure: 'kg',
          },
        ],
      })
      .expect(201);

    const responseBody = res.body as { status?: string };
    expect(responseBody.status).toBe(
      ImportExportOrderStatus.PENDING_CONFIRMATION,
    );
    expect(service.create).toHaveBeenCalledTimes(2);
  });

  it('Operator can upload a valid document attachment', async () => {
    await request(app.getHttpServer())
      .post(
        '/import-export-orders/11111111-1111-4111-8111-111111111111/attachments',
      )
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .field('source', 'upload')
      .attach('file', Buffer.from('%PDF-1.4\nfake-pdf'), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    expect(service.addAttachment).toHaveBeenCalled();
  });

  it('Operator can fetch pending worklist', async () => {
    await request(app.getHttpServer())
      .get('/import-export-orders/worklist?page=1&limit=20&order_type=Inbound')
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .expect(200);

    expect(service.getWorklist).toHaveBeenCalledWith(
      expect.objectContaining({
        order_type: 'Inbound',
      }),
      expect.objectContaining({ page: 1, limit: 20 }),
      expect.objectContaining({ actor: 'operator01' }),
    );
  });

  it('Operator can confirm an order', async () => {
    const orderId = '11111111-1111-4111-8111-111111111111';

    const res = await request(app.getHttpServer())
      .post(`/import-export-orders/${orderId}/confirm`)
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .send({
        confirmed_items: [
          {
            material_id: 'MAT-001',
            lot_id: '22222222-2222-4222-8222-222222222222',
            expected_quantity: 2,
            actual_quantity: 2,
            unit_of_measure: 'kg',
          },
        ],
        confirm_note: 'checked',
      })
      .expect(200);

    expect((res.body as { status?: string }).status).toBe(
      ImportExportOrderStatus.CONFIRMED,
    );
    expect(service.confirm).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({
        confirm_note: 'checked',
      }),
      expect.objectContaining({ actor: 'manager01' }),
    );
  });

  it('Operator can reject an order', async () => {
    const orderId = '11111111-1111-4111-8111-111111111111';

    const res = await request(app.getHttpServer())
      .post(`/import-export-orders/${orderId}/reject`)
      .set('x-user', 'manager01')
      .set('x-role', UserRole.MANAGER)
      .send({
        reason: 'Quantity mismatch',
      })
      .expect(200);

    expect((res.body as { status?: string }).status).toBe(
      ImportExportOrderStatus.REJECTED,
    );
    expect(service.reject).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({ reason: 'Quantity mismatch' }),
      expect.objectContaining({ actor: 'manager01' }),
    );
  });

  it('Attachment larger than 5MB is rejected', async () => {
    const bigPayload = Buffer.alloc(5 * 1024 * 1024 + 1, 0x61);

    await request(app.getHttpServer())
      .post(
        '/import-export-orders/11111111-1111-4111-8111-111111111111/attachments',
      )
      .set('x-user', 'operator01')
      .set('x-role', UserRole.OPERATOR)
      .field('source', 'upload')
      .attach('file', bigPayload, {
        filename: 'too-large.pdf',
        contentType: 'application/pdf',
      })
      .expect((res) => {
        expect([400, 413]).toContain(res.status);
      });
  });

  it('Non-allowed role is forbidden on create', async () => {
    await request(app.getHttpServer())
      .post('/import-export-orders')
      .set('x-user', 'qc01')
      .set('x-role', UserRole.QC_TECHNICIAN)
      .send({
        order_type: 'Inbound',
        warehouse_id: 'WH-01',
        items: [
          {
            material_id: 'MAT-001',
            quantity: 1,
            unit_of_measure: 'kg',
          },
        ],
      })
      .expect(403);
  });

  afterEach(() => {
    const currentFiles = new Set(readdirSync(uploadDir));
    for (const fileName of currentFiles) {
      if (!baselineUploadFiles.has(fileName)) {
        try {
          unlinkSync(join(uploadDir, fileName));
        } catch {
          // Best-effort cleanup for files generated by this test suite.
        }
      }
    }
  });
});
