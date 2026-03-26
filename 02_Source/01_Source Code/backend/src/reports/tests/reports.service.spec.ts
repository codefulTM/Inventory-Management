import { ReportsService } from '../reports.service';
import { ReportsRepository } from '../repositories/reports.repository';

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
  });

  it('should map date query range into material usage report', async () => {
    repo.getMaterialUsage.mockResolvedValue([]);

    const result = await service.getMaterialUsageReport(
      '2026-01-01',
      '2026-03-01',
    );

    expect(repo.getMaterialUsage).toHaveBeenCalledTimes(1);
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
  });
});
