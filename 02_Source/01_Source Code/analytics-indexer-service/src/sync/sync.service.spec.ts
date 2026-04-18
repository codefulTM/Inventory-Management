import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';
import { RedisWatermarkService } from '../redis/redis-watermark.service';
import { InventoryLotsSync } from './collections/inventory-lots.sync';
import { InventoryTransactionsSync } from './collections/inventory-transactions.sync';
import { QCTestsSync } from './collections/qc-tests.sync';
import { MaterialsSync } from './collections/materials.sync';
import { AuditLogsSync } from './collections/audit-logs.sync';
import { ImportExportOrdersSync } from './collections/import-export-orders.sync';

const makeMockSyncer = (collectionName: string) => ({
  collectionName,
  sync: jest.fn().mockResolvedValue({ collection: collectionName, indexed: 5, deleted: 0, errors: 0, durationMs: 100 }),
});

describe('SyncService', () => {
  let service: SyncService;
  let watermark: jest.Mocked<RedisWatermarkService>;
  let lotsSync: any;
  let transactionsSync: any;
  let qcTestsSync: any;
  let materialsSync: any;
  let auditLogsSync: any;
  let importExportSync: any;

  beforeEach(async () => {
    lotsSync = makeMockSyncer('inventory_lots');
    transactionsSync = makeMockSyncer('inventory_transactions');
    qcTestsSync = makeMockSyncer('qc_tests');
    materialsSync = makeMockSyncer('materials');
    auditLogsSync = makeMockSyncer('inventory_audit_reports');
    importExportSync = makeMockSyncer('import_export_orders');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: RedisWatermarkService,
          useValue: {
            getWatermark: jest.fn().mockResolvedValue(null),
            setWatermark: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(500) },
        },
        { provide: InventoryLotsSync, useValue: lotsSync },
        { provide: InventoryTransactionsSync, useValue: transactionsSync },
        { provide: QCTestsSync, useValue: qcTestsSync },
        { provide: MaterialsSync, useValue: materialsSync },
        { provide: AuditLogsSync, useValue: auditLogsSync },
        { provide: ImportExportOrdersSync, useValue: importExportSync },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    watermark = module.get(RedisWatermarkService);
  });

  it('calls sync for all 6 collections', async () => {
    await service.runFullSync();
    expect(lotsSync.sync).toHaveBeenCalledTimes(1);
    expect(transactionsSync.sync).toHaveBeenCalledTimes(1);
    expect(qcTestsSync.sync).toHaveBeenCalledTimes(1);
    expect(materialsSync.sync).toHaveBeenCalledTimes(1);
    expect(auditLogsSync.sync).toHaveBeenCalledTimes(1);
    expect(importExportSync.sync).toHaveBeenCalledTimes(1);
  });

  it('updates watermark for each collection after successful sync', async () => {
    await service.runFullSync();
    expect(watermark.setWatermark).toHaveBeenCalledTimes(6);
    expect(watermark.setWatermark).toHaveBeenCalledWith('inventory_lots', expect.any(Date));
    expect(watermark.setWatermark).toHaveBeenCalledWith('qc_tests', expect.any(Date));
  });

  it('does NOT update watermark when sync throws', async () => {
    lotsSync.sync.mockRejectedValue(new Error('ES connection refused'));

    await service.runFullSync();

    // watermark NOT updated for inventory_lots
    const calls = (watermark.setWatermark as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls).not.toContain('inventory_lots');
    // other collections still synced
    expect(watermark.setWatermark).toHaveBeenCalledTimes(5);
  });

  it('continues to remaining collections when one fails', async () => {
    transactionsSync.sync.mockRejectedValue(new Error('timeout'));

    await service.runFullSync();

    expect(qcTestsSync.sync).toHaveBeenCalledTimes(1);
    expect(materialsSync.sync).toHaveBeenCalledTimes(1);
  });
});
