import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QCTestService } from './qc-test.service';
import { QCTestRepository } from './qc-test.repository';
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';

const mockLot = {
  lot_id: 'lot-001',
  status: 'Quarantine',
  manufacturer_name: 'PharmaCo',
  supplier_name: 'PharmaCo',
};

const mockTest = {
  test_id: 'test-001',
  lot_id: 'lot-001',
  test_type: 'Physical',
  test_method: 'USP <905>',
  test_date: new Date('2026-03-08'),
  test_result: 'Pass value',
  result_status: 'Pending',
  performed_by: 'qc_user_01',
};

const mockQCTestRepository = {
  create: jest.fn(),
  findByTestId: jest.fn(),
  findByLotId: jest.fn(),
  findAll: jest.fn(),
  updateByTestId: jest.fn(),
  updateManyByLotId: jest.fn(),
  deleteByTestId: jest.fn(),
  countByResultStatus: jest.fn(),
  findInDateRange: jest.fn(),
};

const mockInventoryLotService = {
  getLotById: jest.fn(),
  updateLotStatus: jest.fn(),
  updateLot: jest.fn(),
  getLotsByStatus: jest.fn(),
  getLotsByIds: jest.fn(),
};

describe('QCTestService', () => {
  let service: QCTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QCTestService,
        { provide: QCTestRepository, useValue: mockQCTestRepository },
        { provide: InventoryLotService, useValue: mockInventoryLotService },
      ],
    }).compile();

    service = module.get<QCTestService>(QCTestService);
    jest.clearAllMocks();
  });

  // ─── 9.1 createTest ──────────────────────────────────────────────────────

  describe('createTest()', () => {
    it('should create a test successfully when lot exists', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.create.mockResolvedValue({
        ...mockTest,
        test_id: expect.any(String),
      });

      const dto = {
        lot_id: 'lot-001',
        test_type: 'Physical' as const,
        test_method: 'USP <905>',
        test_date: '2026-03-08',
        test_result: 'Pass value',
        result_status: 'Pending' as const,
        performed_by: 'qc_user_01',
      };

      const result = await service.createTest(dto);

      expect(mockInventoryLotService.getLotById).toHaveBeenCalledWith(
        'lot-001',
      );
      expect(mockQCTestRepository.create).toHaveBeenCalled();
      const createArg = mockQCTestRepository.create.mock.calls[0][0];
      expect(createArg.test_id).toBeDefined();
      // Validate UUID v4 format
      expect(createArg.test_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when lot does not exist', async () => {
      mockInventoryLotService.getLotById.mockRejectedValue(
        new NotFoundException("InventoryLot 'lot-999' not found"),
      );

      await expect(
        service.createTest({
          lot_id: 'lot-999',
          test_type: 'Physical',
          test_method: 'USP',
          test_date: '2026-03-08',
          test_result: 'some result',
          result_status: 'Pending',
          performed_by: 'qc_user_01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate test_id as UUID v4', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.create.mockResolvedValue(mockTest);

      await service.createTest({
        lot_id: 'lot-001',
        test_type: 'Physical',
        test_method: 'USP',
        test_date: '2026-03-08',
        test_result: 'result',
        result_status: 'Pending',
        performed_by: 'qc_user_01',
      });

      const createArg = mockQCTestRepository.create.mock.calls[0][0];
      expect(createArg.test_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  // ─── 9.2 submitDecision — Approved ───────────────────────────────────────

  describe('submitDecision() — Accepted', () => {
    it('should update lot status to Accepted', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([
        { ...mockTest, result_status: 'Pass' },
      ]);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Accepted',
      });

      const result = await service.submitDecision('lot-001', {
        decision: 'Accepted',
        verified_by: 'qc_manager_01',
      });

      expect(mockInventoryLotService.updateLotStatus).toHaveBeenCalledWith(
        'lot-001',
        'Accepted',
      );
      expect(result.lot.status).toBe('Accepted');
    });

    it('should update QCTest result_status to Pass', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([
        { ...mockTest, result_status: 'Pass' },
      ]);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Accepted',
      });

      const result = await service.submitDecision('lot-001', {
        decision: 'Accepted',
        verified_by: 'qc_manager_01',
      });

      const updateArg = mockQCTestRepository.updateManyByLotId.mock.calls[0][2];
      expect(updateArg.result_status).toBe('Pass');
      expect(updateArg.verified_by).toBe('qc_manager_01');
    });
  });

  // ─── 9.3 submitDecision — Rejected ───────────────────────────────────────

  describe('submitDecision() — Rejected', () => {
    it('should update lot status to Rejected', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([
        { ...mockTest, result_status: 'Fail' },
      ]);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Rejected',
      });

      const result = await service.submitDecision('lot-001', {
        decision: 'Rejected',
        reject_reason: 'Out of specification',
        verified_by: 'qc_manager_01',
      });

      expect(mockInventoryLotService.updateLotStatus).toHaveBeenCalledWith(
        'lot-001',
        'Rejected',
      );
      expect(result.lot.status).toBe('Rejected');
    });

    it('should update QCTest result_status to Fail', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([
        { ...mockTest, result_status: 'Fail' },
      ]);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Rejected',
      });

      await service.submitDecision('lot-001', {
        decision: 'Rejected',
        reject_reason: 'Out of specification',
        verified_by: 'qc_manager_01',
      });

      const updateArg = mockQCTestRepository.updateManyByLotId.mock.calls[0][2];
      expect(updateArg.result_status).toBe('Fail');
    });

    it('should throw BadRequestException when reject_reason is empty', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);

      await expect(
        service.submitDecision('lot-001', {
          decision: 'Rejected',
          reject_reason: '',
          verified_by: 'qc_manager_01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reject_reason is missing', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);

      await expect(
        service.submitDecision('lot-001', {
          decision: 'Rejected',
          verified_by: 'qc_manager_01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save reject_reason to QCTest', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([mockTest]);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Rejected',
      });

      await service.submitDecision('lot-001', {
        decision: 'Rejected',
        reject_reason: 'Out of specification',
        verified_by: 'qc_manager_01',
      });

      const updateArg = mockQCTestRepository.updateManyByLotId.mock.calls[0][2];
      expect(updateArg.reject_reason).toBe('Out of specification');
    });
  });

  // ─── 9.4 submitDecision — Hold ────────────────────────────────────────────

  describe('submitDecision() — Hold', () => {
    it('should update lot status to Hold', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([mockTest]);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Hold',
      });

      const result = await service.submitDecision('lot-001', {
        decision: 'Hold',
        verified_by: 'qc_manager_01',
      });

      expect(mockInventoryLotService.updateLotStatus).toHaveBeenCalledWith(
        'lot-001',
        'Hold',
      );
      expect(result.lot.status).toBe('Hold');
    });

    it('should keep QCTest result_status as Pending', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([mockTest]);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Hold',
      });

      await service.submitDecision('lot-001', {
        decision: 'Hold',
        verified_by: 'qc_manager_01',
      });

      const updateArg = mockQCTestRepository.updateManyByLotId.mock.calls[0][2];
      expect(updateArg.result_status).toBe('Pending');
    });
  });

  // ─── 9.5 submitRetestDecision — extend ───────────────────────────────────

  describe('submitRetestDecision() — extend', () => {
    it('should update expiration_date to new date', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockInventoryLotService.updateLot.mockResolvedValue({
        ...mockLot,
        status: 'Accepted',
        expiration_date: new Date('2028-03-08'),
      });
      mockQCTestRepository.create.mockResolvedValue(mockTest);

      const result = await service.submitRetestDecision('lot-001', 'extend', {
        new_expiry_date: '2028-03-08',
        performed_by: 'qc_user_01',
      });

      expect(mockInventoryLotService.updateLot).toHaveBeenCalledWith(
        'lot-001',
        expect.objectContaining({
          status: 'Accepted',
          expiration_date: new Date('2028-03-08'),
        }),
      );
    });

    it('should throw BadRequestException when new_expiry_date is missing', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);

      await expect(
        service.submitRetestDecision('lot-001', 'extend', {
          performed_by: 'qc_user_01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── 9.6 submitRetestDecision — discard ──────────────────────────────────

  describe('submitRetestDecision() — discard', () => {
    it('should update lot status to Depleted', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockInventoryLotService.updateLotStatus.mockResolvedValue({
        ...mockLot,
        status: 'Depleted',
      });
      mockQCTestRepository.create.mockResolvedValue(mockTest);

      const result = await service.submitRetestDecision('lot-001', 'discard', {
        performed_by: 'qc_user_01',
      });

      expect(mockInventoryLotService.updateLotStatus).toHaveBeenCalledWith(
        'lot-001',
        'Depleted',
      );
      expect(result.status).toBe('Depleted');
    });
  });

  // ─── 9.7 getDashboardKPI ─────────────────────────────────────────────────

  describe('getDashboardKPI()', () => {
    it('should calculate error_rate correctly', async () => {
      mockInventoryLotService.getLotsByStatus.mockResolvedValue([
        mockLot,
        mockLot,
      ]);
      mockQCTestRepository.countByResultStatus
        .mockResolvedValueOnce(8) // Pass
        .mockResolvedValueOnce(2); // Fail

      const result = await service.getDashboardKPI();

      expect(result.pending_count).toBe(2);
      expect(result.approved_count).toBe(8);
      expect(result.rejected_count).toBe(2);
      expect(result.error_rate).toBe(20); // 2 / (8+2) * 100 = 20
    });

    it('should return 0 for error_rate when no tests exist', async () => {
      mockInventoryLotService.getLotsByStatus.mockResolvedValue([]);
      mockQCTestRepository.countByResultStatus.mockResolvedValue(0);

      const result = await service.getDashboardKPI();

      expect(result.error_rate).toBe(0);
      expect(result.pending_count).toBe(0);
    });
  });

  describe('traceability & audit fields', () => {
    it('should set performed_by and status on create', async () => {
      mockInventoryLotService.getLotById.mockResolvedValue(mockLot);
      mockQCTestRepository.create.mockResolvedValue({
        ...mockTest,
        performed_by: 'qc1',
        result_status: 'Pending',
      });
      const dto = {
        ...mockTest,
        performed_by: 'qc1',
        result_status: 'Pending',
      };
      const result = await service.createTest(dto as any);
      expect(result.performed_by).toBe('qc1');
      expect(result.result_status).toBe('Pending');
    });

    it('should update approved_by and push to history on approve', async () => {
      mockQCTestRepository.updateManyByLotId.mockResolvedValue([
        {
          ...mockTest,
          approved_by: 'manager1',
          history: [{ action: 'Approve', by: 'manager1' }],
        },
      ]);
      const result = await service.submitDecision('lot-001', {
        decision: 'Accepted',
        verified_by: 'manager1',
      } as any);
      expect(result.tests[0].approved_by).toBe('manager1');
      expect(result.tests[0].history).toEqual(
        expect.arrayContaining([{ action: 'Approve', by: 'manager1' }]),
      );
    });
  });
});
