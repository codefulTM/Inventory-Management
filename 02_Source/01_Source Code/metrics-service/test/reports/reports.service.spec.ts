import { ReportsService } from '../../src/reports/reports.service';
import { ReportsRepository } from '../../src/reports/repositories/reports.repository';

describe('ReportsService', () => {
  const repo: jest.Mocked<ReportsRepository> = {
    getInventoryStatus: jest.fn(),
    getMaterialUsage: jest.fn(),
    getQcPerformance: jest.fn(),
    getAuditTrail: jest.fn(),
    getInventoryTrend: jest.fn(),
    getMaterialUsageTrend: jest.fn(),
    getQcTrend: jest.fn(),
    getAuditTrend: jest.fn(),
  } as unknown as jest.Mocked<ReportsRepository>;

  const service = new ReportsService(repo);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return inventory status report with total lots', async () => {
    repo.getInventoryStatus.mockResolvedValue([
      {
        material_id: 'MAT-01',
        lot_id: 'LOT-01',
        quantity: 10,
        status: 'Accepted',
      },
    ]);

    const result = await service.getInventoryStatusReport();

    expect(result.total_lots).toBe(1);
    expect(result.items[0].lot_id).toBe('LOT-01');
    expect(result.generated_at).toBeInstanceOf(Date);
  });

  it('should map date query range into material usage report', async () => {
    repo.getMaterialUsage.mockResolvedValue([]);

    const result = await service.getMaterialUsageReport('2026-01-01', '2026-03-01');

    expect(repo.getMaterialUsage).toHaveBeenCalledTimes(1);
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
  });

  it('should return qc performance report', async () => {
    repo.getQcPerformance.mockResolvedValue([
      { supplier_name: 'Supplier A', approved: 9, rejected: 1, quality_rate: 90 },
    ]);

    const result = await service.getQcPerformanceReport();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].supplier_name).toBe('Supplier A');
    expect(result.items[0].quality_rate).toBe(90);
    expect(result.generated_at).toBeInstanceOf(Date);
  });

  it('should return audit report', async () => {
    repo.getAuditTrail.mockResolvedValue([
      {
        action: 'UPDATE',
        entity: 'InventoryLot',
        performed_by: 'user-01',
        performed_at: new Date('2026-04-01T10:00:00Z'),
      },
    ]);

    const result = await service.getAuditReport(0, 20);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].action).toBe('UPDATE');
    expect(repo.getAuditTrail).toHaveBeenCalledWith(0, 20);
  });

  it('should pass default page/size to audit trail', async () => {
    repo.getAuditTrail.mockResolvedValue([]);

    await service.getAuditReport();

    expect(repo.getAuditTrail).toHaveBeenCalledWith(0, 20);
  });

  it('should return inventory trend report', async () => {
    repo.getInventoryTrend.mockResolvedValue([
      { period: '2026-04-01', lot_count: 10, total_quantity: 1000 },
    ] as any);

    const result = await service.getInventoryTrendReport(
      '2026-04-01T00:00:00.000Z',
      '2026-04-30T23:59:59.999Z',
      'day',
    );

    expect(result.points).toHaveLength(1);
    expect(result.interval).toBe('day');
    expect(repo.getInventoryTrend).toHaveBeenCalledTimes(1);
  });

  it('should return material usage trend report with limit', async () => {
    repo.getMaterialUsageTrend.mockResolvedValue([
      {
        period: '2026-04-01',
        material_id: 'MAT-01',
        transaction_count: 5,
        total_quantity: 250,
      },
    ] as any);

    const result = await service.getMaterialUsageTrendReport(
      '2026-04-01T00:00:00.000Z',
      '2026-04-30T23:59:59.999Z',
      'day',
      8,
    );

    expect(result.points).toHaveLength(1);
    expect(repo.getMaterialUsageTrend).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      'day',
      8,
    );
  });

  it('should return qc trend report with supplier rankings', async () => {
    repo.getQcTrend.mockResolvedValue({
      points: [
        { period: '2026-04-01', pass_count: 8, fail_count: 2, pending_count: 1 },
      ],
      supplier_rankings: [
        { supplier_name: 'Supplier A', pass_count: 8, fail_count: 2, quality_rate: 80 },
      ],
    } as any);

    const result = await service.getQcTrendReport(
      '2026-04-01T00:00:00.000Z',
      '2026-04-30T23:59:59.999Z',
      'day',
      6,
    );

    expect(result.points).toHaveLength(1);
    expect(result.supplier_rankings).toHaveLength(1);
  });

  it('should return audit trend report', async () => {
    repo.getAuditTrend.mockResolvedValue([
      { period: '2026-04-01', activity_count: 10, unique_users: 3 },
    ] as any);

    const result = await service.getAuditTrendReport(
      '2026-04-01T00:00:00.000Z',
      '2026-04-30T23:59:59.999Z',
      'day',
    );

    expect(result.points).toHaveLength(1);
    expect(repo.getAuditTrend).toHaveBeenCalledTimes(1);
  });
});
