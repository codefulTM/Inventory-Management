/**
 * File: sync/collections/audit-logs.sync.ts
 * Mục đích: Đồng bộ collection audit_logs vào ES index inventory_audit_reports
 * 
 * Đặc biệt: Collection này có cách xử lý khác biệt:
 * - Trường ngày chính là 'timestamp' (không phải 'modified_date')
 * - Map vào ES index 'inventory_audit_reports' (không phải 'audit_logs')
 * - Cần map các trường để khớp với cấu trúc mà metrics-service expects
 * 
 * Tại sao không sync trực tiếp vào audit_logs index?
 * - metrics-service đã thiết kế ReportsRepository đọc từ inventory_audit_reports_*
 * - Cần map: audit_logs -> inventory_audit_reports format
 * 
 * Quy trình:
 * 1. Query audit_logs dựa trên timestamp
 * 2. Map fields: action, entity, performed_by, performed_at
 * 3. Set modified_date = timestamp (để IndexNamingService phân vùng tháng)
 * 4. Index vào inventory_audit_reports_{YYYY}_{MM}
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync, SyncExecutionOptions, SyncResult } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { AuditLog } from '../../schemas/audit-log.schema';

@Injectable()
export class AuditLogsSync extends BaseCollectionSync {
  // Đích đến ES index: inventory_audit_reports (không phải audit_logs)
  readonly collectionName = 'inventory_audit_reports';

  constructor(
    @InjectModel(AuditLog.name) readonly model: Model<AuditLog>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }

  /**
   * Ghi đè sync() để query trên 'timestamp' và map fields
   * @param from - Watermark cũ (dựa trên timestamp)
   * @param to - Thời điểm kết thúc
   * @param batchSize - Kích thước lô
   * @param options - Tùy chọn
   * @returns Kết quả đồng bộ
   * 
   * Khác với base class:
   * - Query trên 'timestamp' thay vì 'modified_date'
   * - Map fields để khớp với inventory_audit_reports format
   * - Set modified_date = timestamp (cho monthly partitioning)
   * - Không xử lý soft delete (audit logs không bị xóa)
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
      `[${this.collectionName}] Bắt đầu đồng bộ — từ: ${from?.toISOString() ?? 'đầu'}, đến: ${to.toISOString()}`,
    );

    // Query dựa trên timestamp (không phải modified_date)
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

      // Map sang định dạng ES mà metrics-service expects
      const toIndex = docs.map((doc) => ({
        ...doc,
        action: doc.action ?? '',
        // Entity: lấy từ details (lot_id, transaction_id, etc.)
        entity: doc.details?.entity ?? doc.details?.lot_id ?? doc.details?.transaction_id ?? '',
        // Người thực hiện: username hoặc user_id
        performed_by: doc.username ?? doc.user_id ?? '',
        // Thời gian thực hiện = timestamp
        performed_at: doc.timestamp,
        // Set modified_date = timestamp để IndexNamingService dùng cho monthly index
        modified_date: doc.timestamp,
        details: doc.details ?? {},
      }));

      // Gom nhóm theo index tháng
      const indexBuckets = new Map<string, Record<string, any>[]>();
      for (const doc of toIndex) {
        const indexName = this.indexNaming.getIndexName(this.collectionName, doc.modified_date);
        if (!indexBuckets.has(indexName)) indexBuckets.set(indexName, []);
        indexBuckets.get(indexName)!.push(doc);
      }

      // Bulk index vào ES
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
      `[${this.collectionName}] Đồng bộ hoàn tất — indexed: ${indexed}, deleted: 0, errors: ${errors}, duration: ${durationMs}ms, dryRun: ${dryRun}`,
    );

    return { collection: this.collectionName, indexed, deleted: 0, errors, durationMs };
  }
}
