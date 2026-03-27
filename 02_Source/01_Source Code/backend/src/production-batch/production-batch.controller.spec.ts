import { Test, TestingModule } from '@nestjs/testing';
import { ProductionBatchController } from './production-batch.controller';
import { ProductionBatchService } from './production-batch.service';
import { BatchComponentService } from './batch-component.service';
import {
  BatchStatus,
  CreateProductionBatchDto,
} from './dto/create-production-batch.dto';
import { UpdateProductionBatchDto } from './dto/update-production-batch.dto';
import { CreateBatchComponentDto } from './dto/create-batch-component.dto';
import { UpdateBatchComponentDto } from './dto/update-batch-component.dto';

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000003',
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

type MockedProductionBatchService = {
  findAll: jest.Mock;
  findByProductId: jest.Mock;
  findByStatus: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

type MockedBatchComponentService = {
  findByBatchId: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

describe('ProductionBatchController', () => {
  let controller: ProductionBatchController;
  let batchService: MockedProductionBatchService;
  let componentService: MockedBatchComponentService;

  const batchResponse = {
    _id: '507f1f77bcf86cd799439011',
    batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
    product_id: 'MAT-001',
    batch_number: 'BATCH-2026-001',
    unit_of_measure: 'kg',
    manufacture_date: new Date('2026-01-01T00:00:00.000Z'),
    expiration_date: new Date('2028-01-01T00:00:00.000Z'),
    status: BatchStatus.InProgress,
    batch_size: '500',
    created_date: new Date('2026-01-01T08:00:00.000Z'),
    modified_date: new Date('2026-01-01T08:00:00.000Z'),
  };

  const componentResponse = {
    _id: '507f191e810c19729de860ea',
    component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
    batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
    lot_id: '34b8ad57-1f77-468c-8f96-df6f8bdb3354',
    planned_quantity: '100',
    actual_quantity: '95',
    unit_of_measure: 'kg',
    addition_date: new Date('2026-01-15T00:00:00.000Z'),
    added_by: 'operator-01',
    created_date: new Date('2026-01-15T08:00:00.000Z'),
    modified_date: new Date('2026-01-15T08:00:00.000Z'),
  };

  beforeEach(async () => {
    const productionBatchServiceMock: MockedProductionBatchService = {
      findAll: jest.fn(),
      findByProductId: jest.fn(),
      findByStatus: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const batchComponentServiceMock: MockedBatchComponentService = {
      findByBatchId: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionBatchController],
      providers: [
        {
          provide: ProductionBatchService,
          useValue: productionBatchServiceMock,
        },
        {
          provide: BatchComponentService,
          useValue: batchComponentServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductionBatchController>(
      ProductionBatchController,
    );
    batchService = module.get<MockedProductionBatchService>(
      ProductionBatchService,
    );
    componentService = module.get<MockedBatchComponentService>(
      BatchComponentService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('production batch endpoints', () => {
    it('should call findAll with defaults', async () => {
      batchService.findAll.mockResolvedValue({
        data: [batchResponse],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await controller.findAll();

      expect(batchService.findAll).toHaveBeenCalledWith(1, 20);
      expect(result.pagination.total).toBe(1);
    });

    it('should call findAll with explicit values', async () => {
      batchService.findAll.mockResolvedValue({
        data: [batchResponse],
        pagination: { page: 2, limit: 5, total: 8, totalPages: 2 },
      });

      await controller.findAll(2, 5);

      expect(batchService.findAll).toHaveBeenCalledWith(2, 5);
    });

    it('should call findByProductId', async () => {
      batchService.findByProductId.mockResolvedValue({
        data: [batchResponse],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await controller.findByProductId('MAT-001', 1, 20);

      expect(batchService.findByProductId).toHaveBeenCalledWith(
        'MAT-001',
        1,
        20,
      );
      expect(result.data[0]?.product_id).toBe('MAT-001');
    });

    it('should call findByStatus', async () => {
      batchService.findByStatus.mockResolvedValue({
        data: [batchResponse],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await controller.findByStatus(
        BatchStatus.InProgress,
        1,
        20,
      );

      expect(batchService.findByStatus).toHaveBeenCalledWith(
        BatchStatus.InProgress,
        1,
        20,
      );
      expect(result.data[0]?.status).toBe(BatchStatus.InProgress);
    });

    it('should call findOne by id', async () => {
      batchService.findOne.mockResolvedValue(batchResponse);

      const result = await controller.findOne(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );

      expect(batchService.findOne).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );
      expect(result.batch_number).toBe('BATCH-2026-001');
    });

    it('should call create with dto', async () => {
      const dto: CreateProductionBatchDto = {
        batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
        product_id: 'MAT-001',
        batch_number: 'BATCH-2026-001',
        unit_of_measure: 'kg',
        shelf_life_value: 24,
        shelf_life_unit: 'month',
        status: BatchStatus.InProgress,
        batch_size: 500,
      };
      batchService.create.mockResolvedValue(batchResponse);

      const result = await controller.create(dto);

      expect(batchService.create).toHaveBeenCalledWith(dto);
      expect(result.batch_id).toBe('3d594650-3436-453f-901f-f7f66f18f8eb');
    });

    it('should call update with id and dto', async () => {
      const dto: UpdateProductionBatchDto = {
        status: BatchStatus.Complete,
      };
      batchService.update.mockResolvedValue({
        ...batchResponse,
        status: BatchStatus.Complete,
      });

      const result = await controller.update(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        dto,
      );

      expect(batchService.update).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        dto,
      );
      expect(result.status).toBe(BatchStatus.Complete);
    });

    it('should call remove by id', async () => {
      batchService.remove.mockResolvedValue({
        message:
          "Production batch '3d594650-3436-453f-901f-f7f66f18f8eb' deleted successfully",
      });

      const result = await controller.remove(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );

      expect(batchService.remove).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('batch component nested endpoints', () => {
    it('should call findComponents', async () => {
      componentService.findByBatchId.mockResolvedValue([componentResponse]);

      const result = await controller.findComponents(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );

      expect(componentService.findByBatchId).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
      );
      expect(result[0]?.component_id).toBe(
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );
    });

    it('should call findOneComponent', async () => {
      componentService.findOne.mockResolvedValue(componentResponse);

      const result = await controller.findOneComponent(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );

      expect(componentService.findOne).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );
      expect(result.component_id).toBe('f5f7d95c-95e2-4314-81d2-3989f95a11a4');
    });

    it('should call createComponent with batch id and dto', async () => {
      const dto: CreateBatchComponentDto = {
        lot_id: '34b8ad57-1f77-468c-8f96-df6f8bdb3354',
        planned_quantity: 100,
        actual_quantity: 95,
        unit_of_measure: 'kg',
        addition_date: '2026-01-15T00:00:00.000Z',
        added_by: 'operator-01',
      };
      componentService.create.mockResolvedValue(componentResponse);

      const result = await controller.createComponent(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        dto,
      );

      expect(componentService.create).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        dto,
      );
      expect(result.component_id).toBe('f5f7d95c-95e2-4314-81d2-3989f95a11a4');
    });

    it('should call updateComponent with ids and dto', async () => {
      const dto: UpdateBatchComponentDto = {
        actual_quantity: 99,
      };
      componentService.update.mockResolvedValue({
        ...componentResponse,
        actual_quantity: '99',
      });

      const result = await controller.updateComponent(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
        dto,
      );

      expect(componentService.update).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
        dto,
      );
      expect(result.actual_quantity).toBe('99');
    });

    it('should call removeComponent', async () => {
      componentService.remove.mockResolvedValue({
        message:
          "Batch component 'f5f7d95c-95e2-4314-81d2-3989f95a11a4' deleted successfully",
      });

      const result = await controller.removeComponent(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );

      expect(componentService.remove).toHaveBeenCalledWith(
        '3d594650-3436-453f-901f-f7f66f18f8eb',
        'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      );
      expect(result.message).toContain('deleted successfully');
    });
  });
});
