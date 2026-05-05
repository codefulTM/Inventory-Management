// === SYNC SERVICE ===
// Dịch vụ tổng điều phối việc đồng bộ dữ liệu từ MongoDB → Elasticsearch
// Quản lý 7 collection syncers, watermark (Redis), ES templates, count verification

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
  sync(from: Date | null, to: Date, batchSize: number, options?: { dryRun?: boolean }): Promise<SyncResult>;
  model?: Model<any>; dateField?: string;
}

export interface RunFullSyncOptions {
  collections?: string[]; from?: Date | null; to?: Date; batchSize?: number;
  dryRun?: boolean; updateWatermark?: boolean; verifyCounts?: boolean; ensureTemplates?: boolean;
}
export interface CountCheckResult {
  collection: string; mongoCount: number; esCount: number; gap: number; from: string | null; to: string;
}
export interface RunCollectionResult extends SyncResult {
  error?: string; from: string | null; to: string; counts?: CountCheckResult;
}
export interface RunFullSyncSummary {
  cycleTo: string; dryRun: boolean; results: RunCollectionResult[];
  totalIndexed: number; totalDeleted: number; totalErrors: number;
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
    // [RÚT GỌN: Read sync.batchSize from config, build syncers array from injected collection syncers]
    throw new Error("Skeleton: not implemented");
  }

  async onModuleInit(): Promise<void> {
    // [RÚT GỌN: Apply ES templates and purge stale indices on module init]
    throw new Error("Skeleton: not implemented");
  }

  getAvailableCollections(): string[] {
    // [RÚT GỌN: Return collection names from all syncers]
    throw new Error("Skeleton: not implemented");
  }

  async inspectWatermarks(collections?: string[]): Promise<Record<string, string | null>> {
    // [RÚT GỌN: Delegate to watermark.getAllWatermarks]
    throw new Error("Skeleton: not implemented");
  }

  async resetWatermarks(collections?: string[]): Promise<number> {
    // [RÚT GỌN: Delegate to watermark.resetWatermarks]
    throw new Error("Skeleton: not implemented");
  }

  async runCountChecks(options: { collections?: string[]; from?: Date | null; to?: Date }): Promise<CountCheckResult[]> {
    // [RÚT GỌN: For each selected syncer, call verifyCounts and return results array]
    throw new Error("Skeleton: not implemented");
  }

  async runFullSync(options?: RunFullSyncOptions): Promise<RunFullSyncSummary> {
    // [RÚT GỌN: Select syncers, apply templates if needed, loop through syncers calling sync(),
    //  update watermark after each, optionally verify counts, aggregate totals, return summary]
    throw new Error("Skeleton: not implemented");
  }

  private selectSyncers(collections?: string[]): CollectionSyncer[] {
    // [RÚT GỌN: Filter syncers by collection names, throw if none match]
    throw new Error("Skeleton: not implemented");
  }

  private async verifyCounts(syncer: CollectionSyncer, from: Date | null, to: Date): Promise<CountCheckResult> {
    // [RÚT GỌN: Count documents in MongoDB (countDocuments with date range + deleted/is_active filters),
    //  count in Elasticsearch (client.count with bool filter), return gap comparison]
    throw new Error("Skeleton: not implemented");
  }
}
