import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { InventoryTransactionRepository } from './inventory-transaction.repository';
import { InventoryTransaction } from '../schemas/inventory-transaction.schema';

type FnMock = ReturnType<typeof jest.fn>;

type QueryChain = {
  sort: FnMock;
  skip: FnMock;
  limit: FnMock;
  exec: FnMock;
};

type MockModel = {
  find: FnMock;
  findById: FnMock;
  findOne: FnMock;
  countDocuments: FnMock;
  aggregate: FnMock;
  insertMany: FnMock;
  findByIdAndUpdate: FnMock;
  findByIdAndDelete: FnMock;
  deleteMany: FnMock;
};

function buildFindChain<T>(value: T): QueryChain {
  const chain: QueryChain = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn(() => Promise.resolve(value)),
  };

  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);

  return chain;
}

function execWrap<T>(value: T): { exec: FnMock } {
  return {
    exec: jest.fn(() => Promise.resolve(value)),
  };
}

describe('InventoryTransactionRepository', () => {
  let repository: InventoryTransactionRepository;
  let mockModel: MockModel;

  beforeEach(async () => {
    mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      insertMany: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransactionRepository,
        {
          provide: getModelToken(InventoryTransaction.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<InventoryTransactionRepository>(
      InventoryTransactionRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findMyHistory', () => {
    it('should always scope query by performed_by actor', async () => {
      const items = [{ transaction_id: 'txn-1' }];
      const chain = buildFindChain(items);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockReturnValue(execWrap(1));

      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-01-31T23:59:59.999Z');

      const result = await repository.findMyHistory(
        'operator01',
        {
          transaction_type: 'Receipt',
          from,
          to,
        },
        { page: 2, limit: 5 },
      );

      const [query] = mockModel.find.mock.calls[0] as [
        {
          performed_by: string;
          transaction_type: string;
          transaction_date: { $gte: Date; $lte: Date };
        },
      ];

      expect(query.performed_by).toBe('operator01');
      expect(query.transaction_type).toBe('Receipt');
      expect(query.transaction_date.$gte).toEqual(from);
      expect(query.transaction_date.$lte).toEqual(to);
      expect(chain.sort).toHaveBeenCalledWith({ transaction_date: -1 });
      expect(chain.skip).toHaveBeenCalledWith(5);
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(mockModel.countDocuments).toHaveBeenCalledWith(query);
      expect(result).toEqual({ items, total: 1 });
    });

    it('should support keyword search by reference_number in aggregation branch', async () => {
      mockModel.aggregate
        .mockReturnValueOnce(execWrap([{ transaction_id: 'txn-1' }]))
        .mockReturnValueOnce(execWrap([{ total: 1 }]));

      const result = await repository.findMyHistory(
        'operator01',
        { keyword: 'REF-001' },
        { page: 1, limit: 20 },
      );

      const [pipeline] = mockModel.aggregate.mock.calls[0] as [
        Array<Record<string, unknown>>,
      ];

      const actorMatch = pipeline[0] as {
        $match: { performed_by?: string };
      };
      expect(actorMatch.$match.performed_by).toBe('operator01');

      const keywordMatchStage = pipeline.find((stage) => {
        const candidate = stage as { $match?: { $or?: unknown[] } };
        return Array.isArray(candidate.$match?.$or);
      }) as { $match: { $or: Array<Record<string, RegExp>> } };

      const referenceClause = keywordMatchStage.$match.$or.find(
        (entry) => entry.reference_number instanceof RegExp,
      );
      expect(referenceClause).toBeDefined();

      const referenceRegex = referenceClause?.reference_number as RegExp;
      expect(referenceRegex.test('ref-001')).toBe(true);
      expect(result).toEqual({
        items: [{ transaction_id: 'txn-1' }],
        total: 1,
      });
    });

    it('should support keyword search by material_id via lot lookup', async () => {
      mockModel.aggregate
        .mockReturnValueOnce(execWrap([{ transaction_id: 'txn-2' }]))
        .mockReturnValueOnce(execWrap([{ total: 1 }]));

      const result = await repository.findMyHistory(
        'operator02',
        { keyword: 'MAT-001' },
        { page: 1, limit: 10 },
      );

      const [pipeline] = mockModel.aggregate.mock.calls[0] as [
        Array<Record<string, unknown>>,
      ];

      const lookupStage = pipeline.find((stage) => {
        const candidate = stage as {
          $lookup?: {
            from?: string;
            localField?: string;
            foreignField?: string;
          };
        };
        return candidate.$lookup?.from === 'inventory_lots';
      }) as {
        $lookup: { from: string; localField: string; foreignField: string };
      };

      expect(lookupStage.$lookup.localField).toBe('lot_id');
      expect(lookupStage.$lookup.foreignField).toBe('lot_id');

      const keywordMatchStage = pipeline.find((stage) => {
        const candidate = stage as { $match?: { $or?: unknown[] } };
        return Array.isArray(candidate.$match?.$or);
      }) as { $match: { $or: Array<Record<string, RegExp>> } };

      const materialClause = keywordMatchStage.$match.$or.find(
        (entry) => entry.material_id instanceof RegExp,
      );
      expect(materialClause).toBeDefined();

      const materialRegex = materialClause?.material_id as RegExp;
      expect(materialRegex.test('mat-001')).toBe(true);
      expect(result).toEqual({
        items: [{ transaction_id: 'txn-2' }],
        total: 1,
      });
    });
  });
});
