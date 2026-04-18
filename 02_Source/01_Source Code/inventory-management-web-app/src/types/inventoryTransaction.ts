export type InventoryTransactionType =
  | "Receipt"
  | "Usage"
  | "Split"
  | "Adjustment"
  | "Transfer"
  | "Disposal";

export interface InventoryTransaction {
  _id?: string;
  transaction_id?: string;
  lot_id: string;
  transaction_type: InventoryTransactionType | string;
  quantity: number;
  unit_of_measure: string;
  transaction_date: string;
  reference_number?: string;
  performed_by: string;
  notes?: string;
  material_id?: string;
  created_date?: string;
  modified_date?: string;
  [key: string]: any;
}

export interface MyHistoryQuery {
  page?: number;
  limit?: number;
  from?: string | Date;
  to?: string | Date;
  transaction_type?: InventoryTransactionType;
  keyword?: string;
}

export interface MyHistoryItem extends InventoryTransaction {
  transaction_id: string;
}

export interface MyHistoryListResponse {
  items: MyHistoryItem[];
  total: number;
}
