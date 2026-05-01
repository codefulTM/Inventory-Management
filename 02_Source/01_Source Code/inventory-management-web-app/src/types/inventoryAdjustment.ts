export type InventoryAdjustmentReasonCode =
  | "DAMAGED"
  | "LOST"
  | "EXPIRED"
  | "COUNT_CORRECTION"
  | "SYSTEM_CORRECTION"
  | "OTHER";

export const INVENTORY_ADJUSTMENT_REASON_CODES: InventoryAdjustmentReasonCode[] =
  [
    "DAMAGED",
    "LOST",
    "EXPIRED",
    "COUNT_CORRECTION",
    "SYSTEM_CORRECTION",
    "OTHER",
  ];

export const INVENTORY_ADJUSTMENT_REASON_LABELS: Record<
  InventoryAdjustmentReasonCode,
  string
> = {
  DAMAGED: "Hàng hỏng",
  LOST: "Mất mát",
  EXPIRED: "Hết hạn",
  COUNT_CORRECTION: "Điều chỉnh kiểm kê",
  SYSTEM_CORRECTION: "Điều chỉnh hệ thống",
  OTHER: "Khác",
};

export interface CreateInventoryAdjustmentRequest {
  lot_id: string;
  adjustment_quantity: number;
  reason_code: InventoryAdjustmentReasonCode;
  reason_note?: string;
  unit_cost_snapshot: number;
}

export interface InventoryAdjustmentLotSnapshot {
  lot_id: string;
  quantity: number;
  unit_of_measure: string;
}

export interface CreateInventoryAdjustmentResponse {
  adjustment_id: string;
  lot_before: InventoryAdjustmentLotSnapshot;
  lot_after: InventoryAdjustmentLotSnapshot;
  transaction_id: string;
  valuation_before: number;
  valuation_after: number;
  valuation_delta: number;
  material_id: string;
  reason_code: InventoryAdjustmentReasonCode;
  reason_note?: string;
  performed_by: string;
  created_date?: string;
}

export interface InventoryAdjustmentItem {
  adjustment_id: string;
  lot_id: string;
  material_id: string;
  adjustment_quantity: number;
  quantity_before: number;
  quantity_after: number;
  reason_code: InventoryAdjustmentReasonCode;
  reason_note?: string;
  unit_cost_snapshot: number;
  valuation_before: number;
  valuation_after: number;
  valuation_delta: number;
  performed_by: string;
  approved_by?: string;
  linked_transaction_id: string;
  created_date?: string;
  modified_date?: string;
}

export interface InventoryAdjustmentListQuery {
  page?: number;
  limit?: number;
  lot_id?: string;
  material_id?: string;
  performed_by?: string;
  reason_code?: InventoryAdjustmentReasonCode;
  from?: string;
  to?: string;
}

export interface InventoryAdjustmentListResponse {
  items: InventoryAdjustmentItem[];
  total: number;
  page: number;
  limit: number;
}
