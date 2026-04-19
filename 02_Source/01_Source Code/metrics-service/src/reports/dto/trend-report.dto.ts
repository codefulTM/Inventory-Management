export type TrendInterval = 'day' | 'week' | 'month';

export class InventoryTrendPointDto {
  period: string;
  lot_count: number;
  total_quantity: number;
}

export class InventoryTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: InventoryTrendPointDto[];
}

export class MaterialUsageTrendPointDto {
  period: string;
  material_id: string;
  transaction_count: number;
  total_quantity: number;
}

export class MaterialUsageTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: MaterialUsageTrendPointDto[];
}

export class QcTrendPointDto {
  period: string;
  pass_count: number;
  fail_count: number;
  pending_count: number;
}

export class QcSupplierRankingItemDto {
  supplier_name: string;
  pass_count: number;
  fail_count: number;
  quality_rate: number;
}

export class QcTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: QcTrendPointDto[];
  supplier_rankings: QcSupplierRankingItemDto[];
}

export class AuditTrendPointDto {
  period: string;
  activity_count: number;
  unique_users: number;
}

export class AuditTrendReportDto {
  generated_at: Date;
  from: Date;
  to: Date;
  interval: TrendInterval;
  points: AuditTrendPointDto[];
}
