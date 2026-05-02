// =============================================================================
// File: reports/repositories/reports.repository.ts
// Mục đích: Repository layer truy vấn dữ liệu trực tiếp từ Elasticsearch
// 
// Trách nhiệm:
// - Xây dựng Elasticsearch queries/aggregations phù hợp cho từng loại báo cáo
// - Thực thi search queries và xử lý response từ ES
// - Map ES response sang DTO objects
// - Log debug info cho mỗi query
// 
// Các indices được truy vấn:
// - inventory_lots_*: dữ liệu lot hàng (status, quantity, expiration)
// - inventory_transactions_*: dữ liệu giao dịch xuất/nhập kho
// - qc_tests_*: dữ liệu kiểm tra chất lượng
// - inventory_audit_reports_*: dữ liệu audit trail
// =============================================================================

import { Injectable, Inject, Logger } from "@nestjs/common";
import { Client } from "@elastic/elasticsearch";
import { ELASTICSEARCH_CLIENT } from "../../elasticsearch/elasticsearch.constants";
import type { InventoryStatusItemDto } from "../dto/inventory-status-report.dto";
import type { MaterialUsageItemDto } from "../dto/material-usage-report.dto";
import type { QcPerformanceItemDto } from "../dto/qc-performance-report.dto";
import type { AuditEntryDto } from "../dto/audit-report.dto";
import type {
  AuditTrendPointDto,
  InventoryTrendPointDto,
  MaterialUsageTrendPointDto,
  QcSupplierRankingItemDto,
  QcTrendPointDto,
  TrendInterval,
} from "../dto/trend-report.dto";

@Injectable()
export class ReportsRepository {
  // Logger để debug và theo dõi các queries
  private readonly logger = new Logger(ReportsRepository.name);

  // Inject Elasticsearch Client đã được cấu hình từ ElasticsearchQueryModule
  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly es: Client) {}

  // ---------------------------------------------------------------------------
  // Chuẩn hóa interval cho date_histogram aggregation
  // Chỉ chấp nhận 'day', 'week', 'month'
  // ---------------------------------------------------------------------------
  private normalizeInterval(interval?: string): TrendInterval {
    if (interval === "week" || interval === "month") {
      return interval;
    }
    return "day";
  }

  // ---------------------------------------------------------------------------
  // Giải quyết thời gian tìm kiếm, tương tự như ở Service nhưng dùng Date objects
  // ---------------------------------------------------------------------------
  private resolveTimeWindow(from?: Date, to?: Date, fallbackDays = 90) {
    const toDate = to ?? new Date();
    const fromDate =
      from ?? new Date(toDate.getTime() - fallbackDays * 24 * 60 * 60 * 1000);

    return {
      fromDate,
      toDate,
    };
  }

  // ---------------------------------------------------------------------------
  // Lấy date format string cho Elasticsearch date_histogram
  // - month: "yyyy-MM" (ví dụ: 2026-04)
  // - week: "yyyy-ww" (ví dụ: 2026-15, tuần thứ 15)
  // - day: "yyyy-MM-dd" (mặc định)
  // ---------------------------------------------------------------------------
  private getDateFormat(interval: TrendInterval): string {
    if (interval === "month") {
      return "yyyy-MM";
    }
    if (interval === "week") {
      return "yyyy-ww";
    }
    return "yyyy-MM-dd";
  }

  // =========================================================================
  // BÁO CÁO TRẠNG THÁI INVENTORY
  // =========================================================================
  
  /**
   * Truy vấn inventory_lots_* index
   * Aggregation: nhóm theo status, tính tổng quantity, lấy mẫu các lots
   * Trả về: danh sách tất cả lots với thông tin material_id, lot_id, quantity, status
   */
  async getInventoryStatus(
    from?: Date,
    to?: Date,
    warehouseId?: string,
  ): Promise<InventoryStatusItemDto[]> {
    // Xây dựng mảng điều kiện lọc (must clauses)
    const must: any[] = [];
    
    // Lọc theo khoảng thời gian modified_date nếu có
    if (from || to) {
      must.push({
        range: {
          modified_date: {
            ...(from ? { gte: from.toISOString() } : {}),
            ...(to ? { lte: to.toISOString() } : {}),
          },
        },
      });
    }
    
    // Lọc theo warehouse_id nếu có
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    // Nếu không có điều kiện nào thì dùng match_all
    const query = must.length ? { bool: { must } } : { match_all: {} };

    // Thực hiện ES search với aggregations
    const result = await this.es.search({
      index: "inventory_lots_*",
      size: 0, // Không cần trả về documents, chỉ cần aggregations
      query,
      aggs: {
        by_status: {
          terms: { field: "status", size: 50 }, // Nhóm theo status, lấy tối đa 50 status khác nhau
          aggs: {
            total_quantity: { sum: { field: "quantity" } }, // Tính tổng quantity cho mỗi status
            sample_lots: {
              top_hits: {
                size: 100, // Lấy tối đa 100 lots mẫu cho mỗi status
                _source: [
                  "material_id",
                  "lot_id",
                  "quantity",
                  "status",
                  "expiration_date",
                ],
              },
            },
          },
        },
      },
    });

    // Xử lý response: lấy các buckets từ aggregation
    const buckets: any[] =
      (result.aggregations?.by_status as any)?.buckets ?? [];
    const items: InventoryStatusItemDto[] = [];

    // Duyệt qua từng status bucket và lấy các lots mẫu
    for (const bucket of buckets) {
      const hits: any[] = bucket.sample_lots?.hits?.hits ?? [];
      for (const hit of hits) {
        const src = hit._source;
        items.push({
          material_id: src.material_id ?? "",
          lot_id: src.lot_id ?? "",
          quantity: src.quantity ?? 0,
          status: src.status ?? "",
          expiration_date: src.expiration_date
            ? new Date(src.expiration_date)
            : undefined,
        });
      }
    }

    this.logger.debug(`[getInventoryStatus] returned ${items.length} items`);
    return items;
  }

  // =========================================================================
  // BÁO CÁO SỬ DỤNG NGUYÊN LIỆU
  // =========================================================================
  
  /**
   * Truy vấn inventory_transactions_* index
   * Aggregation: nhóm theo material_id, tính tổng quantity và đếm số giao dịch
   * Trả về: danh sách material với transaction_count và total_quantity
   */
  async getMaterialUsage(
    from?: Date,
    to?: Date,
    warehouseId?: string,
  ): Promise<MaterialUsageItemDto[]> {
    const must: any[] = [];
    
    // Lọc theo transaction_date
    if (from || to) {
      must.push({
        range: {
          transaction_date: {
            ...(from ? { gte: from.toISOString() } : {}),
            ...(to ? { lte: to.toISOString() } : {}),
          },
        },
      });
    }
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    const query = must.length ? { bool: { must } } : { match_all: {} };

    const result = await this.es.search({
      index: "inventory_transactions_*",
      size: 0,
      query,
      aggs: {
        by_material: {
          terms: { field: "material_id", size: 500 }, // Top 500 materials được giao dịch nhiều nhất
          aggs: {
            total_quantity: {
              sum: { field: "quantity" }, // Tổng quantity cho mỗi material
            },
          },
        },
      },
    });

    const buckets: any[] =
      (result.aggregations?.by_material as any)?.buckets ?? [];

    // Map buckets sang DTO, mỗi bucket là một material
    const items: MaterialUsageItemDto[] = buckets.map((bucket) => ({
      material_id: bucket.key,
      transaction_count: bucket.doc_count ?? 0, // Số lượng giao dịch (documents)
      total_quantity: bucket.total_quantity?.value ?? 0, // Tổng số lượng
    }));

    this.logger.debug(`[getMaterialUsage] returned ${items.length} items`);
    return items;
  }

  // =========================================================================
  // BÁO CÁO HIỆU SUẤT QC
  // =========================================================================
  
  /**
   * Truy vấn qc_tests_* index
   * Aggregation: nhóm theo supplier_name, sau đó theo result_status (Pass/Fail)
   * Tính quality_rate = (approved / (approved + rejected)) * 100
   * Hỗ trợ cả 2 nhãn: "Pass"/"Fail" và "Accepted"/"Rejected"
   */
  async getQcPerformance(
    from?: Date,
    to?: Date,
    warehouseId?: string,
  ): Promise<QcPerformanceItemDto[]> {
    const must: any[] = [];
    
    // Lọc theo test_date
    if (from || to) {
      must.push({
        range: {
          test_date: {
            ...(from ? { gte: from.toISOString() } : {}),
            ...(to ? { lte: to.toISOString() } : {}),
          },
        },
      });
    }
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    const query = must.length ? { bool: { must } } : { match_all: {} };

    const result = await this.es.search({
      index: "qc_tests_*",
      size: 0,
      query,
      aggs: {
        by_supplier: {
          terms: { field: "supplier_name", size: 500 }, // Top 500 suppliers
          aggs: {
            by_result: {
              terms: { field: "result_status", size: 10 }, // Các kết quả: Pass, Fail, Pending...
            },
          },
        },
      },
    });

    const buckets: any[] =
      (result.aggregations?.by_supplier as any)?.buckets ?? [];

    // Map từng supplier bucket sang DTO, tính quality_rate
    const items: QcPerformanceItemDto[] = buckets.map((supplierBucket) => {
      const resultBuckets: any[] = supplierBucket.by_result?.buckets ?? [];
      
      // Đếm số lượng Pass/Accepted và Fail/Rejected
      const approved =
        resultBuckets.find((b) => b.key === "Pass" || b.key === "Accepted")
          ?.doc_count ?? 0;
      const rejected =
        resultBuckets.find((b) => b.key === "Fail" || b.key === "Rejected")
          ?.doc_count ?? 0;
      
      const total = approved + rejected;
      // Tính tỷ lệ chất lượng, làm tròn 2 chữ số thập phân
      const quality_rate =
        total > 0 ? Math.round((approved / total) * 10000) / 100 : 0;

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

  // =========================================================================
  // BÁO CÁO AUDIT TRAIL (có phân trang)
  // =========================================================================
  
  /**
   * Truy vấn inventory_audit_reports_* index
   * Lấy tất cả audit entries, sắp xếp theo modified_date giảm dần
   * Hỗ trợ phân trang với page và size
   */
  async getAuditTrail(
    page = 0,
    size = 20,
    from?: Date,
    to?: Date,
    warehouseId?: string,
  ): Promise<AuditEntryDto[]> {
    const must: any[] = [];
    
    // Lọc theo modified_date
    if (from || to) {
      must.push({
        range: {
          modified_date: {
            ...(from ? { gte: from.toISOString() } : {}),
            ...(to ? { lte: to.toISOString() } : {}),
          },
        },
      });
    }
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    const query = must.length ? { bool: { must } } : { match_all: {} };

    // Lấy documents (không dùng aggregations) với phân trang
    const result = await this.es.search({
      index: "inventory_audit_reports_*",
      from: page * size, // Công thức skip: page * size
      size, // Số lượng records trên mỗi page
      query,
      sort: [{ modified_date: { order: "desc" } }], // Sắp xếp mới nhất trước
    });

    const hits: any[] = result.hits?.hits ?? [];

    // Map ES hits sang AuditEntryDto
    const entries: AuditEntryDto[] = hits.map((hit) => {
      const src = hit._source;
      return {
        action: src.action ?? "",
        entity: src.entity ?? src.collection ?? "", // Hỗ trợ cả 2 field name
        performed_by: src.performed_by ?? src.user_id ?? "", // Hỗ trợ cả 2 field name
        performed_at: src.performed_at
          ? new Date(src.performed_at)
          : new Date(src.modified_date ?? 0),
        details: src.details ?? undefined,
      };
    });

    this.logger.debug(
      `[getAuditTrail] returned ${entries.length} entries (page=${page}, size=${size})`,
    );
    return entries;
  }

  // =========================================================================
  // BÁO CÁO XU HƯỚNG INVENTORY (time-series)
  // =========================================================================
  
  async getInventoryTrend(
    from?: Date,
    to?: Date,
    interval?: string,
    warehouseId?: string,
  ): Promise<InventoryTrendPointDto[]> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 120);

    const must: any[] = [];
    // Luôn có date range cho trend reports
    must.push({
      range: {
        modified_date: {
          gte: fromDate.toISOString(),
          lte: toDate.toISOString(),
        },
      },
    });
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    // Date histogram aggregation: nhóm theo thời gian (day/week/month)
    const response = await this.es.search({
      index: "inventory_lots_*",
      size: 0,
      query: { bool: { must } },
      aggs: {
        by_period: {
          date_histogram: {
            field: "modified_date",
            calendar_interval: normalizedInterval, // day, week, hoặc month
            min_doc_count: 0, // Trả về cả các period không có data
            format: this.getDateFormat(normalizedInterval), // Format chuỗi period
          },
          aggs: {
            total_quantity: {
              sum: {
                field: "quantity",
              },
            },
          },
        },
      },
    });

    const buckets: any[] =
      (response.aggregations?.by_period as any)?.buckets ?? [];
    
    // Map mỗi period bucket sang InventoryTrendPointDto
    return buckets.map((bucket) => ({
      period: bucket.key_as_string, // Chuỗi thời gian đã format
      lot_count: bucket.doc_count ?? 0, // Số lượng lots trong period này
      total_quantity: bucket.total_quantity?.value ?? 0, // Tổng quantity
    }));
  }

  // =========================================================================
  // BÁO CÁO XU HƯỚNG SỬ DỤNG NGUYÊN LIỆU (time-series + top N materials)
  // =========================================================================
  
  async getMaterialUsageTrend(
    from?: Date,
    to?: Date,
    interval?: string,
    limit = 10,
    warehouseId?: string,
  ): Promise<MaterialUsageTrendPointDto[]> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 90);

    const must: any[] = [];
    must.push({
      range: {
        transaction_date: {
          gte: fromDate.toISOString(),
          lte: toDate.toISOString(),
        },
      },
    });
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    // Double aggregation: date_histogram -> terms(material_id)
    const response = await this.es.search({
      index: "inventory_transactions_*",
      size: 0,
      query: { bool: { must } },
      aggs: {
        by_period: {
          date_histogram: {
            field: "transaction_date",
            calendar_interval: normalizedInterval,
            min_doc_count: 0,
            format: this.getDateFormat(normalizedInterval),
          },
          aggs: {
            by_material: {
              terms: {
                field: "material_id",
                size: Math.max(1, limit), // Top N materials
              },
              aggs: {
                total_quantity: {
                  sum: { field: "quantity" },
                },
              },
            },
          },
        },
      },
    });

    const points: MaterialUsageTrendPointDto[] = [];
    const buckets: any[] =
      (response.aggregations?.by_period as any)?.buckets ?? [];

    // Flatten: mỗi combination của (period, material) thành một point
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

  // =========================================================================
  // BÁO CÁO XU HƯỚNG QC + XẾP HẠNG NHÀ CUNG CẤP
  // =========================================================================
  
  async getQcTrend(
    from?: Date,
    to?: Date,
    interval?: string,
    limit = 10,
    warehouseId?: string,
  ): Promise<{
    points: QcTrendPointDto[];
    supplier_rankings: QcSupplierRankingItemDto[];
  }> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 90);

    const must: any[] = [];
    must.push({
      range: {
        test_date: {
          gte: fromDate.toISOString(),
          lte: toDate.toISOString(),
        },
      },
    });
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    // Complex aggregation: cả date_histogram và terms(supplier) cùng lúc
    const response = await this.es.search({
      index: "qc_tests_*",
      size: 0,
      query: { bool: { must } },
      aggs: {
        // Aggregation 1: Xu hướng theo thời gian
        by_period: {
          date_histogram: {
            field: "test_date",
            calendar_interval: normalizedInterval,
            min_doc_count: 0,
            format: this.getDateFormat(normalizedInterval),
          },
          aggs: {
            // Dùng filter aggregations để đếm pass/fail/pending
            pass_count: {
              filter: { term: { result_status: "Pass" } },
            },
            fail_count: {
              filter: { term: { result_status: "Fail" } },
            },
            pending_count: {
              filter: { term: { result_status: "Pending" } },
            },
          },
        },
        // Aggregation 2: Xếp hạng nhà cung cấp (top N)
        by_supplier: {
          terms: {
            field: "supplier_name",
            size: Math.max(1, limit),
          },
          aggs: {
            pass_count: {
              filter: { term: { result_status: "Pass" } },
            },
            fail_count: {
              filter: { term: { result_status: "Fail" } },
            },
          },
        },
      },
    });

    // Xử lý trend points theo thời gian
    const periodBuckets: any[] =
      (response.aggregations?.by_period as any)?.buckets ?? [];
    const points: QcTrendPointDto[] = periodBuckets.map((bucket) => ({
      period: bucket.key_as_string,
      pass_count: bucket.pass_count?.doc_count ?? 0,
      fail_count: bucket.fail_count?.doc_count ?? 0,
      pending_count: bucket.pending_count?.doc_count ?? 0,
    }));

    // Xử lý supplier rankings
    const supplierBuckets: any[] =
      (response.aggregations?.by_supplier as any)?.buckets ?? [];
    const supplier_rankings: QcSupplierRankingItemDto[] = supplierBuckets.map(
      (bucket) => {
        const pass_count = bucket.pass_count?.doc_count ?? 0;
        const fail_count = bucket.fail_count?.doc_count ?? 0;
        const total = pass_count + fail_count;
        const quality_rate =
          total > 0 ? Math.round((pass_count / total) * 10000) / 100 : 0;

        return {
          supplier_name: bucket.key,
          pass_count,
          fail_count,
          quality_rate,
        };
      },
    );

    return {
      points,
      supplier_rankings,
    };
  }

  // =========================================================================
  // BÁO CÁO XU HƯỚNG AUDIT ACTIVITIES
  // =========================================================================
  
  async getAuditTrend(
    from?: Date,
    to?: Date,
    interval?: string,
    warehouseId?: string,
  ): Promise<AuditTrendPointDto[]> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveTimeWindow(from, to, 120);

    const must: any[] = [];
    must.push({
      range: {
        modified_date: {
          gte: fromDate.toISOString(),
          lte: toDate.toISOString(),
        },
      },
    });
    if (warehouseId) {
      must.push({ term: { warehouse_id: warehouseId } });
    }

    const response = await this.es.search({
      index: "inventory_audit_reports_*",
      size: 0,
      query: { bool: { must } },
      aggs: {
        by_period: {
          date_histogram: {
            field: "modified_date",
            calendar_interval: normalizedInterval,
            min_doc_count: 0,
            format: this.getDateFormat(normalizedInterval),
          },
          aggs: {
            // Cardinality aggregation: đếm số lượng unique users
            unique_users: {
              cardinality: {
                field: "performed_by",
              },
            },
          },
        },
      },
    });

    const buckets: any[] =
      (response.aggregations?.by_period as any)?.buckets ?? [];
    
    // Map sang AuditTrendPointDto: activity_count và unique_users mỗi period
    return buckets.map((bucket) => ({
      period: bucket.key_as_string,
      activity_count: bucket.doc_count ?? 0,
      unique_users: bucket.unique_users?.value ?? 0,
    }));
  }
}
