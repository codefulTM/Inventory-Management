import { ReportsService } from '../../src/reports/reports.service';
import { ReportsRepository } from '../../src/reports/repositories/reports.repository';

describe('ReportsService', () => {
  const repo: jest.Mocked<ReportsRepository> = {
    getInventoryStatus: jest.fn(),
    getMaterialUsage: jest.fn(),
    getQcPerformance: jest.fn(),
    getAuditTrail: jest.fn(),
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
});
