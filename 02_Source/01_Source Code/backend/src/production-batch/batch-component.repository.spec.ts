import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BatchComponentRepository } from './batch-component.repository';
import { BatchComponent } from '../schemas/batch-component.schema';
import { CreateBatchComponentDto } from './dto/create-batch-component.dto';
import { UpdateBatchComponentDto } from './dto/update-batch-component.dto';

type BatchComponentLike = {
  _id: string;
  component_id: string;
  batch_id: string;
  lot_id: string;
  planned_quantity: { toString: () => string };
  actual_quantity?: { toString: () => string };
  unit_of_measure: string;
  addition_date?: Date;
  added_by?: string;
  created_date: Date;
  modified_date: Date;
};

type QueryChain = {
  sort: jest.Mock;
  exec: jest.Mock;
};

type MockedModel = {
  find: jest.Mock;
  findOne: jest.Mock;
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
    sort: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };

  chain.sort.mockReturnValue(chain);

  return chain;
}

function buildComponent(
  overrides: Partial<BatchComponentLike> = {},
): BatchComponentLike {
  const now = new Date('2026-01-15T08:00:00.000Z');

  return {
    _id: '507f191e810c19729de860ea',
    component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
    batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
    lot_id: '34b8ad57-1f77-468c-8f96-df6f8bdb3354',
    planned_quantity: { toString: () => '100' },
    actual_quantity: { toString: () => '95' },
    unit_of_measure: 'kg',
    addition_date: new Date('2026-01-15T00:00:00.000Z'),
    added_by: 'operator-01',
    created_date: now,
    modified_date: now,
    ...overrides,
  };
}

function buildCreatePayload(
  overrides: Partial<
    CreateBatchComponentDto & { batch_id: string; component_id: string }
  > = {},
): CreateBatchComponentDto & { batch_id: string; component_id: string } {
  return {
    component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
    batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
    lot_id: '34b8ad57-1f77-468c-8f96-df6f8bdb3354',
    planned_quantity: 100,
    actual_quantity: 95,
    unit_of_measure: 'kg',
    addition_date: '2026-01-15T00:00:00.000Z',
    added_by: 'operator-01',
    ...overrides,
  };
}

describe('BatchComponentRepository', () => {
  let repository: BatchComponentRepository;
  let mockModel: MockedModel;

  beforeEach(async () => {
    mockModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchComponentRepository,
        {
          provide: getModelToken(BatchComponent.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<BatchComponentRepository>(BatchComponentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should construct and save component document', async () => {
      const payload = buildCreatePayload();
      const constructorInputs: Array<typeof payload> = [];

      class ComponentCtor {
        constructor(data: typeof payload) {
          constructorInputs.push(data);
        }

        save = jest.fn().mockResolvedValue(buildComponent());
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BatchComponentRepository,
          {
            provide: getModelToken(BatchComponent.name),
            useValue: ComponentCtor,
          },
        ],
      }).compile();

      const createRepository = module.get<BatchComponentRepository>(
        BatchComponentRepository,
      );

      const result = await createRepository.create(payload);

      expect(constructorInputs).toEqual([payload]);
      expect(result.component_id).toBe('f5f7d95c-95e2-4314-81d2-3989f95a11a4');
    });
  });

  describe('findByBatchId', () => {
    it('should filter by batch_id and sort ascending by created_date', async () => {
      const chain = buildFindChain([buildComponent()]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findByBatchId(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );

      expect(mockModel.find).toHaveBeenCalledWith({
        batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
      });
      expect(chain.sort).toHaveBeenCalledWith({ created_date: 1 });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne and findOneByBatch', () => {
    it('should find by component_id', async () => {
      mockModel.findOne.mockReturnValue(execWrap(buildComponent()));

      const result = await repository.findOne(
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      });
      expect(result?.component_id).toBe('f5f7d95c-95e2-4314-81d2-3989f95a11a4');
    });

    it('should find by component_id scoped to batch_id', async () => {
      mockModel.findOne.mockReturnValue(execWrap(buildComponent()));

      const result = await repository.findOneByBatch(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
        batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
      });
      expect(result?.batch_id).toBe('3d594650-3436-453f-901f-f7f66f18f8eb');
    });
  });

  describe('update and remove', () => {
    it('should update by component_id with validators enabled', async () => {
      const updateDto: UpdateBatchComponentDto = {
        actual_quantity: 90,
      };
      mockModel.findOneAndUpdate.mockReturnValue(
        execWrap(
          buildComponent({
            actual_quantity: { toString: () => '90' },
          }),
        ),
      );

      const result = await repository.update(
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
        updateDto,
      );

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4' },
        updateDto,
        {
          new: true,
          runValidators: true,
        },
      );
      expect(result?.actual_quantity).toBeDefined();
    });

    it('should remove by component_id', async () => {
      mockModel.findOneAndDelete.mockReturnValue(execWrap(buildComponent()));

      const result = await repository.remove(
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      });
      expect(result?.component_id).toBe('f5f7d95c-95e2-4314-81d2-3989f95a11a4');
    });
  });
});
