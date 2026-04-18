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
