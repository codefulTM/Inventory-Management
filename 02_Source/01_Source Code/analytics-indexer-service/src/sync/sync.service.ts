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

interface CollectionSyncer {
  collectionName: string;
  sync(
    from: Date | null,
    to: Date,
    batchSize: number,
    options?: { dryRun?: boolean },
  ): Promise<SyncResult>;
  model?: Model<any>;
  dateField?: string;
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
