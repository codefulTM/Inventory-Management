/**
 * Response DTO for a single production batch
 */
export class ProductionBatchResponseDto {
  _id: string;
  batch_id: string;
  product_id: string;
  batch_number: string;
  unit_of_measure: string;
  shelf_life_value: number;
  shelf_life_unit: string;
  status: string;
  batch_size: string; // Decimal128 serialized as string
  created_date: Date;
  modified_date: Date;
  created_by?: string;
  approved_by?: string;
  completed_by?: string;
}

/**
 * Response DTO for paginated production batch list
 */
export class PaginatedProductionBatchResponseDto {
  data: ProductionBatchResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Response DTO for a single batch component
 */
export class BatchComponentResponseDto {
  _id: string;
  component_id: string;
  batch_id: string;
  lot_id: string;
  planned_quantity: string; // Decimal128 serialized as string
  actual_quantity?: string;
  unit_of_measure: string;
  addition_date?: Date;
  added_by?: string;
  created_date: Date;
  modified_date: Date;
}
