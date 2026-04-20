import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';

export interface SyncResult {
  collection: string;
  indexed: number;
  deleted: number;
  errors: number;
  durationMs: number;
}

export interface SyncExecutionOptions {
  dryRun?: boolean;
}

export abstract class BaseCollectionSync {
  abstract readonly collectionName: string;
  abstract readonly model: Model<any>;
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly indexNaming: IndexNamingService,
    protected readonly esBulk: ElasticsearchBulkService,
  ) {}

  /**
   * Performs an incremental sync for one collection.
   * @param from - last watermark (null = full historical sync)
   * @param to   - current cycle end time (will be stored as new watermark on success)
   * @param batchSize - documents per batch
   */
  async sync(
    from: Date | null,
    to: Date,
    batchSize: number,
    options: SyncExecutionOptions = {},
  ): Promise<SyncResult> {
    const start = Date.now();
    let indexed = 0;
    let deleted = 0;
    let errors = 0;
    let skip = 0;
    const dryRun = options.dryRun === true;

    this.logger.log(
      `[${this.collectionName}] Sync start — from: ${from?.toISOString() ?? 'beginning'}, to: ${to.toISOString()}`,
    );

    const query: Record<string, any> = {
      modified_date: { $lte: to },
    };
    if (from) {
      query.modified_date.$gt = from;
    }

    while (true) {
      const docs: any[] = await this.model
        .find(query)
        .sort({ modified_date: 1 })
        .skip(skip)
        .limit(batchSize)
        .lean()
        .exec();

      if (!docs.length) break;

      // Separate soft-deleted documents from live ones
      const toDelete: string[] = [];
      const toIndex: Record<string, any>[] = [];

      for (const doc of docs) {
        const isSoftDeleted =
          doc.deleted === true || doc.is_active === false;

        if (isSoftDeleted) {
          const id = doc._id?.toString();
          if (id) toDelete.push(id);
        } else {
          toIndex.push(doc);
        }
      }

      // Group documents by monthly index
      const indexBuckets = new Map<string, Record<string, any>[]>();
      for (const doc of toIndex) {
        const date: Date = doc.modified_date ?? doc.created_date ?? to;
        const indexName = this.indexNaming.getIndexName(this.collectionName, date);
        if (!indexBuckets.has(indexName)) indexBuckets.set(indexName, []);
        indexBuckets.get(indexName)!.push(doc);
      }

      if (dryRun) {
        indexed += toIndex.length;
        deleted += toDelete.length;
      } else {
        // Bulk-index per monthly index
        for (const [indexName, bucket] of indexBuckets) {
          const result = await this.esBulk.bulkIndex(indexName, bucket, {
            collectionName: this.collectionName,
          });
          indexed += result.indexed;
          errors += result.errors;
        }

        // Bulk-delete soft-deleted docs (check all possible monthly indices for this cycle)
        if (toDelete.length) {
          const indexName = this.indexNaming.getIndexName(this.collectionName, to);
          const result = await this.esBulk.bulkDelete(indexName, toDelete);
          deleted += result.deleted;
          errors += result.errors;
        }
      }

      skip += docs.length;
      if (docs.length < batchSize) break;
    }

    const durationMs = Date.now() - start;
    this.logger.log(
      `[${this.collectionName}] Sync done — indexed: ${indexed}, deleted: ${deleted}, errors: ${errors}, duration: ${durationMs}ms, dryRun: ${dryRun}`,
    );

    return { collection: this.collectionName, indexed, deleted, errors, durationMs };
  }
}
