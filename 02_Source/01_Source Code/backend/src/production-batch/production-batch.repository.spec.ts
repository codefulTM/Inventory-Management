import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProductionBatchRepository } from './production-batch.repository';
import { ProductionBatch } from '../schemas/production-batch.schema';
import {
  BatchStatus,
  CreateProductionBatchDto,
} from './dto/create-production-batch.dto';
import { UpdateProductionBatchDto } from './dto/update-production-batch.dto';

type ProductionBatchLike = {
  _id: string;
  batch_id: string;
  product_id: string;
  batch_number: string;
  unit_of_measure: string;
  shelf_life_value: number;
  shelf_life_unit: string;
  status: BatchStatus;
  batch_size: { toString: () => string };
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

function buildBatch(
  overrides: Partial<ProductionBatchLike> = {},
): ProductionBatchLike {
  const now = new Date('2026-01-10T10:00:00.000Z');

  return {
    _id: '507f1f77bcf86cd799439011',
    batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
    product_id: 'MAT-001',
    batch_number: 'BATCH-2026-001',
    unit_of_measure: 'kg',
    shelf_life_value: 24,
    shelf_life_unit: 'month',
    status: BatchStatus.InProgress,
    batch_size: { toString: () => '500' },
    created_date: now,
    modified_date: now,
    ...overrides,
  };
}

function buildCreateDto(
  overrides: Partial<CreateProductionBatchDto> = {},
): CreateProductionBatchDto {
  return {
    batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
    product_id: 'MAT-001',
    batch_number: 'BATCH-2026-001',
    unit_of_measure: 'kg',
    shelf_life_value: 24,
    shelf_life_unit: 'month',
    status: BatchStatus.InProgress,
    batch_size: 500,
    ...overrides,
  };
}

describe('ProductionBatchRepository', () => {
  let repository: ProductionBatchRepository;
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
        ProductionBatchRepository,
        {
          provide: getModelToken(ProductionBatch.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<ProductionBatchRepository>(
      ProductionBatchRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should construct and save batch model', async () => {
      const createDto = buildCreateDto();
      const constructorInputs: CreateProductionBatchDto[] = [];

      class BatchCtor {
        constructor(data: CreateProductionBatchDto) {
          constructorInputs.push(data);
        }

        save = jest.fn().mockResolvedValue(buildBatch());
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProductionBatchRepository,
          {
            provide: getModelToken(ProductionBatch.name),
            useValue: BatchCtor,
          },
        ],
      }).compile();

      const createRepository = module.get<ProductionBatchRepository>(
        ProductionBatchRepository,
      );

      const result = await createRepository.create(createDto);

      expect(constructorInputs).toEqual([createDto]);
      expect(result.batch_number).toBe('BATCH-2026-001');
    });
  });

  describe('findAll', () => {
    it('should page and sort newest first', async () => {
      const batch = buildBatch();
      const chain = buildFindChain([batch]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockResolvedValue(66);

      const result = await repository.findAll(3, 10);

      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });
      expect(mockModel.countDocuments).toHaveBeenCalledWith();
      expect(result.total).toBe(66);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        batch_id: batch.batch_id,
        product_id: batch.product_id,
        batch_number: batch.batch_number,
        unit_of_measure: batch.unit_of_measure,
        status: batch.status,
      });
    });
  });

  describe('findOne and findByBatchNumber', () => {
    it('should find one by batch_id', async () => {
      mockModel.findOne.mockReturnValue(execWrap(buildBatch()));

      const result = await repository.findOne(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
      });
      expect(result?.batch_id).toBe('3d594650-3436-453f-901f-f7f66f18f8eb');
    });

    it('should find one by batch_number', async () => {
      mockModel.findOne.mockReturnValue(execWrap(buildBatch()));

      const result = await repository.findByBatchNumber('BATCH-2026-001');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        batch_number: 'BATCH-2026-001',
      });
      expect(result?.batch_number).toBe('BATCH-2026-001');
    });
  });

  describe('findByProductId and findByStatus', () => {
    it('should filter by product_id with pagination', async () => {
      const chain = buildFindChain([buildBatch({ product_id: 'MAT-777' })]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockResolvedValue(9);

      const result = await repository.findByProductId('MAT-777', 2, 5);

      expect(mockModel.find).toHaveBeenCalledWith({ product_id: 'MAT-777' });
      expect(chain.skip).toHaveBeenCalledWith(5);
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        product_id: 'MAT-777',
      });
      expect(result.total).toBe(9);
    });

    it('should filter by status with pagination', async () => {
      const chain = buildFindChain([
        buildBatch({ status: BatchStatus.Complete }),
      ]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockResolvedValue(5);

      const result = await repository.findByStatus(BatchStatus.Complete, 1, 10);

      expect(mockModel.find).toHaveBeenCalledWith({
        status: BatchStatus.Complete,
      });
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        status: BatchStatus.Complete,
      });
      expect(result.total).toBe(5);
    });
  });

  describe('update and remove', () => {
    it('should update by batch_id with validators enabled', async () => {
      const updateDto: UpdateProductionBatchDto = {
        status: BatchStatus.OnHold,
      };
      mockModel.findOneAndUpdate.mockReturnValue(
        execWrap(buildBatch({ status: BatchStatus.OnHold })),
      );

      const result = await repository.update(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        updateDto,
      );

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          $or: [
            { batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb' },
            { batch_number: '3d594650-3436-453f-901f-f7f66f18f8eb' },
          ],
        },
        updateDto,
        {
          new: true,
          runValidators: true,
        },
      );
      expect(result?.status).toBe(BatchStatus.OnHold);
    });

    it('should remove by batch_id', async () => {
      mockModel.findOneAndDelete.mockReturnValue(execWrap(buildBatch()));

      const result = await repository.remove(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        $or: [
          { batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb' },
          { batch_number: '3d594650-3436-453f-901f-f7f66f18f8eb' },
        ],
      });
      expect(result?.batch_id).toBe('3d594650-3436-453f-901f-f7f66f18f8eb');
    });
  });
});
