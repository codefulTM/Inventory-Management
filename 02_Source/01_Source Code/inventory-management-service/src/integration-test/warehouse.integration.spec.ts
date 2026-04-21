/**
 * Integration tests for WarehouseService
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';

import { WarehouseService } from '../warehouse/warehouse.service';
import { WarehouseRepository } from '../warehouse/warehouse.repository';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import { RedisIdService } from '../redis-id/redis-id.service';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;
let testModule: TestingModule;
let warehouseService: WarehouseService;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  testModule = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([
        { name: Warehouse.name, schema: WarehouseSchema },
      ]),
    ],
    providers: [
      WarehouseService,
      WarehouseRepository,
      { provide: RedisIdService, useValue: { nextId: jest.fn().mockResolvedValue('WH-1') } },
    ],
  }).compile();

  warehouseService = testModule.get<WarehouseService>(WarehouseService);
});

afterAll(async () => {
  await testModule.close();
  await mongod.stop();
});

afterEach(async () => {
  const model = testModule.get<Model<Warehouse>>(getModelToken(Warehouse.name));
  await model.deleteMany({});
});

describe('WarehouseService (integration)', () => {
  it('creates, retrieves, updates and deletes a warehouse', async () => {
    const dto = {
      warehouse_id: 'WH-1',
      warehouse_name: 'Main Warehouse',
      description: 'Primary',
      is_active: true,
    } as any;

    const created = await warehouseService.create(dto);
    expect(created.warehouse_id).toBe('WH-1');

    const all = await warehouseService.findAll(1, 10);
    expect(all.data.length).toBe(1);

    const found = await warehouseService.findById(created._id);
    expect(found.warehouse_name).toBe('Main Warehouse');

    const updated = await warehouseService.update(created._id, {
      warehouse_name: 'Updated Name',
    } as any);
    expect(updated.warehouse_name).toBe('Updated Name');

    const res = await warehouseService.delete(created._id);
    expect(res.message).toContain('deleted successfully');
  });

  it('throws conflict when creating duplicate warehouse_id', async () => {
    const dto = { warehouse_id: 'WH-2', warehouse_name: 'W2' } as any;
    await warehouseService.create(dto);
    await expect(warehouseService.create(dto)).rejects.toThrow();
  });
});
