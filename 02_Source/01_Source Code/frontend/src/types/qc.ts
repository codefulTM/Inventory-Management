// Legacy type
export type QCStatus = 'pass' | 'fail' | 'pending';

// ── QCTest ──────────────────────────────────────────────────────────────────
export interface QCTest {
  test_id: string;
  lot_id: string;
  test_type: 'Identity' | 'Potency' | 'Microbial' | 'Growth Promotion' | 'Physical' | 'Chemical';
  test_method: string;
  test_date: string;
  test_result: string;
  acceptance_criteria?: string;
  result_status: 'Pass' | 'Fail' | 'Pending';
  performed_by: string;
  verified_by?: string;
  approved_by?: string;
  reject_reason?: string;
  label_id?: string;
  created_date: string;
  modified_date: string;
  history?: Record<string, any>[];
}

// ── InventoryLot ─────────────────────────────────────────────────────────────
export interface InventoryLot {
  lot_id: string;
  material_name: string;
  supplier_name: string;
  quantity: number;
  unit?: string;
  storage_location?: string;
  expiration_date?: string;
  status: 'Quarantine' | 'Accepted' | 'Rejected' | 'Depleted' | 'Hold';
  created_date?: string;
  modified_date?: string;
  unit_of_measure?: string;
  location?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedInventoryLots {
  data: InventoryLot[];
  pagination: PaginationMeta;
}

// ── KPI / Reporting ──────────────────────────────────────────────────────────
export interface DashboardKPI {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  error_rate: number;
}

export interface SupplierPerformance {
  supplier_name: string;
  total_batches: number;
  approved: number;
  rejected: number;
  quality_rate: number;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface CreateQCTestDto {
  lot_id: string;
  test_type: QCTest['test_type'];
  test_method: string;
  test_date: string;
  test_result: string;
  acceptance_criteria?: string;
  result_status: QCTest['result_status'];
  performed_by: string;
  verified_by?: string;
  reject_reason?: string;
  label_id?: string;
}

export interface LotDecisionDto {
  decision: 'Accepted' | 'Rejected' | 'Hold';
  verified_by: string;
  reject_reason?: string;
  label_id?: string;
}

export interface RetestDto {
  action: 'extend' | 'discard';
  performed_by: string;
  new_expiry_date?: string;
}

// ── AI Supplier Analysis ──────────────────────────────────────────────────────
export interface SupplierAnalysisResponse {
  success: boolean;
  analysis: string;
  suppliers_analyzed: number;
  timestamp: string;
  model_used: string;
}