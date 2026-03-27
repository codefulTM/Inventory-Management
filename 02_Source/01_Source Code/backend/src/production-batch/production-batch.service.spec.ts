import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductionBatchService } from './production-batch.service';
import { ProductionBatchRepository } from './production-batch.repository';
import { Material } from '../schemas/material.schema';
import {
  CreateProductionBatchDto,
  BatchStatus,
} from './dto/create-production-batch.dto';
import { UpdateProductionBatchDto } from './dto/update-production-batch.dto';

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockBatchDoc: any = {
  _id: 'mongo-id-1',
  batch_id: 'batch-uuid-1',
  product_id: 'MAT-001',
  batch_number: 'BATCH-2026-001',
  unit_of_measure: 'kg',
  shelf_life_value: 24,
  shelf_life_unit: 'month',
  status: BatchStatus.InProgress,
  batch_size: { toString: () => '500' },
  created_date: new Date(),
  modified_date: new Date(),
};

const mockCreateDto: CreateProductionBatchDto = {
  batch_id: 'batch-uuid-1',
  product_id: 'MAT-001',
  batch_number: 'BATCH-2026-001',
  unit_of_measure: 'kg',
  shelf_life_value: 24,
  shelf_life_unit: 'month',
  status: BatchStatus.InProgress,
  batch_size: 500,
};

const mockMaterialDoc: any = {
  material_id: 'MAT-001',
  material_name: 'Test API',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMockRepository() {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByBatchNumber: jest.fn(),
    findByProductId: jest.fn(),
    findByStatus: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

function buildMockMaterialModel() {
  const execMock = jest.fn();
  const findOneMock = jest.fn().mockReturnValue({ exec: execMock });
  return { findOne: findOneMock, _exec: execMock };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('ProductionBatchService', () => {
  let service: ProductionBatchService;
  let repository: ReturnType<typeof buildMockRepository>;
  let materialModel: ReturnType<typeof buildMockMaterialModel>;

  beforeEach(async () => {
    repository = buildMockRepository();
    materialModel = buildMockMaterialModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionBatchService,
        { provide: ProductionBatchRepository, useValue: repository },
        { provide: getModelToken(Material.name), useValue: materialModel },
      ],
    }).compile();

    service = module.get<ProductionBatchService>(ProductionBatchService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('happy path — should create and return a batch response', async () => {
      repository.findByBatchNumber.mockResolvedValue(null);
      materialModel._exec.mockResolvedValue(mockMaterialDoc);
      repository.create.mockResolvedValue(mockBatchDoc);

      const result = await service.create(mockCreateDto);

      expect(result.batch_id).toBe('batch-uuid-1');
      expect(result.batch_number).toBe('BATCH-2026-001');
      expect(result.batch_size).toBe('500');
      expect(repository.findByBatchNumber).toHaveBeenCalledWith(
        'BATCH-2026-001',
      );
      expect(repository.create).toHaveBeenCalledWith(mockCreateDto);
    });

    it('should throw ConflictException when batch_number already exists', async () => {
      repository.findByBatchNumber.mockResolvedValue(mockBatchDoc);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when shelf_life_value is non-positive', async () => {
      repository.findByBatchNumber.mockResolvedValue(null);

      const invalidDto: CreateProductionBatchDto = {
        ...mockCreateDto,
        shelf_life_value: 0,
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when shelf_life_unit is invalid', async () => {
      repository.findByBatchNumber.mockResolvedValue(null);

      const invalidDto: CreateProductionBatchDto = {
        ...mockCreateDto,
        shelf_life_unit: 'invalid-unit' as any,
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product_id does not exist in Materials', async () => {
      repository.findByBatchNumber.mockResolvedValue(null);
      materialModel._exec.mockResolvedValue(null); // product not found

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    describe('traceability & audit fields', () => {
      it('should set created_by and status on create', async () => {
        repository.findByBatchNumber.mockResolvedValue(null);
        materialModel._exec.mockResolvedValue(mockMaterialDoc);
        repository.create.mockResolvedValue({
          ...mockBatchDoc,
          created_by: 'manager1',
          status: 'In Progress',
        });
        const dto = { ...mockCreateDto, created_by: 'manager1' };
        const result = await service.create(dto as any);
        expect(result.created_by).toBe('manager1');
        expect(result.status).toBe('In Progress');
      });
    });
  });

  // ─── findOne() ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return batch response when found', async () => {
      repository.findOne.mockResolvedValue(mockBatchDoc);

      const result = await service.findOne('batch-uuid-1');

      expect(result.batch_id).toBe('batch-uuid-1');
      expect(repository.findOne).toHaveBeenCalledWith('batch-uuid-1');
    });

    it('should throw NotFoundException when batch does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findAll() ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated batches', async () => {
      repository.findAll.mockResolvedValue({
        data: [mockBatchDoc],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should throw BadRequestException when page < 1', async () => {
      await expect(service.findAll(0, 20)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit < 1', async () => {
      await expect(service.findAll(1, 0)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── update() ───────────────────────────────────────────────────────────────

  describe('update() — status state machine', () => {
    it('should allow valid transition: In Progress → Complete', async () => {
      repository.findOne.mockResolvedValue(mockBatchDoc); // status = In Progress
      const updatedDoc = { ...mockBatchDoc, status: BatchStatus.Complete };
      repository.update.mockResolvedValue(updatedDoc);

      const dto: UpdateProductionBatchDto = { status: BatchStatus.Complete };
      const result = await service.update('batch-uuid-1', dto);

      expect(result.status).toBe(BatchStatus.Complete);
    });

    it('should allow valid transition: In Progress → On Hold', async () => {
      repository.findOne.mockResolvedValue(mockBatchDoc);
      repository.update.mockResolvedValue({
        ...mockBatchDoc,
        status: BatchStatus.OnHold,
      });

      const result = await service.update('batch-uuid-1', {
        status: BatchStatus.OnHold,
      });

      expect(result.status).toBe(BatchStatus.OnHold);
    });

    it('should throw BadRequestException for invalid transition: Complete → In Progress', async () => {
      const completedBatch = { ...mockBatchDoc, status: BatchStatus.Complete };
      repository.findOne.mockResolvedValue(completedBatch);

      await expect(
        service.update('batch-uuid-1', { status: BatchStatus.InProgress }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid transition: Cancelled → In Progress', async () => {
      const cancelledBatch = { ...mockBatchDoc, status: BatchStatus.Cancelled };
      repository.findOne.mockResolvedValue(cancelledBatch);

      await expect(
        service.update('batch-uuid-1', { status: BatchStatus.InProgress }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when updating a non-existent batch', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { status: BatchStatus.Complete }),
      ).rejects.toThrow(NotFoundException);
    });

    describe('traceability & audit fields', () => {
      it('should update approved_by, completed_by, status on update', async () => {
        const updated = {
          ...mockBatchDoc,
          approved_by: 'admin1',
          completed_by: 'operator1',
          status: 'Complete',
        };
        repository.update.mockResolvedValue(updated);
        const dto = {
          approved_by: 'admin1',
          completed_by: 'operator1',
          status: 'Complete',
        };
        const result = await service.update(mockBatchDoc.batch_id, dto as any);
        expect(result.approved_by).toBe('admin1');
        expect(result.completed_by).toBe('operator1');
        expect(result.status).toBe('Complete');
      });
    });
  });

  // ─── remove() ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should delete a batch that is not In Progress', async () => {
      const completedBatch = { ...mockBatchDoc, status: BatchStatus.Complete };
      repository.findOne.mockResolvedValue(completedBatch);
      repository.remove.mockResolvedValue(completedBatch);

      const result = await service.remove('batch-uuid-1');

      expect(result.message).toContain('batch-uuid-1');
      expect(repository.remove).toHaveBeenCalledWith('batch-uuid-1');
    });

    it('should throw BadRequestException when deleting a batch with status In Progress', async () => {
      repository.findOne.mockResolvedValue(mockBatchDoc); // status = In Progress

      await expect(service.remove('batch-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when batch does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
