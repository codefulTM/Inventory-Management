import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { BatchComponentService } from './batch-component.service';
import { BatchComponentRepository } from './batch-component.repository';
import { ProductionBatchRepository } from './production-batch.repository';
import { InventoryLot } from '../schemas/inventory-lot.schema';
import { CreateBatchComponentDto } from './dto/create-batch-component.dto';
import { UpdateBatchComponentDto } from './dto/update-batch-component.dto';

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000002',
}));

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

type BatchComponentLike = {
  _id: { toString: () => string };
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

type MockedComponentRepository = {
  create: jest.Mock;
  findByBatchId: jest.Mock;
  findOne: jest.Mock;
  findOneByBatch: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

type MockedBatchRepository = {
  findAll: jest.Mock;
  findOne: jest.Mock;
  findByBatchNumber: jest.Mock;
  findByProductId: jest.Mock;
  findByStatus: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

type MockedLotModel = {
  findOne: jest.Mock;
};

function mockExec<T>(value: T): { exec: jest.Mock } {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function buildComponent(
  overrides: Partial<BatchComponentLike> = {},
): BatchComponentLike {
  const now = new Date('2026-01-15T08:00:00.000Z');

  return {
    _id: { toString: () => '507f191e810c19729de860ea' },
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

function buildCreateDto(
  overrides: Partial<CreateBatchComponentDto> = {},
): CreateBatchComponentDto {
  return {
    lot_id: '34b8ad57-1f77-468c-8f96-df6f8bdb3354',
    planned_quantity: 100,
    actual_quantity: 95,
    unit_of_measure: 'kg',
    addition_date: '2026-01-15T00:00:00.000Z',
    added_by: 'operator-01',
    ...overrides,
  };
}

describe('BatchComponentService', () => {
  let service: BatchComponentService;
  let componentRepository: MockedComponentRepository;
  let batchRepository: MockedBatchRepository;
  let lotModel: MockedLotModel;

  beforeEach(async () => {
    const componentRepositoryMock: MockedComponentRepository = {
      create: jest.fn(),
      findByBatchId: jest.fn(),
      findOne: jest.fn(),
      findOneByBatch: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const batchRepositoryMock: MockedBatchRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByBatchNumber: jest.fn(),
      findByProductId: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const lotModelMock: MockedLotModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchComponentService,
        {
          provide: BatchComponentRepository,
          useValue: componentRepositoryMock,
        },
        {
          provide: ProductionBatchRepository,
          useValue: batchRepositoryMock,
        },
        {
          provide: getModelToken(InventoryLot.name),
          useValue: lotModelMock,
        },
      ],
    }).compile();

    service = module.get<BatchComponentService>(BatchComponentService);
    componentRepository = module.get<MockedComponentRepository>(
      BatchComponentRepository,
    );
    batchRepository = module.get<MockedBatchRepository>(
      ProductionBatchRepository,
    );
    lotModel = module.get<MockedLotModel>(getModelToken(InventoryLot.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create component when batch and lot exist', async () => {
      const createDto = buildCreateDto();
      const created = buildComponent();
      batchRepository.findOne.mockResolvedValue({ batch_id: created.batch_id });
      lotModel.findOne.mockReturnValue(mockExec({ lot_id: created.lot_id }));
      componentRepository.create.mockResolvedValue(created);

      const result = await service.create(created.batch_id, createDto);

      expect(batchRepository.findOne).toHaveBeenCalledWith(created.batch_id);
      expect(lotModel.findOne).toHaveBeenCalledWith({ lot_id: created.lot_id });
      expect(componentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_id: created.batch_id,
          lot_id: created.lot_id,
          planned_quantity: 100,
          unit_of_measure: 'kg',
        }),
      );
      expect(result.component_id).toBe(created.component_id);
      expect(result.planned_quantity).toBe('100');
      expect(result.actual_quantity).toBe('95');
    });

    it('should auto-fill addition_date when not provided', async () => {
      const createDto = buildCreateDto({ addition_date: undefined });
      batchRepository.findOne.mockResolvedValue({ batch_id: 'batch-1' });
      lotModel.findOne.mockReturnValue(mockExec({ lot_id: createDto.lot_id }));
      let capturedAdditionDate: unknown;
      componentRepository.create.mockImplementation((payload: unknown) => {
        if (typeof payload === 'object' && payload !== null) {
          capturedAdditionDate = (payload as { addition_date?: unknown })
            .addition_date;
        }

        return Promise.resolve(buildComponent());
      });

      await service.create('batch-1', createDto);

      expect(typeof capturedAdditionDate).toBe('string');
      if (typeof capturedAdditionDate === 'string') {
        expect(capturedAdditionDate.length).toBeGreaterThan(0);
      }
    });

    it('should generate UUID component_id during creation', async () => {
      const createDto = buildCreateDto();
      batchRepository.findOne.mockResolvedValue({ batch_id: 'batch-1' });
      lotModel.findOne.mockReturnValue(mockExec({ lot_id: createDto.lot_id }));
      let capturedCreatePayload:
        | {
            component_id?: string;
          }
        | undefined;
      componentRepository.create.mockImplementation((payload: unknown) => {
        if (typeof payload === 'object' && payload !== null) {
          capturedCreatePayload = {
            component_id: (payload as { component_id?: string }).component_id,
          };
        }

        return Promise.resolve(buildComponent());
      });

      await service.create('batch-1', createDto);

      expect(capturedCreatePayload?.component_id).toBeDefined();
      expect(capturedCreatePayload?.component_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should throw NotFoundException when batch is missing', async () => {
      batchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('batch-404', buildCreateDto()),
      ).rejects.toThrow(NotFoundException);
      expect(componentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when lot is missing', async () => {
      batchRepository.findOne.mockResolvedValue({ batch_id: 'batch-1' });
      lotModel.findOne.mockReturnValue(mockExec(null));

      await expect(service.create('batch-1', buildCreateDto())).rejects.toThrow(
        NotFoundException,
      );
      expect(componentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByBatchId', () => {
    it('should return mapped components when batch exists', async () => {
      batchRepository.findOne.mockResolvedValue({ batch_id: 'batch-1' });
      componentRepository.findByBatchId.mockResolvedValue([buildComponent()]);

      const result = await service.findByBatchId('batch-1');

      expect(componentRepository.findByBatchId).toHaveBeenCalledWith('batch-1');
      expect(result).toHaveLength(1);
      expect(result[0]?.planned_quantity).toBe('100');
    });

    it('should throw NotFoundException when batch does not exist', async () => {
      batchRepository.findOne.mockResolvedValue(null);

      await expect(service.findByBatchId('batch-404')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a component that belongs to batch', async () => {
      componentRepository.findOneByBatch.mockResolvedValue(buildComponent());

      const result = await service.findOne(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );

      expect(componentRepository.findOneByBatch).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );
      expect(result.component_id).toBe('f5f7d95c-95e2-4314-81d2-3989f95a11a4');
    });

    it('should throw NotFoundException when component is not in batch', async () => {
      componentRepository.findOneByBatch.mockResolvedValue(null);

      await expect(service.findOne('batch-1', 'component-404')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when component is not in batch', async () => {
      componentRepository.findOneByBatch.mockResolvedValue(null);

      await expect(
        service.update(
          'batch-1',
          'component-404',
          {} as UpdateBatchComponentDto,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(componentRepository.update).not.toHaveBeenCalled();
    });

    it('should validate changed lot_id exists', async () => {
      componentRepository.findOneByBatch.mockResolvedValue(buildComponent());
      lotModel.findOne.mockReturnValue(mockExec(null));

      await expect(
        service.update('batch-1', 'component-1', {
          lot_id: '9b4d20dc-30dd-4258-b3b9-6ff7ce3d5dd7',
        } as UpdateBatchComponentDto),
      ).rejects.toThrow(NotFoundException);
      expect(componentRepository.update).not.toHaveBeenCalled();
    });

    it('should skip lot lookup when lot_id is unchanged and update succeeds', async () => {
      const existing = buildComponent();
      componentRepository.findOneByBatch.mockResolvedValue(existing);
      componentRepository.update.mockResolvedValue(
        buildComponent({ unit_of_measure: 'g' }),
      );

      const result = await service.update('batch-1', existing.component_id, {
        lot_id: existing.lot_id,
        unit_of_measure: 'g',
      } as UpdateBatchComponentDto);

      expect(lotModel.findOne).not.toHaveBeenCalled();
      expect(componentRepository.update).toHaveBeenCalledWith(
        existing.component_id,
        expect.objectContaining({ unit_of_measure: 'g' }),
      );
      expect(result.unit_of_measure).toBe('g');
    });

    it('should validate new lot_id and update component', async () => {
      const existing = buildComponent();
      componentRepository.findOneByBatch.mockResolvedValue(existing);
      lotModel.findOne.mockReturnValue(
        mockExec({ lot_id: '9b4d20dc-30dd-4258-b3b9-6ff7ce3d5dd7' }),
      );
      componentRepository.update.mockResolvedValue(
        buildComponent({
          lot_id: '9b4d20dc-30dd-4258-b3b9-6ff7ce3d5dd7',
          actual_quantity: { toString: () => '90' },
        }),
      );

      const result = await service.update('batch-1', existing.component_id, {
        lot_id: '9b4d20dc-30dd-4258-b3b9-6ff7ce3d5dd7',
        actual_quantity: 90,
      } as UpdateBatchComponentDto);

      expect(lotModel.findOne).toHaveBeenCalledWith({
        lot_id: '9b4d20dc-30dd-4258-b3b9-6ff7ce3d5dd7',
      });
      expect(result.actual_quantity).toBe('90');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when component is missing from batch', async () => {
      componentRepository.findOneByBatch.mockResolvedValue(null);

      await expect(service.remove('batch-1', 'component-404')).rejects.toThrow(
        NotFoundException,
      );
      expect(componentRepository.remove).not.toHaveBeenCalled();
    });

    it('should remove component and return confirmation', async () => {
      const existing = buildComponent();
      componentRepository.findOneByBatch.mockResolvedValue(existing);
      componentRepository.remove.mockResolvedValue(existing);

      const result = await service.remove('batch-1', existing.component_id);

      expect(componentRepository.remove).toHaveBeenCalledWith(
        existing.component_id,
      );
      expect(result).toEqual({
        message: `Batch component '${existing.component_id}' deleted successfully`,
      });
    });
  });
});
