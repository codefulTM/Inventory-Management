import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from '../../elasticsearch/elasticsearch.constants';
import type { InventoryStatusItemDto } from '../dto/inventory-status-report.dto';
import type { MaterialUsageItemDto } from '../dto/material-usage-report.dto';
import type { QcPerformanceItemDto } from '../dto/qc-performance-report.dto';
import type { AuditEntryDto } from '../dto/audit-report.dto';

@Injectable()
export class ReportsRepository {
  private readonly logger = new Logger(ReportsRepository.name);

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly es: Client,
  ) {}

  /**
   * Query inventory_lots_* — aggregate by status, count lots and sum quantity.
   */
  async getInventoryStatus(): Promise<InventoryStatusItemDto[]> {
    const result = await this.es.search({
      index: 'inventory_lots_*',
      size: 0,
      aggs: {
        by_status: {
          terms: { field: 'status.keyword', size: 50 },
          aggs: {
            total_quantity: { sum: { field: 'quantity' } },
            sample_lots: {
              top_hits: {
                size: 100,
                _source: ['material_id', 'lot_id', 'quantity', 'status', 'expiration_date'],
              },
            },
          },
        },
      },
    });

    const buckets: any[] = (result.aggregations?.by_status as any)?.buckets ?? [];
    const items: InventoryStatusItemDto[] = [];

    for (const bucket of buckets) {
      const hits: any[] = bucket.sample_lots?.hits?.hits ?? [];
      for (const hit of hits) {
        const src = hit._source;
        items.push({
          material_id: src.material_id ?? '',
          lot_id: src.lot_id ?? '',
          quantity: src.quantity ?? 0,
          status: src.status ?? '',
          expiration_date: src.expiration_date ? new Date(src.expiration_date) : undefined,
        });
      }
    }

    this.logger.debug(`[getInventoryStatus] returned ${items.length} items`);
    return items;
  }

  /**
   * Query inventory_transactions_* — filter by date range, aggregate by material_id.
   */
  async getMaterialUsage(from?: Date, to?: Date): Promise<MaterialUsageItemDto[]> {
    const mustClauses: any[] = [];

    if (from || to) {
      mustClauses.push({
        range: {
          transaction_date: {
            ...(from ? { gte: from.toISOString() } : {}),
            ...(to ? { lte: to.toISOString() } : {}),
          },
        },
      });
    }

    const result = await this.es.search({
      index: 'inventory_transactions_*',
      size: 0,
      query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
      aggs: {
        by_material: {
          terms: { field: 'material_id.keyword', size: 500 },
          aggs: {
            total_quantity: {
              sum: {
                script: {
                  source: "doc['quantity'].size() > 0 ? Double.parseDouble(doc['quantity'].value) : 0",
                  lang: 'painless',
                },
              },
            },
          },
        },
      },
    });

    const buckets: any[] = (result.aggregations?.by_material as any)?.buckets ?? [];

    const items: MaterialUsageItemDto[] = buckets.map((bucket) => ({
      material_id: bucket.key,
      transaction_count: bucket.doc_count ?? 0,
      total_quantity: bucket.total_quantity?.value ?? 0,
    }));

    this.logger.debug(`[getMaterialUsage] returned ${items.length} items`);
    return items;
  }

  /**
   * Query qc_tests_* — aggregate by result_status, compute pass/fail per supplier.
   */
  async getQcPerformance(): Promise<QcPerformanceItemDto[]> {
    const result = await this.es.search({
      index: 'qc_tests_*',
      size: 0,
      aggs: {
        by_supplier: {
          terms: { field: 'supplier_name.keyword', size: 500 },
          aggs: {
            by_result: {
              terms: { field: 'result_status.keyword', size: 10 },
            },
          },
        },
      },
    });

    const buckets: any[] = (result.aggregations?.by_supplier as any)?.buckets ?? [];

    const items: QcPerformanceItemDto[] = buckets.map((supplierBucket) => {
      const resultBuckets: any[] = supplierBucket.by_result?.buckets ?? [];
      const approved = resultBuckets.find((b) => b.key === 'Pass' || b.key === 'Accepted')?.doc_count ?? 0;
      const rejected = resultBuckets.find((b) => b.key === 'Fail' || b.key === 'Rejected')?.doc_count ?? 0;
      const total = approved + rejected;
      const quality_rate = total > 0 ? Math.round((approved / total) * 10000) / 100 : 0;

      return {
        supplier_name: supplierBucket.key,
        approved,
        rejected,
        quality_rate,
      };
    });

    this.logger.debug(`[getQcPerformance] returned ${items.length} items`);
    return items;
  }

  /**
   * Query inventory_audit_reports_* — match_all, sorted by modified_date desc, paginated.
   */
  async getAuditTrail(page = 0, size = 20): Promise<AuditEntryDto[]> {
    const result = await this.es.search({
      index: 'inventory_audit_reports_*',
      from: page * size,
      size,
      query: { match_all: {} },
      sort: [{ modified_date: { order: 'desc' } }],
    });

    const hits: any[] = result.hits?.hits ?? [];

    const entries: AuditEntryDto[] = hits.map((hit) => {
      const src = hit._source;
      return {
        action: src.action ?? '',
        entity: src.entity ?? src.collection ?? '',
        performed_by: src.performed_by ?? src.user_id ?? '',
        performed_at: src.performed_at ? new Date(src.performed_at) : new Date(src.modified_date ?? 0),
        details: src.details ?? undefined,
      };
    });

    this.logger.debug(`[getAuditTrail] returned ${entries.length} entries (page=${page}, size=${size})`);
    return entries;
  }
}
