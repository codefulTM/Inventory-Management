import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InventoryLotRepository } from './inventory-lot.repository';
import { InventoryLot } from '../schemas/inventory-lot.schema';
import {
  CreateInventoryLotDto,
  InventoryLotStatus,
  UpdateInventoryLotDto,
} from './inventory-lot.dto';

jest.mock(
  'src/inventory-lot/inventory-lot.dto',
  () => ({
    InventoryLotStatus: {
      QUARANTINE: 'Quarantine',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      DEPLETED: 'Depleted',
    },
  }),
  { virtual: true },
);

type InventoryLotLike = {
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name?: string;
  received_date: Date;
  expiration_date: Date;
  status: InventoryLotStatus;
  quantity: number;
  unit_of_measure: string;
  is_sample: boolean;
  parent_lot_id?: string;
  created_date: Date;
  modified_date: Date;
};

type QueryChain = {
  skip: jest.Mock;
  limit: jest.Mock;
  sort: jest.Mock;
  exec: jest.Mock;
};

type MockedModel = {
  find: jest.Mock;
  findOne: jest.Mock;
  countDocuments: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findOneAndDelete: jest.Mock;
};

function execWrap<T>(value: T): { exec: jest.Mock } {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function buildFindChain<T>(value: T): QueryChain {
  const chain: QueryChain = {
    skip: jest.fn(),
    limit: jest.fn(),
    sort: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };

  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);

  return chain;
}

function buildCreateDto(
  overrides: Partial<CreateInventoryLotDto> = {},
): CreateInventoryLotDto {
  return {
    lot_id: 'LOT-001',
    material_id: 'MAT-001',
    manufacturer_name: 'ABC Pharma',
    manufacturer_lot: 'MFG-LOT-001',
    supplier_name: 'Global Supplier',
    received_date: new Date('2025-01-01T00:00:00.000Z'),
    expiration_date: new Date('2026-01-01T00:00:00.000Z'),
    status: InventoryLotStatus.QUARANTINE,
    quantity: 100,
    unit_of_measure: 'kg',
    is_sample: false,
    ...overrides,
  };
}

function buildLot(overrides: Partial<InventoryLotLike> = {}): InventoryLotLike {
  const now = new Date('2025-01-01T08:00:00.000Z');

  return {
    lot_id: 'LOT-001',
    material_id: 'MAT-001',
    manufacturer_name: 'ABC Pharma',
    manufacturer_lot: 'MFG-LOT-001',
    supplier_name: 'Global Supplier',
    received_date: new Date('2025-01-01T00:00:00.000Z'),
    expiration_date: new Date('2026-01-01T00:00:00.000Z'),
    status: InventoryLotStatus.QUARANTINE,
    quantity: 100,
    unit_of_measure: 'kg',
    is_sample: false,
    parent_lot_id: undefined,
    created_date: now,
    modified_date: now,
    ...overrides,
  };
}

describe('InventoryLotRepository', () => {
  let repository: InventoryLotRepository;
  let mockModel: MockedModel;

  beforeEach(async () => {
    mockModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryLotRepository,
        {
          provide: getModelToken(InventoryLot.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<InventoryLotRepository>(InventoryLotRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save lot document', async () => {
      const createDto = buildCreateDto();
      const saved = buildLot();
      const constructorInputs: CreateInventoryLotDto[] = [];

      class InventoryLotCtor {
        constructor(data: CreateInventoryLotDto) {
          constructorInputs.push(data);
        }

        save = jest.fn().mockResolvedValue(saved);
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InventoryLotRepository,
          {
            provide: getModelToken(InventoryLot.name),
            useValue: InventoryLotCtor,
          },
        ],
      }).compile();

      const createRepository = module.get<InventoryLotRepository>(
        InventoryLotRepository,
      );

      const result = await createRepository.create(createDto);

      expect(constructorInputs).toEqual([createDto]);
      expect(result).toEqual(saved);
    });
  });

  describe('findAll', () => {
    it('should apply paging and sorting with total count', async () => {
      const chain = buildFindChain([buildLot()]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(50));

      const result = await repository.findAll(3, 10);

      expect(mockModel.find).toHaveBeenCalledWith();
      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });
      expect(mockModel.countDocuments).toHaveBeenCalledWith();
      expect(result).toEqual({ data: [buildLot()], total: 50 });
    });
  });

  describe('findById', () => {
    it('should query by lot_id', async () => {
      mockModel.findOne.mockReturnValue(execWrap(buildLot()));

      const result = await repository.findById('LOT-001');

      expect(mockModel.findOne).toHaveBeenCalledWith({ lot_id: 'LOT-001' });
      expect(result?.lot_id).toBe('LOT-001');
    });
  });

  describe('findByMaterialId', () => {
    it('should apply material filter with paging', async () => {
      const chain = buildFindChain([buildLot({ material_id: 'MAT-777' })]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(7));

      const result = await repository.findByMaterialId('MAT-777', 2, 5);

      expect(mockModel.find).toHaveBeenCalledWith({ material_id: 'MAT-777' });
      expect(chain.skip).toHaveBeenCalledWith(5);
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        data: [buildLot({ material_id: 'MAT-777' })],
        total: 7,
      });
    });
  });

  describe('findByStatus', () => {
    it('should apply status filter with paging', async () => {
      const chain = buildFindChain([
        buildLot({ status: InventoryLotStatus.ACCEPTED }),
      ]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(3));

      const result = await repository.findByStatus(
        InventoryLotStatus.ACCEPTED,
        1,
        10,
      );

      expect(mockModel.find).toHaveBeenCalledWith({
        status: InventoryLotStatus.ACCEPTED,
      });
      expect(result.total).toBe(3);
    });
  });

  describe('findBySampleStatus', () => {
    it('should filter by is_sample flag with paging', async () => {
      const chain = buildFindChain([buildLot({ is_sample: true })]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(2));

      const result = await repository.findBySampleStatus(true, 1, 10);

      expect(mockModel.find).toHaveBeenCalledWith({ is_sample: true });
      expect(result.total).toBe(2);
      expect(result.data[0]?.is_sample).toBe(true);
    });
  });

  describe('findSamplesByParentLot', () => {
    it('should filter by parent_lot_id and sample flag', async () => {
      const chain = buildFindChain([
        buildLot({ is_sample: true, parent_lot_id: 'LOT-PARENT-1' }),
      ]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findSamplesByParentLot('LOT-PARENT-1');

      expect(mockModel.find).toHaveBeenCalledWith({
        parent_lot_id: 'LOT-PARENT-1',
        is_sample: true,
      });
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });
      expect(result).toHaveLength(1);
    });
  });

  describe('searchByManufacturer', () => {
    it('should create case-insensitive regex OR search', async () => {
      const chain = buildFindChain([buildLot()]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(8));

      const result = await repository.searchByManufacturer('ABC', 2, 4);

      expect(chain.skip).toHaveBeenCalledWith(4);
      expect(chain.limit).toHaveBeenCalledWith(4);
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });

      const [findArg] = mockModel.find.mock.calls[0] as [
        {
          $or: Array<{
            manufacturer_name?: RegExp;
            manufacturer_lot?: RegExp;
            supplier_name?: RegExp;
          }>;
        },
      ];

      const regexes = findArg.$or.map((entry) => Object.values(entry)[0]);
      regexes.forEach((regex) => {
        expect(regex).toBeInstanceOf(RegExp);
        if (regex instanceof RegExp) {
          expect(regex.source).toBe('ABC');
          expect(regex.flags).toContain('i');
        }
      });
      expect(result.total).toBe(8);
    });
  });

  describe('findByFilter', () => {
    it('should build dynamic filter query including manufacturer regex', async () => {
      const chain = buildFindChain([buildLot()]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(1));

      const result = await repository.findByFilter(
        {
          material_id: 'MAT-001',
          status: InventoryLotStatus.QUARANTINE,
          is_sample: false,
          manufacturer_name: 'ABC',
        },
        1,
        10,
      );

      const [query] = mockModel.find.mock.calls[0] as [
        {
          material_id?: string;
          status?: string;
          is_sample?: boolean;
          manufacturer_name?: RegExp;
        },
      ];

      expect(query.material_id).toBe('MAT-001');
      expect(query.status).toBe(InventoryLotStatus.QUARANTINE);
      expect(query.is_sample).toBe(false);
      expect(query.manufacturer_name).toBeInstanceOf(RegExp);
      expect(result.total).toBe(1);
    });

    it('should handle empty filter object', async () => {
      const chain = buildFindChain([]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(0));

      const result = await repository.findByFilter({}, 1, 10);

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(mockModel.countDocuments).toHaveBeenCalledWith({});
      expect(result.total).toBe(0);
    });
  });

  describe('update and mutation operations', () => {
    it('should update lot document by lot_id', async () => {
      const updateDto: UpdateInventoryLotDto = {
        material_id: 'MAT-001',
        manufacturer_name: 'ABC Pharma',
        manufacturer_lot: 'MFG-LOT-001',
        received_date: new Date('2025-01-01T00:00:00.000Z'),
        expiration_date: new Date('2026-01-01T00:00:00.000Z'),
        status: InventoryLotStatus.ACCEPTED,
        quantity: 100,
        unit_of_measure: 'kg',
      };
      mockModel.findOneAndUpdate.mockReturnValue(execWrap(buildLot()));

      const result = await repository.update('LOT-001', updateDto);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { lot_id: 'LOT-001' },
        updateDto,
        { new: true },
      );
      expect(result?.lot_id).toBe('LOT-001');
    });

    it('should update status by lot_id', async () => {
      mockModel.findOneAndUpdate.mockReturnValue(
        execWrap(buildLot({ status: InventoryLotStatus.ACCEPTED })),
      );

      const result = await repository.updateStatus(
        'LOT-001',
        InventoryLotStatus.ACCEPTED,
      );

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { lot_id: 'LOT-001' },
        { status: InventoryLotStatus.ACCEPTED },
        { new: true },
      );
      expect(result?.status).toBe(InventoryLotStatus.ACCEPTED);
    });

    it('should increment quantity with updateQuantity', async () => {
      mockModel.findOneAndUpdate.mockReturnValue(
        execWrap(buildLot({ quantity: 105 })),
      );

      const result = await repository.updateQuantity('LOT-001', '5');

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { lot_id: 'LOT-001' },
        { $inc: { quantity: '5' } },
        { new: true },
      );
      expect(result?.quantity).toBe(105);
    });

    it('should delete by lot_id', async () => {
      mockModel.findOneAndDelete.mockReturnValue(execWrap(buildLot()));

      const result = await repository.delete('LOT-001');

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        lot_id: 'LOT-001',
      });
      expect(result?.lot_id).toBe('LOT-001');
    });
  });

  describe('specialized queries', () => {
    it('should get lots by material and status sorted by received_date ASC', async () => {
      const chain = buildFindChain([
        buildLot({
          material_id: 'MAT-001',
          status: InventoryLotStatus.ACCEPTED,
        }),
      ]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.getLotsByMaterialAndStatus(
        'MAT-001',
        InventoryLotStatus.ACCEPTED,
      );

      expect(mockModel.find).toHaveBeenCalledWith({
        material_id: 'MAT-001',
        status: InventoryLotStatus.ACCEPTED,
      });
      expect(chain.sort).toHaveBeenCalledWith({ received_date: 1 });
      expect(result).toHaveLength(1);
    });

    it('should count by status', async () => {
      mockModel.countDocuments.mockReturnValue(execWrap(12));

      const result = await repository.countByStatus(
        InventoryLotStatus.REJECTED,
      );

      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        status: InventoryLotStatus.REJECTED,
      });
      expect(result).toBe(12);
    });

    it('should check lot existence correctly', async () => {
      mockModel.findOne.mockReturnValueOnce(execWrap(buildLot()));
      mockModel.findOne.mockReturnValueOnce(execWrap(null));

      const exists = await repository.checkLotExists('LOT-001');
      const missing = await repository.checkLotExists('LOT-404');

      expect(exists).toBe(true);
      expect(missing).toBe(false);
    });

    it('should find expiring soon lots with non-depleted status', async () => {
      const chain = buildFindChain([buildLot()]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findExpiringSoon(45);

      const [query] = mockModel.find.mock.calls[0] as [
        {
          expiration_date: { $lte: Date };
          status: { $ne: string };
        },
      ];

      expect(query.status.$ne).toBe('Depleted');
      expect(query.expiration_date.$lte).toBeInstanceOf(Date);
      expect(chain.sort).toHaveBeenCalledWith({ expiration_date: 1 });
      expect(result).toHaveLength(1);
    });

    it('should find expired lots with non-depleted status', async () => {
      const chain = buildFindChain([buildLot()]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findExpiredLots();

      const [query] = mockModel.find.mock.calls[0] as [
        {
          expiration_date: { $lt: Date };
          status: { $ne: string };
        },
      ];

      expect(query.status.$ne).toBe('Depleted');
      expect(query.expiration_date.$lt).toBeInstanceOf(Date);
      expect(chain.sort).toHaveBeenCalledWith({ expiration_date: 1 });
      expect(result).toHaveLength(1);
    });
  });
});
