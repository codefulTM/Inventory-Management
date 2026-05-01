export interface Warehouse {
  _id: string;
  warehouse_id: string;
  warehouse_name: string;
  description?: string;
  is_active: boolean;
  created_date: string;
  modified_date?: string;
}

export interface CreateWarehouseRequest {
  warehouse_id: string;
  warehouse_name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateWarehouseRequest {
  warehouse_id?: string;
  warehouse_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface PaginatedWarehouseResponse {
  data: Warehouse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WarehouseSearchParams {
  page?: number;
  limit?: number;
  q?: string;
}
