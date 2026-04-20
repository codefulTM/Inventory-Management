/**
 * Integration tests for ReportsRepository
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';

import { ReportsRepository } from '../reports/repositories/reports.repository';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import { QCTest, QCTestSchema } from '../schemas/qc-test.schema';
import { AuditLog, AuditLogSchema } from '../audit-log/audit-log.schema';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;
let testModule: TestingModule;
let reportsRepo: ReportsRepository;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  testModule = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([
        { name: InventoryLot.name, schema: InventoryLotSchema },
        { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
        { name: QCTest.name, schema: QCTestSchema },
        { name: AuditLog.name, schema: AuditLogSchema },
      ]),
    ],
    providers: [ReportsRepository],
  }).compile();

  reportsRepo = testModule.get<ReportsRepository>(ReportsRepository);
});

afterAll(async () => {
  await testModule.close();
  await mongod.stop();
});

afterEach(async () => {
  const lotModel = testModule.get<Model<InventoryLot>>(
    getModelToken(InventoryLot.name),
  );
  const txModel = testModule.get<Model<InventoryTransaction>>(
    getModelToken(InventoryTransaction.name),
  );
  const qcModel = testModule.get<Model<QCTest>>(getModelToken(QCTest.name));
  const auditModel = testModule.get<Model<AuditLog>>(
    getModelToken(AuditLog.name),
  );
  await Promise.all([
    lotModel.deleteMany({}),
    txModel.deleteMany({}),
    qcModel.deleteMany({}),
    auditModel.deleteMany({}),
  ]);
});

describe('ReportsRepository (integration)', () => {
  it('getInventoryStatus returns lot summaries', async () => {
    const lotModel = testModule.get<Model<InventoryLot>>(
      getModelToken(InventoryLot.name),
    );
    await lotModel.create({
      lot_id: 'L1',
      material_id: 'MAT-1',
      manufacturer_name: 'X',
      manufacturer_lot: 'M1',
      received_date: new Date(),
      expiration_date: new Date('2026-12-31'),
      quantity: 10,
      unit_of_measure: 'kg',
      status: 'Quarantine',
    });
    await lotModel.create({
      lot_id: 'L2',
      material_id: 'MAT-2',
      manufacturer_name: 'Y',
      manufacturer_lot: 'M2',
      received_date: new Date(),
      expiration_date: new Date('2026-10-01'),
      quantity: 5,
      unit_of_measure: 'kg',
      status: 'Accepted',
    });

    const rows = await reportsRepo.getInventoryStatus();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.lot_id === 'L1')?.material_id).toBe('MAT-1');
  });

  it('getMaterialUsage aggregates transactions by material', async () => {
    const txModel = testModule.get<Model<InventoryTransaction>>(
      getModelToken(InventoryTransaction.name),
    );
    // Create transactions for two different lots with same material
    await txModel.create({
      transaction_id: 'T1',
      lot_id: 'LA',
      transaction_type: 'Usage',
      quantity: 2,
      unit_of_measure: 'kg',
      transaction_date: new Date('2026-01-01'),
      performed_by: 'u',
    });
    await txModel.create({
      transaction_id: 'T2',
      lot_id: 'LB',
      transaction_type: 'Usage',
      quantity: 3,
      unit_of_measure: 'kg',
      transaction_date: new Date('2026-01-02'),
      performed_by: 'u',
    });

    // Insert lots linking LA->MAT-A and LB->MAT-B
    const lotModel = testModule.get<Model<InventoryLot>>(
      getModelToken(InventoryLot.name),
    );
    await lotModel.create({
      lot_id: 'LA',
      material_id: 'MAT-A',
      manufacturer_name: 'X',
      manufacturer_lot: 'LA',
      received_date: new Date(),
      expiration_date: new Date('2026-12-31'),
      quantity: 10,
      unit_of_measure: 'kg',
      status: 'Accepted',
    });
    await lotModel.create({
      lot_id: 'LB',
      material_id: 'MAT-B',
      manufacturer_name: 'X',
      manufacturer_lot: 'LB',
      received_date: new Date(),
      expiration_date: new Date('2026-12-31'),
      quantity: 5,
      unit_of_measure: 'kg',
      status: 'Accepted',
    });

    const usage = await reportsRepo.getMaterialUsage();
    // Should contain aggregated rows; check that material ids appear
    expect(usage.some((u) => u.material_id === 'MAT-A')).toBeTruthy();
    expect(usage.some((u) => u.material_id === 'MAT-B')).toBeTruthy();
  });

  it('getQcPerformance computes approved/rejected and quality_rate', async () => {
    const qcModel = testModule.get<Model<QCTest>>(getModelToken(QCTest.name));
    const lotModel = testModule.get<Model<InventoryLot>>(
      getModelToken(InventoryLot.name),
    );

    // Create lots with supplier_name
    await lotModel.create({
      lot_id: 'LQ1',
      material_id: 'M1',
      supplier_name: 'S1',
      manufacturer_name: 'X',
      manufacturer_lot: 'x1',
      received_date: new Date(),
      expiration_date: new Date(),
      quantity: 1,
      unit_of_measure: 'kg',
      status: 'Accepted',
    } as any);
    await lotModel.create({
      lot_id: 'LQ2',
      material_id: 'M2',
      supplier_name: 'S2',
      manufacturer_name: 'Y',
      manufacturer_lot: 'y1',
      received_date: new Date(),
      expiration_date: new Date(),
      quantity: 1,
      unit_of_measure: 'kg',
      status: 'Accepted',
    } as any);

    await qcModel.create({
      test_id: 'Q1',
      lot_id: 'LQ1',
      test_type: 'Identity',
      test_method: 'm',
      test_date: new Date(),
      test_result: 'ok',
      result_status: 'Pass',
      performed_by: 'a',
    } as any);
    await qcModel.create({
      test_id: 'Q2',
      lot_id: 'LQ1',
      test_type: 'Identity',
      test_method: 'm',
      test_date: new Date(),
      test_result: 'nok',
      result_status: 'Fail',
      performed_by: 'a',
    } as any);
    await qcModel.create({
      test_id: 'Q3',
      lot_id: 'LQ2',
      test_type: 'Identity',
      test_method: 'm',
      test_date: new Date(),
      test_result: 'ok',
      result_status: 'Pass',
      performed_by: 'a',
    } as any);

    const perf = await reportsRepo.getQcPerformance();
    expect(perf.length).toBeGreaterThanOrEqual(1);
    expect(
      perf.find((p) => p.supplier_name === 'S1')?.approved,
    ).toBeGreaterThanOrEqual(1);
  });

  it('getAuditTrail returns mapped audit logs', async () => {
    const auditModel = testModule.get<Model<AuditLog>>(
      getModelToken(AuditLog.name),
    );
    await auditModel.create({
      username: 'u1',
      action: 'INVENTORY_LOT_UPDATED',
      details: { lot_id: 'L1' },
      timestamp: new Date(),
    } as any);

    const rows = await reportsRepo.getAuditTrail();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].performed_by).toBe('u1');
  });
});
