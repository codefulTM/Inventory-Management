import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisWatermarkService } from '../redis/redis-watermark.service';
import { BaseCollectionSync, SyncResult } from './collections/base-collection-sync';
import { InventoryLotsSync } from './collections/inventory-lots.sync';
import { InventoryTransactionsSync } from './collections/inventory-transactions.sync';
import { QCTestsSync } from './collections/qc-tests.sync';
import { MaterialsSync } from './collections/materials.sync';
import { AuditLogsSync } from './collections/audit-logs.sync';
import { ImportExportOrdersSync } from './collections/import-export-orders.sync';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly batchSize: number;
  private readonly syncers: BaseCollectionSync[];

  constructor(
    private readonly watermark: RedisWatermarkService,
    private readonly config: ConfigService,
    private readonly inventoryLotsSync: InventoryLotsSync,
    private readonly inventoryTransactionsSync: InventoryTransactionsSync,
    private readonly qcTestsSync: QCTestsSync,
    private readonly materialsSync: MaterialsSync,
    private readonly auditLogsSync: AuditLogsSync,
    private readonly importExportOrdersSync: ImportExportOrdersSync,
  ) {
    this.batchSize = this.config.get<number>('sync.batchSize') ?? 500;
    this.syncers = [
      inventoryLotsSync,
      inventoryTransactionsSync,
      qcTestsSync,
      materialsSync,
      auditLogsSync,
      importExportOrdersSync,
    ];
  }

  async runFullSync(): Promise<void> {
    // Capture a single "to" timestamp for the entire cycle
    const cycleTo = new Date();
    this.logger.log(`=== Sync cycle start — to: ${cycleTo.toISOString()} ===`);

    const results: (SyncResult & { error?: string })[] = [];

    for (const syncer of this.syncers) {
      const collection = syncer.collectionName;
      try {
        const from = await this.watermark.getWatermark(collection);
        const result = await syncer.sync(from, cycleTo, this.batchSize);

        // Only update watermark on success (fail-fast: error skips watermark update)
        await this.watermark.setWatermark(collection, cycleTo);
        results.push(result);
      } catch (err: any) {
        // Log error but continue to next collection
        // Watermark is NOT updated — next cycle retries the same window
        this.logger.error(
          `[${collection}] Sync failed — watermark NOT updated. Error: ${err?.message ?? err}`,
        );
        results.push({
          collection,
          indexed: 0,
          deleted: 0,
          errors: 1,
          durationMs: 0,
          error: err?.message ?? String(err),
        });
      }
    }

    const totalIndexed = results.reduce((s, r) => s + r.indexed, 0);
    const totalDeleted = results.reduce((s, r) => s + r.deleted, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    this.logger.log(
      `=== Sync cycle done — indexed: ${totalIndexed}, deleted: ${totalDeleted}, errors: ${totalErrors} ===`,
    );
  }
}
