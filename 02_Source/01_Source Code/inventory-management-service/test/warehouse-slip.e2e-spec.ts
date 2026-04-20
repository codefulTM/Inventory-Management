jest.mock('uuid', () => ({
  v4: () => '11111111-1111-4111-8111-111111111111',
}), { virtual: true });

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

import { WarehouseSlipController } from '../src/warehouse-slip/warehouse-slip.controller';
import { WarehouseSlipService } from '../src/warehouse-slip/warehouse-slip.service';
import { RolesGuard } from '../src/common/auth/roles.guard';

const uploadDir = join(process.cwd(), 'uploads', 'warehouse-slips');

describe('WarehouseSlipController (e2e)', () => {
  let app: INestApplication;
  let svc: any;

  const rolesGuardMock = { canActivate: jest.fn(() => true) };

  beforeAll(() => {
    mkdirSync(uploadDir, { recursive: true });
  });

  beforeEach(async () => {
    svc = {
      create: jest.fn().mockImplementation((dto, requester) => ({ ...dto, id: 'ws-1', created_by: requester?.actor })),
      getAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getOne: jest.fn().mockResolvedValue({ slip_number: 'SLIP-001', lines: [], attachments: [] }),
      approve: jest.fn().mockResolvedValue({ status: 'approved' }),
      reject: jest.fn().mockResolvedValue({ status: 'rejected' }),
      addAttachment: jest.fn().mockResolvedValue({ ok: true }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [WarehouseSlipController],
      providers: [{ provide: WarehouseSlipService, useValue: svc }],
    });

    moduleBuilder.overrideGuard(RolesGuard).useValue(rolesGuardMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    app = moduleFixture.createNestApplication();

    // lightweight user injector so toRequester can read x-user/x-role
    app.use((req: any, _res: any, next: any) => {
      const username = req.header('x-user') ?? 'e2e-user';
      const roleHeader = req.header('x-role');
      req.user = { username, role: roleHeader };
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    // cleanup generated uploads
    const current = new Set(readdirSync(uploadDir));
    for (const f of current) {
      try {
        unlinkSync(join(uploadDir, f));
      } catch {}
    }
  });

  it('POST /warehouse/slips creates a slip', async () => {
    const payload = { type: 'Inbound', warehouse_id: 'WH-1', lines: [] };
    const res = await request(app.getHttpServer())
      .post('/warehouse/slips')
      .set('x-user', 'operator01')
      .set('x-role', 'Operator')
      .send(payload)
      .expect(201);

    expect(svc.create).toHaveBeenCalled();
    expect(res.body).toHaveProperty('id', 'ws-1');
  });

  it('GET /warehouse/slips returns list and forwards filters', async () => {
    await request(app.getHttpServer())
      .get('/warehouse/slips?page=1&limit=10')
      .set('x-user', 'operator01')
      .set('x-role', 'Operator')
      .expect(200);

    expect(svc.getAll).toHaveBeenCalled();
  });

  it('POST /warehouse/slips/:id/attachments accepts file uploads', async () => {
    await request(app.getHttpServer())
      .post('/warehouse/slips/11111111-1111-4111-8111-111111111111/attachments')
      .set('x-user', 'operator01')
      .set('x-role', 'Operator')
      .field('source', 'upload')
      .attach('file', Buffer.from('%PDF-1.4\nfake-pdf'), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    expect(svc.addAttachment).toHaveBeenCalled();
  });

  it('GET /warehouse/slips/:id/print returns HTML', async () => {
    const res = await request(app.getHttpServer())
      .get('/warehouse/slips/11111111-1111-4111-8111-111111111111/print')
      .set('x-user', 'operator01')
      .set('x-role', 'Operator')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('SLIP-001');
  });

  it('POST /warehouse/slips/:id/approve and reject call service', async () => {
    await request(app.getHttpServer())
      .post('/warehouse/slips/11111111-1111-4111-8111-111111111111/approve')
      .set('x-user', 'manager01')
      .set('x-role', 'Manager')
      .expect(200);

    expect(svc.approve).toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/warehouse/slips/11111111-1111-4111-8111-111111111111/reject')
      .set('x-user', 'manager01')
      .set('x-role', 'Manager')
      .send({ reason: 'bad' })
      .expect(200);

    expect(svc.reject).toHaveBeenCalled();
  });
});
