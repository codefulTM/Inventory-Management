export type WarehouseSlipType = "IN" | "OUT";

export type WarehouseSlipStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface WarehouseSlipLine {
  line_id: string;
  material_id?: string;
  sku?: string;
  lot_id?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  expiry_date?: string;
  notes?: string;
}

export interface WarehouseSlipAttachment {
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  storage_source?: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface WarehouseSlip {
  _id?: string;
  slip_id: string;
  slip_number: string;
  type: WarehouseSlipType;
  warehouse_id: string;
  status: WarehouseSlipStatus;
  reference_number?: string;
  total_quantity?: number;
  total_value?: number;
  created_by?: string;
  notes?: string;
  lines: WarehouseSlipLine[];
  attachments: WarehouseSlipAttachment[];
  processed_transactions?: string[];
  created_date?: string;
}
