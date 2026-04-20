import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { WarehouseHierarchyService } from './warehouse-hierarchy.service';
import { WarehouseLocation } from '../schemas/warehouse-location.schema';
import { InventoryLot } from '../schemas/inventory-lot.schema';

const makeLocation = (overrides: Record<string, any> = {}) => ({
  location_code: 'WH001',
  location_name: 'Main Warehouse',
  level: 'warehouse',
  is_active: true,
  capacity: 10000,
  notes: '',
  ...overrides,
});

const makeFindChain = (result: any[]) => ({
  find: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  }),
});

let service: WarehouseHierarchyService;
let locationModel: any;
let inventoryLotModel: any;

beforeEach(async () => {
  const findChain = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  locationModel = {
    find: jest.fn().mockReturnValue(findChain),
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    }),
    insertMany: jest.fn().mockResolvedValue([]),
    _findChain: findChain,
  };

  inventoryLotModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WarehouseHierarchyService,
      { provide: getModelToken(WarehouseLocation.name), useValue: locationModel },
      { provide: getModelToken(InventoryLot.name), useValue: inventoryLotModel },
    ],
  }).compile();

  service = module.get<WarehouseHierarchyService>(WarehouseHierarchyService);
});

// ── getWarehouseHierarchy ──────────────────────────────────────────────────

describe('getWarehouseHierarchy', () => {
  it('returns empty array when no warehouses found', async () => {
    locationModel._findChain.exec.mockResolvedValue([]);

    const result = await service.getWarehouseHierarchy();

    expect(result).toEqual([]);
  });

  it('builds hierarchy nodes for each warehouse', async () => {
    const warehouse = makeLocation();
    // find() calls: root warehouses, then children (empty), then grandchildren (empty)
    locationModel._findChain.exec.mockResolvedValue([]);
    locationModel._findChain.exec.mockResolvedValueOnce([warehouse]);

    // getLocationInventoryCount calls findOne to verify location exists
    locationModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(warehouse),
    });

    inventoryLotModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ totalQuantity: 50 }]),
    });

    const result = await service.getWarehouseHierarchy();

    expect(result).toHaveLength(1);
    expect(result[0].location_code).toBe('WH001');
    expect(result[0].quantity).toBe(50);
    expect(result[0].children).toEqual([]);
  });
});

// ── getLocationInventoryCount ──────────────────────────────────────────────

describe('getLocationInventoryCount', () => {
  it('returns 0 when no inventory lots at location', async () => {
    locationModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(makeLocation()),
    });
    locationModel._findChain.exec.mockResolvedValue([]);
    inventoryLotModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    const count = await service.getLocationInventoryCount('WH001');

    expect(count).toBe(0);
  });

  it('returns summed quantity from aggregate', async () => {
    locationModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(makeLocation()),
    });
    locationModel._findChain.exec.mockResolvedValue([]);
    inventoryLotModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ totalQuantity: 250 }]),
    });

    const count = await service.getLocationInventoryCount('WH001');

    expect(count).toBe(250);
  });

  it('throws NotFoundException when location does not exist', async () => {
    locationModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.getLocationInventoryCount('INVALID')).rejects.toThrow(NotFoundException);
  });
});

// ── updateLocationNotes ────────────────────────────────────────────────────

describe('updateLocationNotes', () => {
  it('updates notes and returns updated location', async () => {
    const updated = makeLocation({ notes: 'Cold storage area' });
    locationModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    const result = await service.updateLocationNotes('WH001', 'Cold storage area');

    expect(result.notes).toBe('Cold storage area');
    expect(locationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { location_code: 'WH001' },
      expect.objectContaining({ notes: 'Cold storage area' }),
      { new: true },
    );
  });

  it('throws NotFoundException when location does not exist', async () => {
    locationModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.updateLocationNotes('INVALID', 'note')).rejects.toThrow(NotFoundException);
  });
});

// ── getLocationDetails ─────────────────────────────────────────────────────

describe('getLocationDetails', () => {
  it('returns location with current_inventory and capacity_percentage', async () => {
    const loc = makeLocation({ capacity: 1000 });
    locationModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(loc),
    });
    locationModel._findChain.exec.mockResolvedValue([]);
    inventoryLotModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ totalQuantity: 500 }]),
    });

    const result = await service.getLocationDetails('WH001');

    expect(result['current_inventory']).toBe(500);
    expect(result['capacity_percentage']).toBe(50);
  });

  it('omits capacity_percentage when capacity is 0', async () => {
    const loc = makeLocation({ capacity: 0 });
    locationModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(loc),
    });
    locationModel._findChain.exec.mockResolvedValue([]);
    inventoryLotModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    const result = await service.getLocationDetails('WH001');

    expect(result['capacity_percentage']).toBeUndefined();
  });

  it('throws NotFoundException when location does not exist', async () => {
    locationModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.getLocationDetails('INVALID')).rejects.toThrow(NotFoundException);
  });
});

// ── initializeExampleHierarchy ─────────────────────────────────────────────

describe('initializeExampleHierarchy', () => {
  it('skips initialization when locations already exist', async () => {
    locationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(5),
    });

    await service.initializeExampleHierarchy();

    expect(locationModel.insertMany).not.toHaveBeenCalled();
  });

  it('inserts example locations when none exist', async () => {
    locationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.initializeExampleHierarchy();

    expect(locationModel.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ location_code: 'WH001' }),
      ]),
    );
  });
});
