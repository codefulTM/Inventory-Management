export type ImportExportOrderType = "Inbound" | "Outbound";

export type ImportExportOrderStatus =
  | "PendingConfirmation"
  | "Confirmed"
  | "Rejected";

export type ImportExportAttachmentSource = "camera" | "upload";

export type ScanMatchedBy =
  | "lot_id"
  | "manufacturer_lot"
  | "material_id"
  | "part_number";

export interface ImportExportOrderItem {
  material_id: string;
  lot_id?: string;
  quantity: number;
  unit_of_measure: string;
  expected_location?: string;
}

export interface ImportExportOrderAttachment {
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  source: ImportExportAttachmentSource;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ImportExportOrder {
  _id?: string;
  order_id: string;
  order_type: ImportExportOrderType;
  status: ImportExportOrderStatus;
  warehouse_id: string;
  reason?: string;
  reference_number?: string;
  created_by: string;
  items: ImportExportOrderItem[];
  attachments: ImportExportOrderAttachment[];
  created_date?: string;
  modified_date?: string;
}

export interface CreateImportExportOrderPayload {
  order_type: ImportExportOrderType;
  warehouse_id: string;
  reason?: string;
  reference_number?: string;
  items: ImportExportOrderItem[];
  attachments?: ImportExportOrderAttachment[];
}

export interface UpdateImportExportOrderPayload {
  order_type?: ImportExportOrderType;
  warehouse_id?: string;
  reason?: string;
  reference_number?: string;
  items?: ImportExportOrderItem[];
  attachments?: ImportExportOrderAttachment[];
}

export interface ImportExportOrderQueryParams {
  status?: ImportExportOrderStatus;
  order_type?: ImportExportOrderType;
  created_by?: string;
  from?: string | Date;
  to?: string | Date;
  page?: number;
  limit?: number;
}

export interface ImportExportOrderListResponse {
  items: ImportExportOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface ResolveScanItem {
  material_id: string;
  lot_id: string | null;
  material_name: string | null;
  unit_of_measure: string | null;
  expected_location: string | null;
}

export interface ResolveScanLotSnapshot {
  status: string;
  quantity: number;
  manufacturer_lot: string;
}

export interface ResolveImportExportOrderScanResult {
  scan_code: string;
  resolved: boolean;
  matched_by: ScanMatchedBy | null;
  item: ResolveScanItem | null;
  lot: ResolveScanLotSnapshot | null;
  warnings: string[];
  message?: string;
}

export interface UploadImportExportOrderAttachmentPayload {
  file: File;
  source?: ImportExportAttachmentSource;
}

export interface ImportExportOrderFormItem {
  material_id: string;
  lot_id?: string;
  quantity: number;
  unit_of_measure: string;
  expected_location?: string;
}

export interface ImportExportOrderFormValues {
  warehouse_id: string;
  reason: string;
  reference_number: string;
  items: ImportExportOrderFormItem[];
}
