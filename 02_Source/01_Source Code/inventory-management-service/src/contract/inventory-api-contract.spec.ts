/**
 * Contract tests — inventory-management-service REST API shapes
 *
 * Verifies that key HTTP endpoints return the exact shapes consumed by
 * the frontend and api-gateway. Uses NestJS testing HTTP app + supertest
 * with mocked service layer. No database required.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { InventoryLotController } from '../inventory-lot/inventory-lot.controller';
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { MaterialController } from '../material/material.controller';
import { MaterialService } from '../material/material.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { InventoryLotStatus } from '../inventory-lot/inventory-lot.dto';

// ── stubs ──────────────────────────────────────────────────────────────────

const sampleLot = {
  _id: 'mongo-id-001',
  lot_id: 'lot-uuid-001',
  material_id: 'MAT-001',
  manufacturer_name: 'ABC Pharma',
  manufacturer_lot: 'ML-2025-001',
  received_date: '2025-03-01T00:00:00.000Z',
  expiration_date: '2027-03-01T00:00:00.000Z',
  quantity: 500,
  unit_of_measure: 'kg',
  status: InventoryLotStatus.QUARANTINE,
};

const sampleMaterial = {
  _id: 'mongo-mat-001',
  material_id: 'MAT-001',
  part_number: 'PART-10001',
  material_name: 'Vitamin D3 100K',
  material_type: 'API',
};

const mockLotService = {
  create: jest.fn().mockResolvedValue(sampleLot),
  findAll: jest.fn().mockResolvedValue({ data: [sampleLot], total: 1 }),
  findByStatus: jest.fn().mockResolvedValue({ data: [sampleLot], total: 1 }),
  findById: jest.fn().mockResolvedValue(sampleLot),
  update: jest.fn().mockResolvedValue(sampleLot),
  updateStatus: jest.fn().mockResolvedValue({ ...sampleLot, status: InventoryLotStatus.ACCEPTED }),
  delete: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  search: jest.fn().mockResolvedValue({ data: [sampleLot], total: 1 }),
  bulkQuarantine: jest.fn().mockResolvedValue([sampleLot]),
  getExpirationAlerts: jest.fn().mockResolvedValue([]),
  getLotTransactionHistory: jest.fn().mockResolvedValue([]),
  findByMaterial: jest.fn().mockResolvedValue({ data: [sampleLot], total: 1 }),
};

const mockMaterialService = {
  create: jest.fn().mockResolvedValue(sampleMaterial),
  findAll: jest.fn().mockResolvedValue({ data: [sampleMaterial], total: 1 }),
  findById: jest.fn().mockResolvedValue(sampleMaterial),
  update: jest.fn().mockResolvedValue(sampleMaterial),
  delete: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  search: jest.fn().mockResolvedValue({ data: [sampleMaterial], total: 1 }),
  filterByType: jest.fn().mockResolvedValue({ data: [sampleMaterial], total: 1 }),
  getDistinctTypes: jest.fn().mockResolvedValue(['API', 'Excipient']),
};

const guardAllow = { canActivate: jest.fn(() => true) };

async function buildApp(...extraProviders: any[]): Promise<INestApplication> {
  const testModule: TestingModule = await Test.createTestingModule({
    controllers: [InventoryLotController, MaterialController],
    providers: [
      { provide: InventoryLotService, useValue: mockLotService },
      { provide: MaterialService, useValue: mockMaterialService },
      ...extraProviders,
    ],
  })
    .overrideGuard(JwtAuthGuard).useValue(guardAllow)
    .overrideGuard(RolesGuard).useValue(guardAllow)
    .compile();

  const app = testModule.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('inventory-management-service REST API contract', () => {
  let app: INestApplication;

  beforeAll(async () => { app = await buildApp(); });
  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ── GET /inventory-lots ───────────────────────────────────────────────

  describe('GET /inventory-lots', () => {
    it('returns paginated list with data[] and total', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory-lots')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
    });

    it('accepts status filter — routes to findByStatus', async () => {
      await request(app.getHttpServer())
        .get('/inventory-lots')
        .query({ status: 'Quarantine' })
        .expect(200);

      expect(mockLotService.findByStatus).toHaveBeenCalledWith(
        'Quarantine', 1, 10,
      );
    });

    it('passes page and limit as integers', async () => {
      await request(app.getHttpServer())
        .get('/inventory-lots')
        .query({ page: '2', limit: '25' })
        .expect(200);

      expect(mockLotService.findAll).toHaveBeenCalledWith(2, 25);
    });
  });

  // ── POST /inventory-lots ──────────────────────────────────────────────

  describe('POST /inventory-lots', () => {
    it('returns 201 with the created lot shape', async () => {
      const payload = {
        lot_id: 'lot-uuid-test',
        material_id: 'MAT-001',
        manufacturer_name: 'ABC Pharma',
        manufacturer_lot: 'ML-2025-001',
        received_date: '2025-03-01',
        expiration_date: '2027-03-01',
        quantity: 500,
        unit_of_measure: 'kg',
        status: 'Quarantine',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory-lots')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('lot_id');
      expect(response.body).toHaveProperty('material_id');
      expect(response.body).toHaveProperty('status');
    });
  });

  // ── GET /inventory-lots/:id ──────────────────────────────────────────

  describe('GET /inventory-lots/:id', () => {
    it('returns a single lot with all required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory-lots/lot-uuid-001')
        .expect(200);

      expect(response.body).toHaveProperty('lot_id', 'lot-uuid-001');
      expect(response.body).toHaveProperty('quantity');
      expect(response.body).toHaveProperty('status');
    });
  });

  // ── PUT /inventory-lots/:id/status ────────────────────────────────────

  describe('PUT /inventory-lots/:id/status/:status', () => {
    it('returns updated lot with new status', async () => {
      const response = await request(app.getHttpServer())
        .put('/inventory-lots/lot-uuid-001/status/Accepted')
        .expect(200);

      expect(response.body).toHaveProperty('status', InventoryLotStatus.ACCEPTED);
    });
  });

  // ── GET /materials ────────────────────────────────────────────────────

  describe('GET /materials', () => {
    it('returns paginated list with data[] and total', async () => {
      const response = await request(app.getHttpServer())
        .get('/materials')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
    });

    it('GET /materials/search?q= routes to search', async () => {
      await request(app.getHttpServer())
        .get('/materials/search')
        .query({ q: 'Vitamin' })
        .expect(200);

      expect(mockMaterialService.search).toHaveBeenCalledWith('Vitamin', 1, 20);
    });

    it('GET /materials/type/:type routes to filterByType', async () => {
      await request(app.getHttpServer())
        .get('/materials/type/API')
        .expect(200);

      expect(mockMaterialService.filterByType).toHaveBeenCalledWith('API', 1, 20);
    });
  });

  // ── POST /materials ───────────────────────────────────────────────────

  describe('POST /materials', () => {
    it('returns 201 with material shape: material_id, part_number, material_name, material_type', async () => {
      const payload = {
        material_id: 'MAT-001',
        part_number: 'PART-10001',
        material_name: 'Vitamin D3 100K',
        material_type: 'API',
      };

      const response = await request(app.getHttpServer())
        .post('/materials')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('material_id');
      expect(response.body).toHaveProperty('part_number');
      expect(response.body).toHaveProperty('material_name');
      expect(response.body).toHaveProperty('material_type');
    });
  });

});
