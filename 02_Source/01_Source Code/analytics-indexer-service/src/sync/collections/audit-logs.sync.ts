import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync, SyncExecutionOptions, SyncResult } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { AuditLog } from '../../schemas/audit-log.schema';

/**
 * Syncs the `audit_logs` collection (real-time user activity events)
 * into the `inventory_audit_reports_*` Elasticsearch indices.
 *
 * The base class uses `modified_date` for watermark queries.
 * audit_logs uses `timestamp` as its primary date field, so we
 * override sync() to query on `timestamp` and remap it for ES.
 */
@Injectable()
export class AuditLogsSync extends BaseCollectionSync {
  readonly collectionName = 'inventory_audit_reports';

  constructor(
    @InjectModel(AuditLog.name) readonly model: Model<AuditLog>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }

  /**
   * Override sync to query on `timestamp` (not `modified_date`)
   * and map audit_log fields to the ES shape expected by metrics-service:
   *   action, entity, performed_by, performed_at, modified_date, details
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

    const query: Record<string, any> = { timestamp: { $lte: to } };
    if (from) query.timestamp.$gt = from;

    while (true) {
      const docs: any[] = await this.model
        .find(query)
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(batchSize)
        .lean()
        .exec();

      if (!docs.length) break;

      // Map to ES document shape expected by metrics-service ReportsRepository
      const toIndex = docs.map((doc) => ({
        ...doc,
        action: doc.action ?? '',
        entity: doc.details?.entity ?? doc.details?.lot_id ?? doc.details?.transaction_id ?? '',
        performed_by: doc.username ?? doc.user_id ?? '',
        performed_at: doc.timestamp,
        // modified_date required for IndexNamingService (monthly index partitioning)
        modified_date: doc.timestamp,
        details: doc.details ?? {},
      }));

      // Group by monthly index
      const indexBuckets = new Map<string, Record<string, any>[]>();
      for (const doc of toIndex) {
        const indexName = this.indexNaming.getIndexName(this.collectionName, doc.modified_date);
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
