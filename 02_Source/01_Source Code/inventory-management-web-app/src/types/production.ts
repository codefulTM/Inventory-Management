export type BatchStatus = "In Progress" | "Complete" | "On Hold" | "Cancelled";

export const BATCH_STATUS_LIST: BatchStatus[] = [
  "In Progress",
  "Complete",
  "On Hold",
  "Cancelled",
];

export interface ProductionBatch {
  _id: string;
  batch_id: string;
  product_id: string;
  batch_number: string;
  unit_of_measure: string;
  manufacture_date: string;
  expiration_date: string;
  status: BatchStatus;
  batch_size: string; // Decimal128 serialized as string
  created_date: string;
  modified_date: string;
  created_by?: string;
  approved_by?: string;
  completed_by?: string;
  shelf_life_value?: number;
  shelf_life_unit?: string;
}

export interface BatchComponent {
  _id: string;
  component_id?: string;
  batch_id?: string;
  lot_id: string;
  planned_quantity: string;
  actual_quantity?: string;
  unit_of_measure: string;
  addition_date?: string;
  added_by?: string;
  created_date: string;
  modified_date: string;
}

export interface PaginatedProductionBatch {
  data: ProductionBatch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
