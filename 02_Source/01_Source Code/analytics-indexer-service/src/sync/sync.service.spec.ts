import { SyncService } from './sync.service';

describe('SyncService', () => {
  const mockWatermark = {
    getWatermark: jest.fn(),
    setWatermark: jest.fn(),
    getAllWatermarks: jest.fn(),
    resetWatermarks: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue(500),
  };

  const mockEsClient = {
    count: jest.fn(),
  };

  const mockIndexTemplateService = {
    applyTemplates: jest.fn(),
    purgeStaleIndices: jest.fn(),
  };

  const createSyncer = (collectionName: string) => ({
    collectionName,
    model: {
      countDocuments: jest.fn().mockResolvedValue(10),
    },
    sync: jest.fn().mockResolvedValue({
      collection: collectionName,
      indexed: 5,
      deleted: 1,
      errors: 0,
      durationMs: 12,
    }),
  });

  const inventoryLotsSync = createSyncer('inventory_lots');
  const inventoryTransactionsSync = createSyncer('inventory_transactions');
  const qcTestsSync = createSyncer('qc_tests');
  const materialsSync = createSyncer('materials');
  const auditLogsSync = createSyncer('inventory_audit_reports');
  const importExportOrdersSync = createSyncer('import_export_orders');

  const service = new SyncService(
    mockWatermark as any,
    mockConfig as any,
    mockEsClient as any,
    mockIndexTemplateService as any,
    inventoryLotsSync as any,
    inventoryTransactionsSync as any,
    qcTestsSync as any,
    materialsSync as any,
    auditLogsSync as any,
    importExportOrdersSync as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.get.mockReturnValue(500);
    mockWatermark.getWatermark.mockResolvedValue(
      new Date('2026-01-01T00:00:00.000Z'),
    );
  });

  it('runFullSync supports dry-run and template setup for selected collections', async () => {
    const summary = await service.runFullSync({
      dryRun: true,
      collections: ['inventory_lots'],
      ensureTemplates: true,
      verifyCounts: false,
    });

    expect(mockIndexTemplateService.applyTemplates).toHaveBeenCalledWith([
      'inventory_lots',
    ]);
    expect(inventoryLotsSync.sync).toHaveBeenCalledTimes(1);
    expect(mockWatermark.setWatermark).not.toHaveBeenCalled();
    expect(summary.dryRun).toBe(true);
    expect(summary.totalIndexed).toBe(5);
  });

  it('inspectWatermarks and resetWatermarks delegate to watermark service', async () => {
    mockWatermark.getAllWatermarks.mockResolvedValue({
      inventory_lots: '2026-01-01T00:00:00.000Z',
    });
    mockWatermark.resetWatermarks.mockResolvedValue(2);

    const inspected = await service.inspectWatermarks(['inventory_lots']);
    const resetCount = await service.resetWatermarks(['inventory_lots']);

    expect(inspected.inventory_lots).toBe('2026-01-01T00:00:00.000Z');
    expect(resetCount).toBe(2);
  });

  it('runCountChecks compares mongo and elasticsearch counts', async () => {
    inventoryLotsSync.model.countDocuments.mockResolvedValue(9);
    mockEsClient.count.mockResolvedValue({ count: 7 });

    const checks = await service.runCountChecks({
      collections: ['inventory_lots'],
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(checks).toHaveLength(1);
    expect(checks[0].collection).toBe('inventory_lots');
    expect(checks[0].mongoCount).toBe(9);
    expect(checks[0].esCount).toBe(7);
    expect(checks[0].gap).toBe(2);
  });
});
