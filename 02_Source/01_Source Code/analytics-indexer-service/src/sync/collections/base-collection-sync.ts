/**
 * File: sync/collections/base-collection-sync.ts
 * Mục đích: Class cơ sở (abstract) cho việc đồng bộ từng collection
 * 
 * Class này cung cấp logic đồng bộ chung cho tất cả collections:
 * - Đồng bộ tăng dần (incremental sync) dựa trên watermark
 * - Xử lý soft delete (xóa mềm) -> xóa khỏi Elasticsearch
 * - Phân vùng dữ liệu theo tháng (monthly partitioning)
 * - Hỗ trợ dry-run (chạy thử không ghi dữ liệu)
 * 
 * Các collection-specific syncs sẽ kế thừa class này
 * và ghi đè (override) method sync() nếu cần xử lý đặc biệt
 */
import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';

/**
 * Kết quả đồng bộ của một collection
 */
export interface SyncResult {
  collection: string;    // Tên collection
  indexed: number;       // Số đã index vào ES
  deleted: number;       // Số đã xóa khỏi ES
  errors: number;        // Số lỗi gặp phải
  durationMs: number;     // Thời gian thực hiện (ms)
}

/**
 * Tùy chọn khi thực hiện đồng bộ
 */
export interface SyncExecutionOptions {
  dryRun?: boolean;       // Chạy thử, không ghi dữ liệu thực
}

/**
 * Class cơ sở trừu tượng cho việc đồng bộ collection
 * Các class con phải định nghĩa: collectionName và model
 */
export abstract class BaseCollectionSync {
  // Tên collection (phải định nghĩa ở class con)
  abstract readonly collectionName: string;
  // Mongoose model (phải định nghĩa ở class con)
  abstract readonly model: Model<any>;
  
  // Logger tự động lấy tên class con
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    // Service đặt tên index theo tháng
    protected readonly indexNaming: IndexNamingService,
    // Service thực hiện bulk operations với ES
    protected readonly esBulk: ElasticsearchBulkService,
  ) {}

  /**
   * Thực hiện đồng bộ tăng dần (incremental sync) cho một collection
   * @param from - Watermark cũ (null = đồng bộ toàn bộ lịch sử)
   * @param to   - Thời điểm kết thúc chu kỳ (sẽ lưu làm watermark mới)
   * @param batchSize - Số bản ghi xử lý trong một lô
   * @param options - Tùy chọn bổ sung (dryRun)
   * @returns Kết quả đồng bộ
   * 
   * Quy trình:
   * 1. Query MongoDB lấy docs từ sau watermark đến hiện tại
   * 2. Phân loại: docs sống (index) vs docs xóa mềm (delete)
   * 3. Gom nhóm docs theo tháng (để vào đúng index phân vùng)
   * 4. Bulk index vào ES theo từng index tháng
   * 5. Bulk delete các docs xóa mềm khỏi ES
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
    let skip = 0;  // Offset cho phân trang (pagination)
    const dryRun = options.dryRun === true;

    this.logger.log(
      `[${this.collectionName}] Bắt đầu đồng bộ — từ: ${from?.toISOString() ?? 'đầu'}, đến: ${to.toISOString()}`,
    );

    // Xây dựng query: lấy docs có modified_date <= to, và > from (nếu có)
    const query: Record<string, any> = {
      modified_date: { $lte: to },
    };
    if (from) {
      query.modified_date.$gt = from;
    }

    // Xử lý theo từng lô (batch) để tránh quá tải bộ nhớ
    while (true) {
      // Lấy một lô docs từ MongoDB, sắp xếp theo modified_date tăng dần
      const docs: any[] = await this.model
        .find(query)
        .sort({ modified_date: 1 })
        .skip(skip)
        .limit(batchSize)
        .lean()  // Trả về plain JS objects (nhanh hơn)
        .exec();

      if (!docs.length) break;  // Hết dữ liệu

      // Phân loại: docs bị xóa mềm vs docs còn hoạt động
      const toDelete: string[] = [];
      const toIndex: Record<string, any>[] = [];

      for (const doc of docs) {
        // Kiểm tra soft delete: deleted=true hoặc is_active=false
        const isSoftDeleted =
          doc.deleted === true || doc.is_active === false;

        if (isSoftDeleted) {
          const id = doc._id?.toString();
          if (id) toDelete.push(id);
        } else {
          toIndex.push(doc);
        }
      }

      // Gom nhóm docs theo index tháng (dựa trên modified_date)
      const indexBuckets = new Map<string, Record<string, any>[]>();
      for (const doc of toIndex) {
        // Lấy ngày để xác định index tháng
        const date: Date = doc.modified_date ?? doc.created_date ?? to;
        const indexName = this.indexNaming.getIndexName(this.collectionName, date);
        if (!indexBuckets.has(indexName)) indexBuckets.set(indexName, []);
        indexBuckets.get(indexName)!.push(doc);
      }

      if (dryRun) {
        // Chế độ chạy thử: chỉ đếm, không ghi vào ES
        indexed += toIndex.length;
        deleted += toDelete.length;
      } else {
        // Thực hiện bulk index vào từng index tháng
        for (const [indexName, bucket] of indexBuckets) {
          const result = await this.esBulk.bulkIndex(indexName, bucket, {
            collectionName: this.collectionName,
          });
          indexed += result.indexed;
          errors += result.errors;
        }

        // Bulk delete các docs bị xóa mềm
        if (toDelete.length) {
          const indexName = this.indexNaming.getIndexName(this.collectionName, to);
          const result = await this.esBulk.bulkDelete(indexName, toDelete);
          deleted += result.deleted;
          errors += result.errors;
        }
      }

      // Chuyển sang lô tiếp theo
      skip += docs.length;
      if (docs.length < batchSize) break;  // Hết dữ liệu
    }

    const durationMs = Date.now() - start;
    this.logger.log(
      `[${this.collectionName}] Đồng bộ hoàn tất — indexed: ${indexed}, deleted: ${deleted}, errors: ${errors}, duration: ${durationMs}ms, dryRun: ${dryRun}`,
    );

    return { collection: this.collectionName, indexed, deleted, errors, durationMs };
  }
}
