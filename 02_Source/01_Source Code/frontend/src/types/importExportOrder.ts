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

export interface ConfirmImportExportOrderItem {
  material_id: string;
  lot_id?: string;
  expected_quantity: number;
  actual_quantity: number;
  variance_quantity: number;
  unit_of_measure: string;
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
  confirmed_by?: string;
  confirmed_at?: string;
  confirm_note?: string;
  blind_count_required?: boolean;
  confirmed_items?: ConfirmImportExportOrderItem[];
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
  warehouse_id: string | null;
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

export interface ResolveImportExportOrderScanPayload {
  scan_code: string;
  order_type?: ImportExportOrderType;
}

export interface MaterialOption {
  material_id: string;
  material_name: string;
  part_number: string;
}

export interface MaterialOptionListResponse {
  data: MaterialOption[];
  total: number;
  page: number;
  limit: number;
}

export interface InventoryLotOption {
  lot_id: string;
  material_id: string;
  quantity: number;
  unit_of_measure: string;
  status: string;
  storage_location: string;
  warehouse_id?: string;
}

export interface InventoryLotOptionListResponse {
  items: InventoryLotOption[];
  total: number;
  page: number;
  limit: number;
}

export interface WarehouseOption {
  warehouse_id: string;
  warehouse_name: string;
  is_active: boolean;
}

export interface WarehouseOptionListResponse {
  items: WarehouseOption[];
  total: number;
  page: number;
  limit: number;
}

export interface StorageLocationOption {
  location_id: string;
  warehouse_id: string;
  location_name: string;
  is_active: boolean;
}

export interface StorageLocationOptionListResponse {
  items: StorageLocationOption[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadImportExportOrderAttachmentPayload {
  file: File;
  source?: ImportExportAttachmentSource;
}

export interface ConfirmImportExportOrderItemPayload {
  material_id: string;
  lot_id?: string;
  expected_quantity: number;
  actual_quantity: number;
  unit_of_measure: string;
}

export interface ConfirmImportExportOrderPayload {
  confirmed_items: ConfirmImportExportOrderItemPayload[];
  confirm_note?: string;
}

export interface RejectImportExportOrderPayload {
  reason: string;
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
