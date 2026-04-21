import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from '../../elasticsearch/elasticsearch.constants';
import type { InventoryStatusItemDto } from '../dto/inventory-status-report.dto';
import type { MaterialUsageItemDto } from '../dto/material-usage-report.dto';
import type { QcPerformanceItemDto } from '../dto/qc-performance-report.dto';
import type { AuditEntryDto } from '../dto/audit-report.dto';
import type {
  AuditTrendPointDto,
  InventoryTrendPointDto,
  MaterialUsageTrendPointDto,
  QcSupplierRankingItemDto,
  QcTrendPointDto,
  TrendInterval,
} from '../dto/trend-report.dto';

@Injectable()
export class ReportsRepository {
  private readonly logger = new Logger(ReportsRepository.name);

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly es: Client,
  ) {}

  private normalizeInterval(interval?: string): TrendInterval {
    if (interval === 'week' || interval === 'month') {
      return interval;
    }
    return 'day';
  }

  private resolveTimeWindow(from?: Date, to?: Date, fallbackDays = 90) {
    const toDate = to ?? new Date();
    const fromDate =
      from ??
      new Date(toDate.getTime() - fallbackDays * 24 * 60 * 60 * 1000);

    return {
      fromDate,
      toDate,
    };
  }

  private getDateFormat(interval: TrendInterval): string {
    if (interval === 'month') {
      return 'yyyy-MM';
    }
    if (interval === 'week') {
      return 'yyyy-ww';
    }
    return 'yyyy-MM-dd';
  }

  /**
   * Query inventory_lots_* — aggregate by status, count lots and sum quantity.
   */
  async getInventoryStatus(): Promise<InventoryStatusItemDto[]> {
    const result = await this.es.search({
      index: 'inventory_lots_*',
      size: 0,
      aggs: {
        by_status: {
          terms: { field: 'status', size: 50 },
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
    const query =
      from || to
        ? {
            bool: {
              must: [
                {
                  range: {
                    transaction_date: {
                      ...(from ? { gte: from.toISOString() } : {}),
                      ...(to ? { lte: to.toISOString() } : {}),
                    },
                  },
                },
              ],
            },
          }
        : { match_all: {} };

    const result = await this.es.search({
      index: 'inventory_transactions_*',
      size: 0,
      query,
      aggs: {
        by_material: {
          terms: { field: 'material_id', size: 500 },
          aggs: {
            total_quantity: {
              sum: { field: 'quantity' },
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
          terms: { field: 'supplier_name', size: 500 },
          aggs: {
            by_result: {
              terms: { field: 'result_status', size: 10 },
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

  async getInventoryTrend(
    from?: Date,
    to?: Date,
    interval?: string,
  ): Promise<InventoryTrendPointDto[]> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 120);

    const response = await this.es.search({
      index: 'inventory_lots_*',
      size: 0,
      query: {
        range: {
          modified_date: {
            gte: fromDate.toISOString(),
            lte: toDate.toISOString(),
          },
        },
      },
      aggs: {
        by_period: {
          date_histogram: {
            field: 'modified_date',
            calendar_interval: normalizedInterval,
            min_doc_count: 0,
            format: this.getDateFormat(normalizedInterval),
          },
          aggs: {
            total_quantity: {
              sum: {
                field: 'quantity',
              },
            },
          },
        },
      },
    });

    const buckets: any[] = (response.aggregations?.by_period as any)?.buckets ?? [];
    return buckets.map((bucket) => ({
      period: bucket.key_as_string,
      lot_count: bucket.doc_count ?? 0,
      total_quantity: bucket.total_quantity?.value ?? 0,
    }));
  }

  async getMaterialUsageTrend(
    from?: Date,
    to?: Date,
    interval?: string,
    limit = 10,
  ): Promise<MaterialUsageTrendPointDto[]> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 90);

    const response = await this.es.search({
      index: 'inventory_transactions_*',
      size: 0,
      query: {
        range: {
          transaction_date: {
            gte: fromDate.toISOString(),
            lte: toDate.toISOString(),
          },
        },
      },
      aggs: {
        by_period: {
          date_histogram: {
            field: 'transaction_date',
            calendar_interval: normalizedInterval,
            min_doc_count: 0,
            format: this.getDateFormat(normalizedInterval),
          },
          aggs: {
            by_material: {
              terms: {
                field: 'material_id',
                size: Math.max(1, limit),
              },
              aggs: {
                total_quantity: {
                  sum: { field: 'quantity' },
                },
              },
            },
          },
        },
      },
    });

    const points: MaterialUsageTrendPointDto[] = [];
    const buckets: any[] = (response.aggregations?.by_period as any)?.buckets ?? [];

    for (const periodBucket of buckets) {
      const materialBuckets: any[] = periodBucket.by_material?.buckets ?? [];
      for (const materialBucket of materialBuckets) {
        points.push({
          period: periodBucket.key_as_string,
          material_id: materialBucket.key,
          transaction_count: materialBucket.doc_count ?? 0,
          total_quantity: materialBucket.total_quantity?.value ?? 0,
        });
      }
    }

    return points;
  }

  async getQcTrend(
    from?: Date,
    to?: Date,
    interval?: string,
    limit = 10,
  ): Promise<{
    points: QcTrendPointDto[];
    supplier_rankings: QcSupplierRankingItemDto[];
  }> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 90);

    const response = await this.es.search({
      index: 'qc_tests_*',
      size: 0,
      query: {
        range: {
          test_date: {
            gte: fromDate.toISOString(),
            lte: toDate.toISOString(),
          },
        },
      },
      aggs: {
        by_period: {
          date_histogram: {
            field: 'test_date',
            calendar_interval: normalizedInterval,
            min_doc_count: 0,
            format: this.getDateFormat(normalizedInterval),
          },
          aggs: {
            pass_count: {
              filter: {
                term: { 'result_status': 'Pass' },
              },
            },
            fail_count: {
              filter: {
                term: { 'result_status': 'Fail' },
              },
            },
            pending_count: {
              filter: {
                term: { 'result_status': 'Pending' },
              },
            },
          },
        },
        by_supplier: {
          terms: {
            field: 'supplier_name',
            size: Math.max(1, limit),
          },
          aggs: {
            pass_count: {
              filter: {
                term: { 'result_status': 'Pass' },
              },
            },
            fail_count: {
              filter: {
                term: { 'result_status': 'Fail' },
              },
            },
          },
        },
      },
    });

    const periodBuckets: any[] = (response.aggregations?.by_period as any)?.buckets ?? [];
    const points: QcTrendPointDto[] = periodBuckets.map((bucket) => ({
      period: bucket.key_as_string,
      pass_count: bucket.pass_count?.doc_count ?? 0,
      fail_count: bucket.fail_count?.doc_count ?? 0,
      pending_count: bucket.pending_count?.doc_count ?? 0,
    }));

    const supplierBuckets: any[] = (response.aggregations?.by_supplier as any)?.buckets ?? [];
    const supplier_rankings: QcSupplierRankingItemDto[] = supplierBuckets.map((bucket) => {
      const pass_count = bucket.pass_count?.doc_count ?? 0;
      const fail_count = bucket.fail_count?.doc_count ?? 0;
      const total = pass_count + fail_count;
      const quality_rate = total > 0 ? Math.round((pass_count / total) * 10000) / 100 : 0;

      return {
        supplier_name: bucket.key,
        pass_count,
        fail_count,
        quality_rate,
      };
    });

    return {
      points,
      supplier_rankings,
    };
  }

  async getAuditTrend(
    from?: Date,
    to?: Date,
    interval?: string,
  ): Promise<AuditTrendPointDto[]> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 120);

    const response = await this.es.search({
      index: 'inventory_audit_reports_*',
      size: 0,
      query: {
        range: {
          modified_date: {
            gte: fromDate.toISOString(),
            lte: toDate.toISOString(),
          },
        },
      },
      aggs: {
        by_period: {
          date_histogram: {
            field: 'modified_date',
            calendar_interval: normalizedInterval,
            min_doc_count: 0,
            format: this.getDateFormat(normalizedInterval),
          },
          aggs: {
            unique_users: {
              cardinality: {
                field: 'performed_by',
              },
            },
          },
        },
      },
    });

    const buckets: any[] = (response.aggregations?.by_period as any)?.buckets ?? [];
    return buckets.map((bucket) => ({
      period: bucket.key_as_string,
      activity_count: bucket.doc_count ?? 0,
      unique_users: bucket.unique_users?.value ?? 0,
    }));
  }
}
