import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QCTestService } from './qc-test.service';
import { QCTestRepository } from './qc-test.repository';
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { ProductionBatchService } from '../production-batch/production-batch.service';
import { RedisIdService } from '../redis-id/redis-id.service';

const mockRedisIdService = {
  nextId: jest.fn().mockImplementation((prefix: string) => Promise.resolve(`${prefix}-1`)),
} as unknown as RedisIdService;

describe('QCTestService batch init', () => {
  let service: QCTestService;

  const mockRepository = {
    findByLotId: jest.fn(),
    create: jest.fn(),
  } as unknown as QCTestRepository;

  const mockInventoryLotService = {
    search: jest.fn(),
    findById: jest.fn(),
  } as unknown as InventoryLotService;

  const mockProductionBatchService = {
    findOne: jest.fn(),
  } as unknown as ProductionBatchService;

  beforeEach(() => {
    service = new QCTestService(
      mockRepository,
      mockInventoryLotService,
      mockProductionBatchService,
      mockRedisIdService,
    );

    jest.clearAllMocks();
  });

  it('should create pending QC test from completed batch output lot', async () => {
    (mockProductionBatchService.findOne as jest.Mock).mockResolvedValue({
      batch_id: 'batch-1',
      batch_number: 'BATCH-001',
      product_id: 'MAT-001',
    });

    (mockInventoryLotService.search as jest.Mock).mockResolvedValue({
      data: [
        {
          lot_id: 'LOT-001',
          manufacturer_lot: 'BATCH-001',
          material_id: 'MAT-001',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    (mockRepository.findByLotId as jest.Mock).mockResolvedValue([]);
    (mockInventoryLotService.findById as jest.Mock).mockResolvedValue({ lot_id: 'LOT-001' });
    (mockRepository.create as jest.Mock).mockResolvedValue({
      test_id: 'test-uuid-1',
      lot_id: 'LOT-001',
      result_status: 'Pending',
    });

    const result = await service.initTestFromBatch('batch-1', {
      performed_by: 'qc_user_01',
    });

    expect(mockProductionBatchService.findOne).toHaveBeenCalledWith('batch-1');
    expect(mockInventoryLotService.search).toHaveBeenCalledWith(
      'BATCH-001',
      1,
      20,
    );
    expect(mockRepository.create).toHaveBeenCalled();
    expect(result.result_status).toBe('Pending');
  });

  it('should throw when batch output lot cannot be found', async () => {
    (mockProductionBatchService.findOne as jest.Mock).mockResolvedValue({
      batch_id: 'batch-1',
      batch_number: 'BATCH-001',
      product_id: 'MAT-001',
    });
    (mockInventoryLotService.search as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await expect(
      service.initTestFromBatch('batch-1', { performed_by: 'qc_user_01' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw when pending batch QC test already exists', async () => {
    (mockProductionBatchService.findOne as jest.Mock).mockResolvedValue({
      batch_id: 'batch-1',
      batch_number: 'BATCH-001',
      product_id: 'MAT-001',
    });

    (mockInventoryLotService.search as jest.Mock).mockResolvedValue({
      data: [
        {
          lot_id: 'LOT-001',
          manufacturer_lot: 'BATCH-001',
          material_id: 'MAT-001',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    (mockRepository.findByLotId as jest.Mock).mockResolvedValue([
      {
        test_id: 'old-1',
        result_status: 'Pending',
        test_method: 'Batch Completion QC',
      },
    ]);

    await expect(
      service.initTestFromBatch('batch-1', { performed_by: 'qc_user_01' }),
    ).rejects.toThrow(BadRequestException);
  });
});
