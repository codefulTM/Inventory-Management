/**
 * Contract tests — gRPC MetricsReportsService (api-gateway ↔ metrics-service)
 *
 * Verifies that ReportsController correctly calls gRPC methods with the shapes
 * defined in metrics.proto. Uses NestJS testing module with mocked gRPC client.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { INestApplication, InternalServerErrorException } from '@nestjs/common';
import { ReportsController } from '../reports/reports.controller';
import { METRICS_SERVICE_TOKEN } from './grpc.module';

// ── proto-defined response shapes ──────────────────────────────────────────

const inventoryStatusResponse = {
  generated_at: '2026-04-19T00:00:00.000Z',
  total_lots: 2,
  items: [
    { material_id: 'MAT-001', lot_id: 'LOT-001', quantity: 50, status: 'Accepted', expiration_date: '2027-01-01' },
    { material_id: 'MAT-002', lot_id: 'LOT-002', quantity: 10, status: 'Quarantine', expiration_date: '' },
  ],
};

const materialUsageResponse = {
  generated_at: '2026-04-19T00:00:00.000Z',
  from: '2026-01-01',
  to: '2026-04-01',
  items: [
    { material_id: 'MAT-001', transaction_count: 5, total_quantity: 200 },
  ],
};

const qcPerformanceResponse = {
  generated_at: '2026-04-19T00:00:00.000Z',
  items: [
    { supplier_name: 'ABC Corp', approved: 9, rejected: 1, quality_rate: 90 },
  ],
};

const auditReportResponse = {
  generated_at: '2026-04-19T00:00:00.000Z',
  entries: [
    { action: 'UPDATE', entity: 'InventoryLot', performed_by: 'op1', performed_at: '2026-04-01T10:00:00Z' },
  ],
};

// ── mock gRPC client ────────────────────────────────────────────────────────

const mockMetricsGrpcService = {
  GetInventoryStatus: jest.fn().mockReturnValue(of(inventoryStatusResponse)),
  GetMaterialUsage: jest.fn().mockReturnValue(of(materialUsageResponse)),
  GetQcPerformance: jest.fn().mockReturnValue(of(qcPerformanceResponse)),
  GetAuditReport: jest.fn().mockReturnValue(of(auditReportResponse)),
};

const mockGrpcClient = {
  getService: jest.fn().mockReturnValue(mockMetricsGrpcService),
};

describe('MetricsReportsService gRPC contract (api-gateway ↔ metrics-service)', () => {
  let controller: ReportsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: METRICS_SERVICE_TOKEN, useValue: mockGrpcClient },
      ],
    }).compile();

    controller = testModule.get<ReportsController>(ReportsController);
    controller.onModuleInit();
  });

  // ── service discovery ───────────────────────────────────────────────────

  it('resolves "MetricsReportsService" package from gRPC client', () => {
    expect(mockGrpcClient.getService).toHaveBeenCalledWith('MetricsReportsService');
  });

  // ── GetInventoryStatus ──────────────────────────────────────────────────

  describe('GetInventoryStatus RPC', () => {
    it('calls gRPC with empty request object {}', async () => {
      await controller.getInventoryStatus();

      expect(mockMetricsGrpcService.GetInventoryStatus).toHaveBeenCalledWith({});
    });

    it('returns InventoryStatusResponse shape: generated_at, total_lots, items[]', async () => {
      const result = await controller.getInventoryStatus();

      expect(result).toHaveProperty('generated_at');
      expect(result).toHaveProperty('total_lots', 2);
      expect(result).toHaveProperty('items');
      expect(result.items[0]).toHaveProperty('material_id');
      expect(result.items[0]).toHaveProperty('quantity');
      expect(result.items[0]).toHaveProperty('status');
    });

    it('throws InternalServerErrorException when gRPC fails', async () => {
      mockMetricsGrpcService.GetInventoryStatus.mockReturnValueOnce(
        throwError(() => new Error('connection refused')),
      );

      await expect(controller.getInventoryStatus()).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── GetMaterialUsage ────────────────────────────────────────────────────

  describe('GetMaterialUsage RPC', () => {
    it('forwards from and to date strings to gRPC', async () => {
      await controller.getMaterialUsage('2026-01-01', '2026-04-01');

      expect(mockMetricsGrpcService.GetMaterialUsage).toHaveBeenCalledWith(
        { from: '2026-01-01', to: '2026-04-01' },
      );
    });

    it('calls gRPC with undefined dates when not provided', async () => {
      await controller.getMaterialUsage();

      expect(mockMetricsGrpcService.GetMaterialUsage).toHaveBeenCalledWith(
        { from: undefined, to: undefined },
      );
    });

    it('response has MaterialUsageResponse shape', async () => {
      const result = await controller.getMaterialUsage('2026-01-01', '2026-04-01');

      expect(result).toHaveProperty('generated_at');
      expect(result).toHaveProperty('items');
      expect(result.items[0]).toHaveProperty('material_id');
      expect(result.items[0]).toHaveProperty('transaction_count');
      expect(result.items[0]).toHaveProperty('total_quantity');
    });

    it('throws InternalServerErrorException when gRPC fails', async () => {
      mockMetricsGrpcService.GetMaterialUsage.mockReturnValueOnce(
        throwError(() => new Error('timeout')),
      );

      await expect(controller.getMaterialUsage()).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── GetQcPerformance ────────────────────────────────────────────────────

  describe('GetQcPerformance RPC', () => {
    it('calls gRPC with empty request {}', async () => {
      await controller.getQcPerformance();

      expect(mockMetricsGrpcService.GetQcPerformance).toHaveBeenCalledWith({});
    });

    it('response has QcPerformanceResponse shape', async () => {
      const result = await controller.getQcPerformance();

      expect(result).toHaveProperty('items');
      expect(result.items[0]).toHaveProperty('supplier_name');
      expect(result.items[0]).toHaveProperty('approved');
      expect(result.items[0]).toHaveProperty('rejected');
      expect(result.items[0]).toHaveProperty('quality_rate');
    });
  });

  // ── GetAuditReport ──────────────────────────────────────────────────────

  describe('GetAuditReport RPC', () => {
    it('forwards page and size as integers', async () => {
      await controller.getAuditReport('2', '50');

      expect(mockMetricsGrpcService.GetAuditReport).toHaveBeenCalledWith(
        { page: 2, size: 50 },
      );
    });

    it('uses defaults (page=0, size=20) when not provided', async () => {
      await controller.getAuditReport();

      expect(mockMetricsGrpcService.GetAuditReport).toHaveBeenCalledWith(
        { page: 0, size: 20 },
      );
    });

    it('response has AuditReportResponse shape', async () => {
      const result = await controller.getAuditReport();

      expect(result).toHaveProperty('generated_at');
      expect(result).toHaveProperty('entries');
      expect(result.entries[0]).toHaveProperty('action');
      expect(result.entries[0]).toHaveProperty('performed_by');
    });

    it('throws InternalServerErrorException when gRPC fails', async () => {
      mockMetricsGrpcService.GetAuditReport.mockReturnValueOnce(
        throwError(() => new Error('metrics-service down')),
      );

      await expect(controller.getAuditReport()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
