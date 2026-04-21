import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync, SyncExecutionOptions, SyncResult } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { InventoryTransaction } from '../../schemas/inventory-transaction.schema';
import { InventoryLot } from '../../schemas/inventory-lot.schema';

@Injectable()
export class InventoryTransactionsSync extends BaseCollectionSync {
  readonly collectionName = 'inventory_transactions';

  constructor(
    @InjectModel(InventoryTransaction.name) readonly model: Model<InventoryTransaction>,
    @InjectModel(InventoryLot.name) private readonly lotModel: Model<InventoryLot>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }

  /**
   * Override sync to enrich each transaction with material_id
   * by batch-looking up inventory_lots on lot_id.
   */
  override async sync(
    from: Date | null,
    to: Date,
    batchSize: number,
    options: SyncExecutionOptions = {},
  ): Promise<SyncResult> {
    const start = Date.now();
    let indexed = 0;
    let errors = 0;
    let skip = 0;
    const dryRun = options.dryRun === true;

    this.logger.log(
      `[${this.collectionName}] Sync start — from: ${from?.toISOString() ?? 'beginning'}, to: ${to.toISOString()}`,
    );

    const query: Record<string, any> = { modified_date: { $lte: to } };
    if (from) query.modified_date.$gt = from;

    while (true) {
      const docs: any[] = await this.model
        .find(query)
        .sort({ modified_date: 1 })
        .skip(skip)
        .limit(batchSize)
        .lean()
        .exec();

      if (!docs.length) break;

      // Collect unique lot_ids and batch-lookup material_id
      const lotIds = [...new Set(docs.map((d) => d.lot_id).filter(Boolean))];
      const lots = await this.lotModel
        .find({ lot_id: { $in: lotIds } })
        .select('lot_id material_id')
        .lean()
        .exec();

      const lotMaterialMap = new Map<string, string>();
      for (const lot of lots) {
        if ((lot as any).material_id) {
          lotMaterialMap.set(lot.lot_id, (lot as any).material_id);
        }
      }

      // Enrich with material_id
      const toIndex = docs
        .filter((d) => d.deleted !== true && d.is_active !== false)
        .map((doc) => ({
          ...doc,
          material_id: doc.material_id ?? lotMaterialMap.get(doc.lot_id) ?? null,
        }));

      // Group by monthly index
      const indexBuckets = new Map<string, Record<string, any>[]>();
      for (const doc of toIndex) {
        const date: Date = doc.modified_date ?? doc.created_date ?? to;
        const indexName = this.indexNaming.getIndexName(this.collectionName, date);
        if (!indexBuckets.has(indexName)) indexBuckets.set(indexName, []);
        indexBuckets.get(indexName)!.push(doc);
      }

      if (!dryRun) {
        for (const [indexName, bucket] of indexBuckets) {
          const result = await this.esBulk.bulkIndex(indexName, bucket);
          indexed += result.indexed;
          errors += result.errors;
        }
      } else {
        indexed += toIndex.length;
      }

      skip += docs.length;
      if (docs.length < batchSize) break;
    }

    const durationMs = Date.now() - start;
    this.logger.log(
      `[${this.collectionName}] Sync done — indexed: ${indexed}, deleted: 0, errors: ${errors}, duration: ${durationMs}ms, dryRun: ${dryRun}`,
    );

    return { collection: this.collectionName, indexed, deleted: 0, errors, durationMs };
  }
}
