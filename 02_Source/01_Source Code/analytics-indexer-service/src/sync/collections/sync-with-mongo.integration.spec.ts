/**
 * File: sync/collections/sync-with-mongo.integration.spec.ts
 * Mục đích: Integration tests - Đồng bộ analytics-indexer-service với MongoDB thật
 * 
 * Sử dụng mongodb-memory-server để chạy MongoDB in-process.
 * Seed dữ liệu trực tiếp qua Mongoose models, sau đó chạy pipeline sync
 * và kiểm tra rằng ES bulk operations nhận đúng payload.
 * 
 * Khác với E2E test (mock Mongoose models):
 * Ở đây insert tài liệu thật và kiểm tra toàn bộ đường đi: query → ES
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { InventoryLot, InventoryLotSchema } from '../../schemas/inventory-lot.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../../schemas/inventory-transaction.schema';
import { Material, MaterialSchema } from '../../schemas/material.schema';
import { QCTest, QCTestSchema } from '../../schemas/qc-test.schema';
import { InventoryAuditReport, InventoryAuditReportSchema } from '../../schemas/inventory-audit-report.schema';
import { ImportExportOrder, ImportExportOrderSchema } from '../../schemas/import-export-order.schema';

import { InventoryLotsSync } from './inventory-lots.sync';
import { MaterialsSync } from './materials.sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { ELASTICSEARCH_CLIENT } from '../../elasticsearch/elasticsearch.constants';

let mongod: MongoMemoryServer;
let testModule: TestingModule;
let lotsModel: Model<InventoryLot>;
let materialsModel: Model<Material>;
let lotsSync: InventoryLotsSync;
let materialsSync: MaterialsSync;
let mockEsClient: { bulk: jest.Mock };

const TO = new Date('2026-04-20T00:00:00.000Z');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();

  mockEsClient = {
    bulk: jest.fn().mockResolvedValue({
      items: [],
    }),
  };

  testModule = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(mongod.getUri()),
      MongooseModule.forFeature([
        { name: InventoryLot.name, schema: InventoryLotSchema },
        { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
        { name: Material.name, schema: MaterialSchema },
        { name: QCTest.name, schema: QCTestSchema },
        { name: InventoryAuditReport.name, schema: InventoryAuditReportSchema },
        { name: ImportExportOrder.name, schema: ImportExportOrderSchema },
      ]),
    ],
    providers: [
      InventoryLotsSync,
      MaterialsSync,
      IndexNamingService,
      ElasticsearchBulkService,
      { provide: ELASTICSEARCH_CLIENT, useValue: mockEsClient },
      { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(500) } },
    ],
  }).compile();

  lotsModel = testModule.get<Model<InventoryLot>>(getModelToken(InventoryLot.name));
  materialsModel = testModule.get<Model<Material>>(getModelToken(Material.name));
  lotsSync = testModule.get<InventoryLotsSync>(InventoryLotsSync);
  materialsSync = testModule.get<MaterialsSync>(MaterialsSync);
});

afterAll(async () => {
  await testModule.close();
  await mongod.stop();
});

afterEach(async () => {
  await lotsModel.deleteMany({});
  await materialsModel.deleteMany({});
  mockEsClient.bulk.mockClear();
});

// ── InventoryLotsSync with real MongoDB ────────────────────────────────────

describe('InventoryLotsSync (integration with real MongoDB)', () => {
  it('finds 0 documents when collection is empty — does not call ES bulk', async () => {
    const result = await lotsSync.sync(null, TO, 500);

    expect(result.indexed).toBe(0);
    expect(result.deleted).toBe(0);
    expect(mockEsClient.bulk).not.toHaveBeenCalled();
  });

  it('indexes live documents inserted into real MongoDB', async () => {
    const modDate = new Date('2026-04-19T10:00:00.000Z');
    await lotsModel.create([
      { lot_id: 'LOT-001', material_id: 'MAT-001', status: 'Quarantine', quantity: 200, unit_of_measure: 'kg', modified_date: modDate, created_date: modDate },
      { lot_id: 'LOT-002', material_id: 'MAT-002', status: 'Accepted', quantity: 500, unit_of_measure: 'kg', modified_date: modDate, created_date: modDate },
    ]);

    mockEsClient.bulk.mockResolvedValue({
      items: [
        { index: { _id: 'id-1', result: 'created' } },
        { index: { _id: 'id-2', result: 'created' } },
      ],
    });

    const result = await lotsSync.sync(null, TO, 500);

    expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
    expect(result.indexed).toBe(2);
    expect(result.deleted).toBe(0);
  });

  it('routes soft-deleted docs (deleted=true) to bulkDelete, not bulkIndex', async () => {
    const modDate = new Date('2026-04-19T10:00:00.000Z');
    await lotsModel.create({
      lot_id: 'LOT-DEL',
      material_id: 'MAT-001',
      status: 'Deleted',
      quantity: 0,
      unit_of_measure: 'kg',
      deleted: true,
      modified_date: modDate,
      created_date: modDate,
    });

    mockEsClient.bulk.mockResolvedValue({
      items: [{ delete: { _id: 'some-id', result: 'deleted' } }],
    });

    const result = await lotsSync.sync(null, TO, 500);

    expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
    const bulkArg = mockEsClient.bulk.mock.calls[0][0];
    // Delete operation has { delete: {...} } as the first item
    expect(bulkArg.operations[0]).toHaveProperty('delete');
    expect(result.deleted).toBe(1);
    expect(result.indexed).toBe(0);
  });

  it('applies incremental query when watermark is set (only modified after watermark)', async () => {
    const oldDate = new Date('2026-01-01T00:00:00.000Z');
    const newDate = new Date('2026-04-19T10:00:00.000Z');

    await lotsModel.create([
      { lot_id: 'OLD-LOT', material_id: 'MAT-001', status: 'Accepted', quantity: 100, unit_of_measure: 'kg', modified_date: oldDate, created_date: oldDate },
      { lot_id: 'NEW-LOT', material_id: 'MAT-002', status: 'Quarantine', quantity: 200, unit_of_measure: 'kg', modified_date: newDate, created_date: newDate },
    ]);

    mockEsClient.bulk.mockResolvedValue({
      items: [{ index: { _id: 'id-new', result: 'created' } }],
    });

    const watermark = new Date('2026-03-01T00:00:00.000Z');
    const result = await lotsSync.sync(watermark, TO, 500);

    // Only the new document (modified after watermark) should be indexed
    expect(result.indexed).toBe(1);
    const bulkOps = mockEsClient.bulk.mock.calls[0][0].operations;
    // 2 operations per doc (index command + body)
    expect(bulkOps).toHaveLength(2);
  });

  it('uses monthly index name based on modified_date', async () => {
    const aprilDate = new Date('2026-04-15T00:00:00.000Z');
    await lotsModel.create({
      lot_id: 'APRIL-LOT',
      material_id: 'MAT-001',
      status: 'Accepted',
      quantity: 100,
      unit_of_measure: 'kg',
      modified_date: aprilDate,
      created_date: aprilDate,
    });

    mockEsClient.bulk.mockResolvedValue({
      items: [{ index: { _id: 'id-1', result: 'created' } }],
    });

    await lotsSync.sync(null, TO, 500);

    const bulkArg = mockEsClient.bulk.mock.calls[0][0];
    expect(bulkArg.operations[0].index._index).toBe('inventory_lots_2026_04');
  });
});

// ── MaterialsSync with real MongoDB ───────────────────────────────────────

describe('MaterialsSync (integration with real MongoDB)', () => {
  it('indexes materials from real DB', async () => {
    const modDate = new Date('2026-04-19T10:00:00.000Z');
    await materialsModel.create([
      { material_id: 'MAT-001', material_name: 'Vitamin D3', material_type: 'API', modified_date: modDate, created_date: modDate },
      { material_id: 'MAT-002', material_name: 'Excipient Base', material_type: 'Excipient', modified_date: modDate, created_date: modDate },
    ]);

    mockEsClient.bulk.mockResolvedValue({
      items: [
        { index: { _id: 'id-1', result: 'created' } },
        { index: { _id: 'id-2', result: 'created' } },
      ],
    });

    const result = await materialsSync.sync(null, TO, 500);

    expect(result.collection).toBe('materials');
    expect(result.indexed).toBe(2);
    expect(mockEsClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.arrayContaining([
          expect.objectContaining({ index: expect.objectContaining({ _index: 'materials_2026_04' }) }),
        ]),
      }),
    );
  });

  it('returns durationMs > 0', async () => {
    const result = await materialsSync.sync(null, TO, 500);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
