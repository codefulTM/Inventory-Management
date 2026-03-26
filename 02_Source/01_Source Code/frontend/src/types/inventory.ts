/* eslint-disable @typescript-eslint/no-explicit-any */
export type LotStatus =
  | "Pending"
  | "Received"
  | "QC_Pending"
  | "QC_Passed"
  | "QC_Failed"
  | "In_Use"
  | "Consumed"
  | "Disposed"
  | "Quarantine"
  | "Accepted"
  | "Rejected"
  | "Depleted"
  | "Hold";

export interface InventoryLot {
  _id: string;
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name?: string;
  received_date: string;
  expiration_date: string;
  in_use_expiration_date?: string;
  status: LotStatus;
  quantity: number;
  unit_of_measure: string;
  storage_location?: string;
  is_sample: boolean;
  parent_lot_id?: string;
  notes?: string;
  created_date: string;
  modified_date: string;
  received_by?: string;
  qc_by?: string;
  history?: Record<string, any>[];
}

export type TransactionType =
  | "Receipt"
  | "Usage"
  | "Split"
  | "Adjustment"
  | "Transfer"
  | "Disposal";

export interface InventoryTransaction {
  _id: string;
  transaction_id: string;
  lot_id: string;
  related_lot_id?: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_of_measure: string;
  transaction_date: string;
  reference_number?: string;
  performed_by: string;
  notes?: string;
}
