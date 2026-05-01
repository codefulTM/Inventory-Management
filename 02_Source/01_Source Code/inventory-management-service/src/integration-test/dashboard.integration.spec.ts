/**
 * Integration tests for DashboardService
 * - Uses mongodb-memory-server like other integration tests
 * - Verifies getSummary, getTrends, getDrilldown behaviors
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';

import { DashboardService } from '../dashboard/dashboard.service';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import {
  WarehouseSlip,
  WarehouseSlipSchema,
} from '../schemas/warehouse-slip.schema';
import { Material, MaterialSchema } from '../schemas/material.schema';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';

import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { InventoryTransactionRepository } from '../inventory-transaction/inventory-transaction.repository';
import { WarehouseSlipRepository } from '../warehouse-slip/warehouse-slip.repository';
import { MaterialRepository } from '../material/material.repository';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;
let testModule: TestingModule;
let dashboardService: DashboardService;
let lotRepo: InventoryLotRepository;
let txRepo: InventoryTransactionRepository;
let slipRepo: WarehouseSlipRepository;
let materialRepo: MaterialRepository;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  testModule = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([
        { name: InventoryLot.name, schema: InventoryLotSchema },
        { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
        { name: WarehouseSlip.name, schema: WarehouseSlipSchema },
        { name: Material.name, schema: MaterialSchema },
        { name: Warehouse.name, schema: WarehouseSchema },
      ]),
    ],
    providers: [
      DashboardService,
      InventoryLotRepository,
      InventoryTransactionRepository,
      WarehouseSlipRepository,
      MaterialRepository,
    ],
  }).compile();

  dashboardService = testModule.get<DashboardService>(DashboardService);
  lotRepo = testModule.get<InventoryLotRepository>(InventoryLotRepository);
  txRepo = testModule.get<InventoryTransactionRepository>(
    InventoryTransactionRepository,
  );
  slipRepo = testModule.get<WarehouseSlipRepository>(WarehouseSlipRepository);
  materialRepo = testModule.get<MaterialRepository>(MaterialRepository);
});

afterAll(async () => {
  await testModule.close();
  await mongod.stop();
});

afterEach(async () => {
  const materialModel = testModule.get<Model<Material>>(
    getModelToken(Material.name),
  );
  const lotModel = testModule.get<Model<InventoryLot>>(
    getModelToken(InventoryLot.name),
  );
  const txModel = testModule.get<Model<InventoryTransaction>>(
    getModelToken(InventoryTransaction.name),
  );
  const slipModel = testModule.get<Model<WarehouseSlip>>(
    getModelToken(WarehouseSlip.name),
  );
  await Promise.all([
    materialModel.deleteMany({}),
    lotModel.deleteMany({}),
    txModel.deleteMany({}),
    slipModel.deleteMany({}),
  ]);
});

describe('DashboardService (integration)', () => {
  it('getSummary computes totals and top materials', async () => {
    // Create materials
    await materialRepo.create({
      material_id: 'MAT-001',
      part_number: 'P-001',
      material_name: 'Material A',
      material_type: 'API',
    } as any);
    await materialRepo.create({
      material_id: 'MAT-002',
      part_number: 'P-002',
      material_name: 'Material B',
      material_type: 'Excipient',
    } as any);

    // Create lots
    await lotRepo.create({
      lot_id: 'LOT-1',
      material_id: 'MAT-001',
      manufacturer_name: 'Maker',
      manufacturer_lot: 'ML1',
      received_date: new Date('2025-01-01'),
      expiration_date: new Date('2027-01-01'),
      quantity: 100,
      unit_of_measure: 'kg',
      status: 'Quarantine',
      warehouse_id: 'WH-1',
    } as any);

    await lotRepo.create({
      lot_id: 'LOT-2',
      material_id: 'MAT-002',
      manufacturer_name: 'Maker',
      manufacturer_lot: 'ML2',
      received_date: new Date('2025-01-01'),
      expiration_date: new Date('2027-01-01'),
      quantity: 50,
      unit_of_measure: 'kg',
      status: 'Quarantine',
      warehouse_id: 'WH-1',
    } as any);

    // Create confirmed slips with lines that reference lot and have unit_price
    await slipRepo.create({
      slip_id: 'SLIP-ID-1',
      slip_number: 'SLIP-1',
      type: 'IN',
      warehouse_id: 'WH-1',
      status: 'CONFIRMED',
      confirmed_at: new Date(),
      lines: [
        {
          material_id: 'MAT-001',
          lot_id: 'LOT-1',
          quantity: 100,
          unit_price: 10,
        },
      ],
    } as any);

    await slipRepo.create({
      slip_id: 'SLIP-ID-2',
      slip_number: 'SLIP-2',
      type: 'IN',
      warehouse_id: 'WH-1',
      status: 'CONFIRMED',
      confirmed_at: new Date(),
      lines: [
        {
          material_id: 'MAT-002',
          lot_id: 'LOT-2',
          quantity: 50,
          unit_price: 20,
        },
      ],
    } as any);

    // Create transactions for top materials aggregation
    await txRepo.create({
      transaction_id: 'TX-1',
      lot_id: 'LOT-1',
      transaction_type: 'Receipt',
      quantity: 80,
      unit_of_measure: 'kg',
      transaction_date: new Date(),
      performed_by: 'tester',
    } as any);

    await txRepo.create({
      transaction_id: 'TX-2',
      lot_id: 'LOT-2',
      transaction_type: 'Receipt',
      quantity: 40,
      unit_of_measure: 'kg',
      transaction_date: new Date(),
      performed_by: 'tester',
    } as any);

    const summary = await dashboardService.getSummary({});

    expect(summary.total_quantity).toBe(150); // 100 + 50
    expect(summary.total_value).toBe(2000); // LOT-1:100*10 + LOT-2:50*20

    expect(summary.top_materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ material_id: 'MAT-001', total_quantity: 80 }),
        expect.objectContaining({ material_id: 'MAT-002', total_quantity: 40 }),
      ]),
    );
  });

  it('getTrends aggregates transactions by day', async () => {
    const d = new Date('2026-04-20T00:00:00Z');

    await txRepo.create({
      transaction_id: 'T-IN-1',
      lot_id: 'LOT-1',
      transaction_type: 'Receipt',
      quantity: 10,
      unit_of_measure: 'kg',
      transaction_date: d,
      performed_by: 'tester',
    } as any);

    await txRepo.create({
      transaction_id: 'T-IN-2',
      lot_id: 'LOT-1',
      transaction_type: 'Receipt',
      quantity: 15,
      unit_of_measure: 'kg',
      transaction_date: d,
      performed_by: 'tester',
    } as any);

    const rows = await dashboardService.getTrends({
      metric: 'in',
      from: '2026-04-19',
      to: '2026-04-21',
      interval: 'day',
    });

    // Expect one period '2026-04-20' with total_quantity 25
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ period: '2026-04-20', total_quantity: 25 }),
      ]),
    );
  });

  it('getDrilldown filters by materialId and paginates', async () => {
    // Create lot and transactions
    await lotRepo.create({
      lot_id: 'DL-LOT-1',
      material_id: 'MAT-DL',
      manufacturer_name: 'X',
      manufacturer_lot: 'DL1',
      received_date: new Date('2025-01-01'),
      expiration_date: new Date('2027-01-01'),
      quantity: 20,
      unit_of_measure: 'kg',
      status: 'Quarantine',
    } as any);

    // create three transactions for the lot
    await txRepo.create({
      transaction_id: 'DL-TX-1',
      lot_id: 'DL-LOT-1',
      transaction_type: 'Receipt',
      quantity: 1,
      unit_of_measure: 'kg',
      transaction_date: new Date(),
      performed_by: 'u',
    } as any);
    await txRepo.create({
      transaction_id: 'DL-TX-2',
      lot_id: 'DL-LOT-1',
      transaction_type: 'Receipt',
      quantity: 2,
      unit_of_measure: 'kg',
      transaction_date: new Date(),
      performed_by: 'u',
    } as any);
    await txRepo.create({
      transaction_id: 'DL-TX-3',
      lot_id: 'DL-LOT-1',
      transaction_type: 'Receipt',
      quantity: 3,
      unit_of_measure: 'kg',
      transaction_date: new Date(),
      performed_by: 'u',
    } as any);

    const res = await dashboardService.getDrilldown({
      materialId: 'MAT-DL',
      page: 1,
      limit: 10,
    });

    expect(res.total).toBeGreaterThanOrEqual(3);
    expect(res.items.length).toBeGreaterThanOrEqual(3);
  });
});
