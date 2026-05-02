/**
 * File: sync/sync.service.ts
 * Mục đích: Dịch vụ tổng điều phối việc đồng bộ dữ liệu
 * 
 * SyncService là trung tâm điều phối (orchestrator) cho tất cả các tác vụ đồng bộ:
 * - Quản lý tất cả CollectionSyncer (7 collections)
 * - Điều phối chạy đồng bộ định kỳ hoặc thủ công
 * - Quản lý watermark (qua RedisWatermarkService)
 * - Kiểm tra số lượng bản ghi giữa MongoDB và Elasticsearch
 * - Áp dụng ES index templates và purge stale indices
 * 
 * Quy trình chạy một chu kỳ đồng bộ:
 * 1. Lấy watermark cũ (hoặc null nếu lần đầu)
 * 2. Đồng bộ dữ liệu mới từ sau watermark đến hiện tại
 * 3. Cập nhật watermark mới sau khi sync thành công
 * 4. (Tùy chọn) Kiểm tra số lượng bản ghi
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { Model } from 'mongoose';
import { RedisWatermarkService } from '../redis/redis-watermark.service';
import { BaseCollectionSync, SyncResult } from './collections/base-collection-sync';
import { InventoryLotsSync } from './collections/inventory-lots.sync';
import { InventoryTransactionsSync } from './collections/inventory-transactions.sync';
import { QCTestsSync } from './collections/qc-tests.sync';
import { MaterialsSync } from './collections/materials.sync';
import { AuditLogsSync } from './collections/audit-logs.sync';
import { ImportExportOrdersSync } from './collections/import-export-orders.sync';
import { MarkdownKnowledgeSync } from './collections/markdown-knowledge.sync';
import { ELASTICSEARCH_CLIENT } from '../elasticsearch/elasticsearch.constants';
import { IndexTemplateService } from '../elasticsearch/index-template.service';

/**
 * Interface định nghĩa cấu trúc của một Collection Syncer
 * Mỗi collection cần có ít nhất: collectionName và sync()
 */
interface CollectionSyncer {
  collectionName: string;
  sync(
    from: Date | null,        // Watermark cũ (null = từ đầu)
    to: Date,                 // Thời điểm kết thúc chu kỳ
    batchSize: number,         // Kích thước mỗi lô
    options?: { dryRun?: boolean },
  ): Promise<SyncResult>;
  model?: Model<any>;          // Mongoose model (nếu có - docs_knowledge thì không)
  dateField?: string;          // Trường ngày dùng cho query (mặc định: modified_date)
}

/**
 * Tùy chọn cho việc chạy full sync
 */
export interface RunFullSyncOptions {
  collections?: string[];      // Chỉ định collections cụ thể (tùy chọn)
  from?: Date | null;         // Thời gian bắt đầu (null = từ đầu)
  to?: Date;                  // Thời gian kết thúc (mặc định: now)
  batchSize?: number;         // Kích thước batch (ghi đè config)
  dryRun?: boolean;           // Chạy thử, không ghi vào ES
  updateWatermark?: boolean;   // Có cập nhật watermark sau khi sync không
  verifyCounts?: boolean;      // Có kiểm tra số lượng bản ghi không
  ensureTemplates?: boolean;   // Có áp dụng ES templates trước khi sync không
}

/**
 * Kết quả kiểm tra số lượng bản ghi
 */
export interface CountCheckResult {
  collection: string;
  mongoCount: number;         // Số bản ghi trong MongoDB
  esCount: number;           // Số bản ghi trong Elasticsearch
  gap: number;               // Chênh lệch (mongoCount - esCount)
  from: string | null;       // Thời gian bắt đầu kiểm tra
  to: string;                // Thời gian kết thúc kiểm tra
}

/**
 * Kết quả đồng bộ của một collection (có thêm error info)
 */
export interface RunCollectionResult extends SyncResult {
  error?: string;             // Thông báo lỗi (nếu có)
  from: string | null;       // Watermark cũ
  to: string;                // Thời gian kết thúc
  counts?: CountCheckResult;  // Kết quả kiểm tra số lượng (nếu có)
}

/**
 * Tổng kết một chu kỳ đồng bộ đầy đủ
 */
export interface RunFullSyncSummary {
  cycleTo: string;           // Thời điểm kết thúc chu kỳ
  dryRun: boolean;           // Có phải dry-run không
  results: RunCollectionResult[];  // Kết quả từng collection
  totalIndexed: number;      // Tổng số đã index
  totalDeleted: number;      // Tổng số đã xóa
  totalErrors: number;       // Tổng số lỗi
}

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private readonly batchSize: number;         // Kích thước batch mặc định
  private readonly syncers: CollectionSyncer[];  // Danh sách tất cả syncers

  constructor(
    private readonly watermark: RedisWatermarkService,
    private readonly config: ConfigService,
    @Inject(ELASTICSEARCH_CLIENT) private readonly esClient: Client,
    private readonly indexTemplateService: IndexTemplateService,
    // Inject tất cả 7 collection syncers
    private readonly inventoryLotsSync: InventoryLotsSync,
    private readonly inventoryTransactionsSync: InventoryTransactionsSync,
    private readonly qcTestsSync: QCTestsSync,
    private readonly materialsSync: MaterialsSync,
    private readonly auditLogsSync: AuditLogsSync,
    private readonly importExportOrdersSync: ImportExportOrdersSync,
    // Markdown sync là tùy chọn (có thể không có Markdown files)
    private readonly markdownKnowledgeSync?: MarkdownKnowledgeSync,
  ) {
    // Đọc batch size từ config (mặc định: 500)
    this.batchSize = this.config.get<number>('sync.batchSize') ?? 500;
    
    // Tạo danh sách syncers (chỉ thêm markdown sync nếu có)
    this.syncers = [
      inventoryLotsSync,
      inventoryTransactionsSync,
      qcTestsSync,
      materialsSync,
      auditLogsSync,
      importExportOrdersSync,
      ...(this.markdownKnowledgeSync ? [this.markdownKnowledgeSync] : []),
    ];
  }

  /**
   * Hook chạy khi module khởi tạo xong
   * Tự động áp dụng ES templates và purge stale indices
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('onModuleInit: Đang áp dụng ES templates và xóa stale indices...');
    await this.indexTemplateService.applyTemplates();
    await this.indexTemplateService.purgeStaleIndices();
    this.logger.log('onModuleInit: Hoàn tất áp dụng ES templates và xóa stale indices.');
  }

  /**
   * Lấy danh sách các collection có hỗ trợ đồng bộ
   */
  getAvailableCollections(): string[] {
    return this.syncers.map((syncer) => syncer.collectionName);
  }

  /**
   * Kiểm tra tất cả watermark hiện có trong Redis
   * @param collections - Danh sách collection cụ thể (tùy chọn)
   * @returns Object chứa watermark của từng collection
   */
  async inspectWatermarks(
    collections?: string[],
  ): Promise<Record<string, string | null>> {
    return this.watermark.getAllWatermarks(collections);
  }

  /**
   * Xóa tất cả watermark (để chạy lại từ đầu)
   * @param collections - Danh sách collection cụ thể (tùy chọn)
   * @returns Số lượng watermark đã xóa
   */
  async resetWatermarks(collections?: string[]): Promise<number> {
    return this.watermark.resetWatermarks(collections);
  }

  /**
   * Kiểm tra sự chênh lệch số lượng bản ghi giữa MongoDB và Elasticsearch
   * @param options - Tùy chọn (collections, from, to)
   * @returns Mảng kết quả kiểm tra cho từng collection
   */
  async runCountChecks(options: {
    collections?: string[];
    from?: Date | null;
    to?: Date;
  }): Promise<CountCheckResult[]> {
    const cycleTo = options.to ?? new Date();
    const selectedSyncers = this.selectSyncers(options.collections);
    const checks: CountCheckResult[] = [];

    for (const syncer of selectedSyncers) {
      // Lấy watermark cũ (nếu không chỉ định from)
      const from =
        options.from !== undefined
          ? options.from
          : await this.watermark.getWatermark(syncer.collectionName);
      checks.push(await this.verifyCounts(syncer, from, cycleTo));
    }

    return checks;
  }

  /**
   * Chạy đồng bộ đầy đủ cho tất cả (hoặc các collection được chọn)
   * @param options - Tùy chọn đồng bộ
   * @returns Tổng kết chu kỳ đồng bộ
   * 
   * Đây là method chính được gọi bởi:
   * - SyncScheduler (định kỳ)
   * - run-once.ts (chạy thủ công một lần)
   * - sync-admin.ts (CLI admin tool)
   */
  async runFullSync(
    options: RunFullSyncOptions = {},
  ): Promise<RunFullSyncSummary> {
    const cycleTo = options.to ?? new Date();
    const dryRun = options.dryRun === true;
    // Chỉ cập nhật watermark khi không phải dry-run
    const updateWatermark = options.updateWatermark ?? !dryRun;
    const verifyCounts = options.verifyCounts === true;
    const batchSize = options.batchSize ?? this.batchSize;

    // Chọn các syncers để chạy
    const selectedSyncers = this.selectSyncers(options.collections);
    const selectedCollections = selectedSyncers.map((syncer) => syncer.collectionName);

    // Ghi log bắt đầu chu kỳ
    this.logger.log(
      JSON.stringify({
        event: 'sync_cycle_start',
        to: cycleTo.toISOString(),
        dryRun,
        batchSize,
        collections: selectedCollections,
      }),
    );

    // Áp dụng ES templates nếu được yêu cầu
    if (options.ensureTemplates === true) {
      await this.indexTemplateService.applyTemplates(selectedCollections);
      await this.indexTemplateService.purgeStaleIndices(selectedCollections);
    }

    const results: RunCollectionResult[] = [];

    // Chạy đồng bộ cho từng collection
    for (const syncer of selectedSyncers) {
      const collection = syncer.collectionName;
      try {
        // Lấy watermark cũ (hoặc từ tùy chọn)
        const from =
          options.from !== undefined
            ? options.from
            : await this.watermark.getWatermark(collection);
        
        // Thực hiện đồng bộ
        const result = await syncer.sync(from, cycleTo, batchSize, { dryRun });

        // Cập nhật watermark nếu thành công và không phải dry-run
        if (updateWatermark) {
          await this.watermark.setWatermark(collection, cycleTo);
        }

        // Tạo bản ghi kết quả
        const record: RunCollectionResult = {
          ...result,
          from: from ? from.toISOString() : null,
          to: cycleTo.toISOString(),
        };

        // Kiểm tra số lượng nếu được yêu cầu
        if (verifyCounts) {
          record.counts = await this.verifyCounts(syncer, from, cycleTo);
        }

        results.push(record);
      } catch (err: any) {
        // Ghi log lỗi và tiếp tục với collection khác
        this.logger.error(
          `[${collection}] Đồng bộ thất bại — Lỗi: ${err?.message ?? err}`,
        );
        results.push({
          collection,
          indexed: 0,
          deleted: 0,
          errors: 1,
          durationMs: 0,
          error: err?.message ?? String(err),
          from: options.from ? options.from.toISOString() : null,
          to: cycleTo.toISOString(),
        });
      }
    }

    // Tính tổng kết
    const totalIndexed = results.reduce((s, r) => s + r.indexed, 0);
    const totalDeleted = results.reduce((s, r) => s + r.deleted, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    const summary: RunFullSyncSummary = {
      cycleTo: cycleTo.toISOString(),
      dryRun,
      results,
      totalIndexed,
      totalDeleted,
      totalErrors,
    };

    // Ghi log kết thúc chu kỳ
    this.logger.log(JSON.stringify({ event: 'sync_cycle_done', ...summary }));

    return summary;
  }

  /**
   * Chọn các syncers dựa trên danh sách collections được chỉ định
   * @param collections - Danh sách tên collection (tùy chọn)
   * @returns Mảng các syncers được chọn
   */
  private selectSyncers(collections?: string[]): CollectionSyncer[] {
    if (!collections || collections.length === 0) {
      return this.syncers;
    }

    const collectionSet = new Set(collections);
    const selected = this.syncers.filter((syncer) =>
      collectionSet.has(syncer.collectionName),
    );

    if (selected.length === 0) {
      throw new Error(
        `Không có collection nào được hỗ trợ. Các collection có sẵn: ${this.getAvailableCollections().join(', ')}`,
      );
    }

    return selected;
  }

  /**
   * Kiểm tra số lượng bản ghi giữa MongoDB và Elasticsearch
   * @param syncer - Collection syncer
   * @param from - Thời gian bắt đầu
   * @param to - Thời gian kết thúc
   * @returns Kết quả kiểm tra
   * 
   * So sánh: MongoDB count vs Elasticsearch count
   * Tính toán chênh lệch (gap) để phát hiện mất mát dữ liệu
   */
  private async verifyCounts(
    syncer: CollectionSyncer,
    from: Date | null,
    to: Date,
  ): Promise<CountCheckResult> {
    const dateField = syncer.dateField ?? 'modified_date';
    
    // Xây dựng query range cho MongoDB
    const modifiedRange: Record<string, unknown> = { $lte: to };
    if (from) {
      modifiedRange.$gt = from;
    }

    // Query MongoDB (chỉ đếm bản ghi chưa bị xóa mềm)
    const mongoQuery: Record<string, unknown> = {
      [dateField]: modifiedRange,
      deleted: { $ne: true },
      is_active: { $ne: false },
    };

    const hasMongoModel = Boolean(syncer.model);
    const mongoCount = hasMongoModel
      ? await syncer.model.countDocuments(mongoQuery)
      : 0;

    // Query Elasticsearch
    let esCount = 0;
    try {
      const esResponse = await this.esClient.count({
        index: `${syncer.collectionName}_*`,  // Tất cả index phân vùng
        query: {
          bool: {
            filter: [
              {
                range: {
                  [dateField]: {
                    ...(from ? { gt: from.toISOString() } : {}),
                    lte: to.toISOString(),
                  },
                },
              },
            ],
          },
        },
      });
      esCount = esResponse.count;
    } catch (error) {
      this.logger.warn(
        `[${syncer.collectionName}] Truy vấn kiểm tra ES thất bại: ${String(error)}`,
      );
    }

    return {
      collection: syncer.collectionName,
      mongoCount: hasMongoModel ? mongoCount : esCount,
      esCount,
      // Chênh lệch số lượng (dương = thiếu trong ES)
      gap: hasMongoModel ? mongoCount - esCount : 0,
      from: from ? from.toISOString() : null,
      to: to.toISOString(),
    };
  }
}

export interface RunFullSyncOptions {
  collections?: string[];
  from?: Date | null;
  to?: Date;
  batchSize?: number;
  dryRun?: boolean;
  updateWatermark?: boolean;
  verifyCounts?: boolean;
  ensureTemplates?: boolean;
}

export interface CountCheckResult {
  collection: string;
  mongoCount: number;
  esCount: number;
  gap: number;
  from: string | null;
  to: string;
}

export interface RunCollectionResult extends SyncResult {
  error?: string;
  from: string | null;
  to: string;
  counts?: CountCheckResult;
}

export interface RunFullSyncSummary {
  cycleTo: string;
  dryRun: boolean;
  results: RunCollectionResult[];
  totalIndexed: number;
  totalDeleted: number;
  totalErrors: number;
}

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private readonly batchSize: number;
  private readonly syncers: CollectionSyncer[];

  constructor(
    private readonly watermark: RedisWatermarkService,
    private readonly config: ConfigService,
    @Inject(ELASTICSEARCH_CLIENT) private readonly esClient: Client,
    private readonly indexTemplateService: IndexTemplateService,
    private readonly inventoryLotsSync: InventoryLotsSync,
    private readonly inventoryTransactionsSync: InventoryTransactionsSync,
    private readonly qcTestsSync: QCTestsSync,
    private readonly materialsSync: MaterialsSync,
    private readonly auditLogsSync: AuditLogsSync,
    private readonly importExportOrdersSync: ImportExportOrdersSync,
    private readonly markdownKnowledgeSync?: MarkdownKnowledgeSync,
  ) {
    this.batchSize = this.config.get<number>('sync.batchSize') ?? 500;
    this.syncers = [
      inventoryLotsSync,
      inventoryTransactionsSync,
      qcTestsSync,
      materialsSync,
      auditLogsSync,
      importExportOrdersSync,
      ...(this.markdownKnowledgeSync ? [this.markdownKnowledgeSync] : []),
    ];
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('onModuleInit: applying ES templates and purging stale indices...');
    await this.indexTemplateService.applyTemplates();
    await this.indexTemplateService.purgeStaleIndices();
    this.logger.log('onModuleInit: ES templates and stale index cleanup complete.');
  }

  getAvailableCollections(): string[] {
    return this.syncers.map((syncer) => syncer.collectionName);
  }

  async inspectWatermarks(
    collections?: string[],
  ): Promise<Record<string, string | null>> {
    return this.watermark.getAllWatermarks(collections);
  }

  async resetWatermarks(collections?: string[]): Promise<number> {
    return this.watermark.resetWatermarks(collections);
  }

  async runCountChecks(options: {
    collections?: string[];
    from?: Date | null;
    to?: Date;
  }): Promise<CountCheckResult[]> {
    const cycleTo = options.to ?? new Date();
    const selectedSyncers = this.selectSyncers(options.collections);
    const checks: CountCheckResult[] = [];

    for (const syncer of selectedSyncers) {
      const from =
        options.from !== undefined
          ? options.from
          : await this.watermark.getWatermark(syncer.collectionName);
      checks.push(await this.verifyCounts(syncer, from, cycleTo));
    }

    return checks;
  }

  async runFullSync(
    options: RunFullSyncOptions = {},
  ): Promise<RunFullSyncSummary> {
    const cycleTo = options.to ?? new Date();
    const dryRun = options.dryRun === true;
    const updateWatermark = options.updateWatermark ?? !dryRun;
    const verifyCounts = options.verifyCounts === true;
    const batchSize = options.batchSize ?? this.batchSize;

    const selectedSyncers = this.selectSyncers(options.collections);
    const selectedCollections = selectedSyncers.map((syncer) => syncer.collectionName);

    this.logger.log(
      JSON.stringify({
        event: 'sync_cycle_start',
        to: cycleTo.toISOString(),
        dryRun,
        batchSize,
        collections: selectedCollections,
      }),
    );

    if (options.ensureTemplates === true) {
      await this.indexTemplateService.applyTemplates(selectedCollections);
      await this.indexTemplateService.purgeStaleIndices(selectedCollections);
    }

    const results: RunCollectionResult[] = [];

    for (const syncer of selectedSyncers) {
      const collection = syncer.collectionName;
      try {
        const from =
          options.from !== undefined
            ? options.from
            : await this.watermark.getWatermark(collection);
        const result = await syncer.sync(from, cycleTo, batchSize, { dryRun });

        if (updateWatermark) {
          await this.watermark.setWatermark(collection, cycleTo);
        }

        const record: RunCollectionResult = {
          ...result,
          from: from ? from.toISOString() : null,
          to: cycleTo.toISOString(),
        };

        if (verifyCounts) {
          record.counts = await this.verifyCounts(syncer, from, cycleTo);
        }

        results.push(record);
      } catch (err: any) {
        this.logger.error(
          `[${collection}] Sync failed — Error: ${err?.message ?? err}`,
        );
        results.push({
          collection,
          indexed: 0,
          deleted: 0,
          errors: 1,
          durationMs: 0,
          error: err?.message ?? String(err),
          from: options.from ? options.from.toISOString() : null,
          to: cycleTo.toISOString(),
        });
      }
    }

    const totalIndexed = results.reduce((s, r) => s + r.indexed, 0);
    const totalDeleted = results.reduce((s, r) => s + r.deleted, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    const summary: RunFullSyncSummary = {
      cycleTo: cycleTo.toISOString(),
      dryRun,
      results,
      totalIndexed,
      totalDeleted,
      totalErrors,
    };

    this.logger.log(JSON.stringify({ event: 'sync_cycle_done', ...summary }));

    return summary;
  }

  private selectSyncers(collections?: string[]): CollectionSyncer[] {
    if (!collections || collections.length === 0) {
      return this.syncers;
    }

    const collectionSet = new Set(collections);
    const selected = this.syncers.filter((syncer) =>
      collectionSet.has(syncer.collectionName),
    );

    if (selected.length === 0) {
      throw new Error(
        `No supported collections selected. Available: ${this.getAvailableCollections().join(', ')}`,
      );
    }

    return selected;
  }

  private async verifyCounts(
    syncer: CollectionSyncer,
    from: Date | null,
    to: Date,
  ): Promise<CountCheckResult> {
    const dateField = syncer.dateField ?? 'modified_date';
    const modifiedRange: Record<string, unknown> = { $lte: to };
    if (from) {
      modifiedRange.$gt = from;
    }

    const mongoQuery: Record<string, unknown> = {
      [dateField]: modifiedRange,
      deleted: { $ne: true },
      is_active: { $ne: false },
    };

    const hasMongoModel = Boolean(syncer.model);
    const mongoCount = hasMongoModel
      ? await syncer.model.countDocuments(mongoQuery)
      : 0;

    let esCount = 0;
    try {
      const esResponse = await this.esClient.count({
        index: `${syncer.collectionName}_*`,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [dateField]: {
                    ...(from ? { gt: from.toISOString() } : {}),
                    lte: to.toISOString(),
                  },
                },
              },
            ],
          },
        },
      });
      esCount = esResponse.count;
    } catch (error) {
      this.logger.warn(
        `[${syncer.collectionName}] Count check ES query failed: ${String(error)}`,
      );
    }

    return {
      collection: syncer.collectionName,
      mongoCount: hasMongoModel ? mongoCount : esCount,
      esCount,
      gap: hasMongoModel ? mongoCount - esCount : 0,
      from: from ? from.toISOString() : null,
      to: to.toISOString(),
    };
  }
}
