// =============================================================================
// File: reports/dto/trend-report.dto.ts
// Mục đích: Định nghĩa DTO cho tất cả các loại báo cáo xu hướng (time-series)
// 
// Các loại báo cáo xu hướng:
// 1. Inventory Trend - Xu hướng tồn kho theo thời gian
// 2. Material Usage Trend - Xu hướng sử dụng nguyên liệu
// 3. QC Trend - Xu hướng kiểm tra chất lượng + xếp hạng NCC
// 4. Audit Trend - Xu hướng hoạt động audit
//
// TrendInterval: Khoảng thời gian nhóm (day/week/month)
// =============================================================================

// Interval cho date_histogram: day (ngày), week (tuần), month (tháng)
export type TrendInterval = 'day' | 'week' | 'month';

// -----------------------------------------------------------------------------
// Inventory Trend DTOs
// -----------------------------------------------------------------------------
export class InventoryTrendPointDto {
  period: string;        // Chuỗi thời gian đã format (ví dụ: "2026-04-01")
  lot_count: number;      // Số lượng lots trong period này
  total_quantity: number; // Tổng quantity trong period này
}

export class InventoryTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: InventoryTrendPointDto[];
}

// -----------------------------------------------------------------------------
// Material Usage Trend DTOs
// -----------------------------------------------------------------------------
export class MaterialUsageTrendPointDto {
  period: string;        // Chuỗi thời gian
  material_id: string;   // ID nguyên liệu
  transaction_count: number; // Số giao dịch
  total_quantity: number; // Tổng quantity
}

export class MaterialUsageTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: MaterialUsageTrendPointDto[];
}

// -----------------------------------------------------------------------------
// QC Trend DTOs
// -----------------------------------------------------------------------------
export class QcTrendPointDto {
  period: string;        // Chuỗi thời gian
  pass_count: number;     // Số lượng Pass
  fail_count: number;     // Số lượng Fail
  pending_count: number;  // Số lượng Pending
}

export class QcSupplierRankingItemDto {
  supplier_name: string;  // Tên nhà cung cấp
  pass_count: number;     // Số lượng Pass
  fail_count: number;     // Số lượng Fail
  quality_rate: number;   // Tỷ lệ chất lượng (%)
}

export class QcTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: QcTrendPointDto[];
  supplier_rankings: QcSupplierRankingItemDto[]; // Top N suppliers
}

// -----------------------------------------------------------------------------
// Audit Trend DTOs
// -----------------------------------------------------------------------------
export class AuditTrendPointDto {
  period: string;        // Chuỗi thời gian
  activity_count: number; // Số hoạt động (audit entries)
  unique_users: number;  // Số lượng users duy nhất
}

export class AuditTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: AuditTrendPointDto[];
}
