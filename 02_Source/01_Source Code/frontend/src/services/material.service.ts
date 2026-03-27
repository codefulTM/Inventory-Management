/**
 * Material API Service
 * Handles all HTTP requests related to Materials
 */

import type {
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  PaginatedMaterialResponse,
  MaterialSearchParams,
  MaterialType,
} from "../types/Material";
import { API_ENDPOINTS } from "../config/api.config";
import { apiClient } from "./apiClient";

class MaterialService {
  /**
   * Get all materials with pagination
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20, max: 100)
   * @returns Paginated list of materials
   */
  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedMaterialResponse> {
    const params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;

    const { data, error } = await apiClient.get<PaginatedMaterialResponse>(
      API_ENDPOINTS.MATERIALS,
      { params: Object.keys(params).length ? params : undefined },
    );
    if (error) throw error;
    return data!;
  }

  /**
   * Get material by ID
   * @param id - Material ID (MongoDB _id)
   * @returns Single material
   */
  async findById(id: string): Promise<Material> {
    const { data, error } = await apiClient.get<Material>(
      API_ENDPOINTS.MATERIALS_DETAIL(id),
    );
    if (error) throw error;
    return data!;
  }

  /**
   * Search materials by name, material_id, or part_number
   * @param query - Search query (minimum 2 characters)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated search results
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponse> {
    const { data, error } = await apiClient.get<PaginatedMaterialResponse>(
      API_ENDPOINTS.MATERIALS_SEARCH,
      { params: { q: query, page, limit } },
    );
    if (error) throw error;
    return data!;
  }

  /**
   * Filter materials by type
   * @param type - Material type enum
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated filtered results
   */
  async filterByType(
    type: MaterialType,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponse> {
    const { data, error } = await apiClient.get<PaginatedMaterialResponse>(
      API_ENDPOINTS.MATERIALS_FILTER_TYPE(type),
      { params: { page, limit } },
    );
    if (error) throw error;
    return data!;
  }

  /**
   * Create a new material
   * @param data - Material creation data
   * @returns Created material
   */
  async create(data: CreateMaterialRequest): Promise<Material> {
    const { data: result, error } = await apiClient.post<Material>(
      API_ENDPOINTS.MATERIALS,
      data,
    );
    if (error) throw error;
    return result!;
  }

  /**
   * Update an existing material
   * @param id - Material ID (MongoDB _id)
   * @param data - Partial material update data
   * @returns Updated material
   */
  async update(id: string, data: UpdateMaterialRequest): Promise<Material> {
    const { data: result, error } = await apiClient.put<Material>(
      API_ENDPOINTS.MATERIALS_UPDATE(id),
      data,
    );
    if (error) throw error;
    return result!;
  }

  /**
   * Delete a material
   * @param id - Material ID (MongoDB _id)
   * @returns Deletion confirmation message
   */
  async delete(id: string): Promise<{ message: string }> {
    const { data, error } = await apiClient.delete<{ message: string }>(
      API_ENDPOINTS.MATERIALS_DELETE(id),
    );
    if (error) throw error;
    return data!;
  }

  /**
   * Get all distinct material types available in the database
   * @returns Array of material types
   */
  async getDistinctTypes(): Promise<MaterialType[]> {
    const { data, error } = await apiClient.get<MaterialType[]>(
      API_ENDPOINTS.MATERIALS_TYPES,
    );
    if (error) throw error;
    return data!;
  }
}

// Export singleton instance
export const materialService = new MaterialService();

// Export class for testing purposes
export default MaterialService;
