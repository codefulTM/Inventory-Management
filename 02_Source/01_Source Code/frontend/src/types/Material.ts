export type MaterialType =
  | "API"
  | "Excipient"
  | "Dietary Supplement"
  | "Container"
  | "Closure"
  | "Process Chemical"
  | "Testing Material";

export interface Material {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: MaterialType;
  storage_conditions?: string;
  specification_document?: string;
  created_date: string;
  modified_date?: string;
  created_by?: string;
  approved_by?: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface CreateMaterialRequest {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: MaterialType;
  storage_conditions?: string;
  specification_document?: string;
}

export interface UpdateMaterialRequest {
  part_number?: string;
  material_name?: string;
  material_type?: MaterialType;
  storage_conditions?: string;
  specification_document?: string;
}

export interface PaginatedMaterialResponse {
  data: Material[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MaterialSearchParams {
  page?: number;
  limit?: number;
  q?: string; // for search
  type?: MaterialType; // for filter by type
}
