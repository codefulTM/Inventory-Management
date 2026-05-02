/**
 * File: sync/collections/qc-tests.sync.ts
 * Mục đích: Đồng bộ collection qc_tests với enrichment supplier_name
 * 
 * Kế thừa từ BaseCollectionSync nhưng ghi đè (override) method sync()
 * để làm giàu (enrich) mỗi kết quả QC với tên nhà cung cấp
 * 
 * Tại sao cần enrich?
 * - qc_tests chỉ lưu lot_id (liên kết với lô hàng)
 * - Khi tìm kiếm, người dùng muốn biết nhà cung cấp là ai
 * - Cần join với inventory_lots để lấy supplier_name
 * 
 * Quy trình:
 * 1. Lấy các kết quả QC từ MongoDB
 * 2. Batch-lookup lot_id -> supplier_name từ inventory_lots
 * 3. Enrich từng kết quả QC với supplier_name
 * 4. Index vào ES với đầy đủ thông tin
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync, SyncExecutionOptions, SyncResult } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { QCTest } from '../../schemas/qc-test.schema';
import { InventoryLot } from '../../schemas/inventory-lot.schema';

@Injectable()
export class QCTestsSync extends BaseCollectionSync {
  readonly collectionName = 'qc_tests';

  constructor(
    @InjectModel(QCTest.name) readonly model: Model<QCTest>,
    // Cần thêm lotModel để lookup supplier_name từ lot_id
    @InjectModel(InventoryLot.name) private readonly lotModel: Model<InventoryLot>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }

  /**
   * Ghi đè sync() để enrich kết quả QC với supplier_name
   * @param from - Watermark cũ
   * @param to - Thời điểm kết thúc
   * @param batchSize - Kích thước lô
   * @param options - Tùy chọn
   * @returns Kết quả đồng bộ
   * 
   * Khác với base class ở chỗ:
   * - Không xử lý soft delete (collection này không có)
   * - Enrich supplier_name từ lot_id qua batch-lookup
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

    // Query lấy docs từ sau watermark đến hiện tại
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

      // Thu thập tất cả lot_id duy nhất để batch-lookup
      const lotIds = [...new Set(docs.map((d) => d.lot_id).filter(Boolean))];
      
      // Batch-lookup supplier_name từ inventory_lots
      const lots = await this.lotModel
        .find({ lot_id: { $in: lotIds } })
        .select('lot_id supplier_name manufacturer_name')
        .lean()
        .exec();

      // Tạo map: lot_id -> supplier_name
      const lotSupplierMap = new Map<string, string>();
      for (const lot of lots) {
        lotSupplierMap.set(
          lot.lot_id,
          (lot as any).supplier_name || (lot as any).manufacturer_name || 'Unknown Supplier',
        );
      }

      // Enrich với supplier_name + lọc bỏ soft-deleted
      const toIndex = docs
        .filter((d) => d.deleted !== true && d.is_active !== false)
        .map((doc) => ({
          ...doc,
          supplier_name: lotSupplierMap.get(doc.lot_id) ?? 'Unknown Supplier',
        }));

      // Gom nhóm theo index tháng để bulk index
      const indexBuckets = new Map<string, Record<string, any>[]>();
      for (const doc of toIndex) {
        const date: Date = doc.modified_date ?? doc.created_date ?? to;
        const indexName = this.indexNaming.getIndexName(this.collectionName, date);
        if (!indexBuckets.has(indexName)) indexBuckets.set(indexName, []);
        indexBuckets.get(indexName)!.push(doc);
      }

      // Thực hiện bulk index vào ES
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
