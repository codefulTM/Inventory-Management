export type InventoryStatusItem = {
  material_id: string;
  lot_id: string;
  quantity: number;
  status: string;
  expiration_date?: string;
};

export type InventoryStatusReport = {
  generated_at: string;
  total_lots: number;
  items: InventoryStatusItem[];
};

export type MaterialUsageItem = {
  material_id: string;
  transaction_count: number;
  total_quantity: number;
};

export type MaterialUsageReport = {
  generated_at: string;
  from?: string;
  to?: string;
  items: MaterialUsageItem[];
};

export type QcPerformanceItem = {
  supplier_name: string;
  approved: number;
  rejected: number;
  quality_rate: number;
};

export type QcPerformanceReport = {
  generated_at: string;
  items: QcPerformanceItem[];
};

export type AuditEntry = {
  action: string;
  entity: string;
  performed_by: string;
  performed_at: string;
  details?: Record<string, unknown>;
};

export type AuditReport = {
  generated_at: string;
  entries: AuditEntry[];
};

export type TrendInterval = 'day' | 'week' | 'month';

export type InventoryTrendPoint = {
  period: string;
  lot_count: number;
  total_quantity: number;
};

export type InventoryTrendReport = {
  generated_at: string;
  from: string;
  to: string;
  interval: TrendInterval;
  points: InventoryTrendPoint[];
};

export type MaterialUsageTrendPoint = {
  period: string;
  material_id: string;
  transaction_count: number;
  total_quantity: number;
};

export type MaterialUsageTrendReport = {
  generated_at: string;
  from: string;
  to: string;
  interval: TrendInterval;
  points: MaterialUsageTrendPoint[];
};

export type QcTrendPoint = {
  period: string;
  pass_count: number;
  fail_count: number;
  pending_count: number;
};

export type QcSupplierRankingItem = {
  supplier_name: string;
  pass_count: number;
  fail_count: number;
  quality_rate: number;
};

export type QcTrendReport = {
  generated_at: string;
  from: string;
  to: string;
  interval: TrendInterval;
  points: QcTrendPoint[];
  supplier_rankings: QcSupplierRankingItem[];
};

export type AuditTrendPoint = {
  period: string;
  activity_count: number;
  unique_users: number;
};

export type AuditTrendReport = {
  generated_at: string;
  from: string;
  to: string;
  interval: TrendInterval;
  points: AuditTrendPoint[];
};
