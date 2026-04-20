import { DashboardService } from './dashboard.service';
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { InventoryTransactionRepository } from '../inventory-transaction/inventory-transaction.repository';
import { WarehouseSlipRepository } from '../warehouse-slip/warehouse-slip.repository';

describe('DashboardService', () => {
  let service: DashboardService;
  let txRepo: jest.Mocked<Pick<InventoryTransactionRepository, 'aggregate'>>;
  let lotRepo: jest.Mocked<Pick<InventoryLotRepository, 'aggregate'>>;
  let slipRepo: jest.Mocked<Partial<WarehouseSlipRepository>>;

  beforeEach(() => {
    txRepo = { aggregate: jest.fn() } as any;
    lotRepo = { aggregate: jest.fn() } as any;
    slipRepo = {} as any;

    // Note: constructor order is (txRepo, lotRepo, slipRepo)
    service = new DashboardService(
      txRepo as any,
      lotRepo as any,
      slipRepo as any,
    );
  });

  it('getSummary returns aggregated totals and top materials', async () => {
    lotRepo.aggregate.mockResolvedValueOnce([
      {
        _id: 'MAT-001',
        total_quantity: 10,
        total_value: 100,
        material_name: 'Acetone',
      },
      {
        _id: 'MAT-002',
        total_quantity: 5,
        total_value: 50,
        material_name: 'Ethanol',
      },
    ] as any);

    txRepo.aggregate.mockResolvedValueOnce([
      { _id: 'MAT-001', total_quantity: 8, material_name: 'Acetone' },
      { _id: 'MAT-002', total_quantity: 3, material_name: 'Ethanol' },
    ] as any);

    const res = await service.getSummary({});

    expect(res.total_quantity).toBe(15);
    expect(res.total_value).toBe(150);
    expect(res.top_materials).toEqual([
      { material_id: 'MAT-001', material_name: 'Acetone', total_quantity: 8 },
      { material_id: 'MAT-002', material_name: 'Ethanol', total_quantity: 3 },
    ]);
  });

  it('getTrends maps aggregation rows to period/total_quantity', async () => {
    txRepo.aggregate.mockResolvedValueOnce([
      { _id: '2026-04-20', total_quantity: 5 },
      { _id: '2026-04-21', total_quantity: 3 },
    ] as any);

    const rows = await service.getTrends({
      metric: 'in',
      from: '2026-04-20',
      to: '2026-04-21',
    });

    expect(rows).toEqual([
      { period: '2026-04-20', total_quantity: 5 },
      { period: '2026-04-21', total_quantity: 3 },
    ]);
  });

  it('getDrilldown returns paginated items and total count', async () => {
    const items = [
      { transaction_id: 'T1', lot_id: 'L1', quantity: 5 },
      { transaction_id: 'T2', lot_id: 'L2', quantity: 7 },
    ];

    // txRepo.aggregate is called twice: once for items, once for count
    txRepo.aggregate.mockImplementation(async (pipeline: any[]) => {
      const hasCount = pipeline.some((p) => p && p.$count);
      if (hasCount) return [{ total: 2 }] as any;
      return items as any;
    });

    const resp = await service.getDrilldown({ page: 1, limit: 10 });

    expect(resp.items).toEqual(items);
    expect(resp.total).toBe(2);
    expect(resp.page).toBe(1);
    expect(resp.limit).toBe(10);
  });
});
