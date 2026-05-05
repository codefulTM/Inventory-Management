// === inventory-lot.service.ts ===
// API quản lý lô tồn kho (Inventory Lot)
// Key methods: getAll, getById, getByMaterialId, getByStatus, search, create, update, updateStatus, delete
// API: /inventory-lots, /inventory-lots/material/:id, /inventory-lots/status/:status, /inventory-lots/options
import { apiClient } from "./apiClient";

export type InventoryLotStatus =
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
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name: string;
  manufacture_date?: string;
  received_date: string;
  expiration_date: string;
  in_use_expiration_date?: string;
  status: InventoryLotStatus;
  quantity: string | number;
  unit_of_measure: string;
  storage_location: string;
  warehouse_id?: string;
  is_sample: boolean;
  parent_lot_id?: string;
  notes?: string;
  created_date?: Date;
  modified_date?: Date;
}

export interface GetInventoryLotsResponse {
  data: InventoryLot[];
  total: number;
  page: number;
  limit: number;
}

export interface InventoryLotOptionItem {
  lot_id: string;
  material_id: string;
  quantity: number;
  unit_of_measure: string;
  status: string;
  storage_location: string;
  warehouse_id?: string;
}

export interface GetInventoryLotOptionsResponse {
  items: InventoryLotOptionItem[];
  total: number;
  page: number;
  limit: number;
}

export class InventoryLotAPI {
  /**
   * Get all inventory lots with pagination
   */
  static async getAll(page = 1, limit = 10) {
    // [SKELETON: GET /inventory-lots with page/limit → Return lots array with pagination metadata]
  }

  /**
   * Get inventory lot by ID
   */
  static async getById(id: string) {
    // [SKELETON: GET /inventory-lots/${id} → Return lot or null]
  }

  /**
   * Get lots by material ID
   */
  static async getByMaterialId(materialId: string, page = 1, limit = 10) {
    // [SKELETON: GET /inventory-lots/material/${materialId} → Return lots array]
  }

  /**
   * Get lots by status
   */
  static async getByStatus(status: InventoryLotStatus, page = 1, limit = 10) {
    // [SKELETON: GET /inventory-lots/status/${status} → Return lots array]
  }

  /**
   * Search inventory lots
   */
  static async search(query: string, page = 1, limit = 10) {
    // [SKELETON: GET /inventory-lots/search?q={query} → Return lots array with pagination]
  }

  /**
   * Get lot options for dropdown selections
   */
  static async getOptions(params?: {
    q?: string;
    material_id?: string;
    status?: string;
    exclude_status?: string;
    warehouse_id?: string;
    page?: number;
    limit?: number;
  }) {
    // [SKELETON: GET /inventory-lots/options with filters → Return items for dropdown]
  }

  /**
   * Create new inventory lot
   */
  static async create(payload: Partial<InventoryLot>) {
    // [SKELETON: POST /inventory-lots with payload → Return created lot]
  }

  /**
   * Update inventory lot
   */
  static async update(id: string, payload: Partial<InventoryLot>) {
    // [SKELETON: PUT /inventory-lots/${id} with payload → Return updated lot]
  }

  /**
   * Update lot status
   */
  static async updateStatus(id: string, status: InventoryLotStatus) {
    // [SKELETON: PUT /inventory-lots/${id}/status with status → Return updated lot]
  }

  /**
   * Delete inventory lot
   */
  static async delete(id: string) {
    // [SKELETON: DELETE /inventory-lots/${id} → Return success flag]
  }

  /**
   * Get expiring lots (expiration soon)
   */
  static async getExpiringSoon(days = 30) {
    // [SKELETON: GET /inventory-lots/expiring-soon?days={days} → Return lots array]
  }

  /**
   * Get expired lots
   */
  static async getExpired() {
    // [SKELETON: GET /inventory-lots/expired → Return lots array]
  }

  /**
   * Get statistics
   */
  static async getStatistics() {
    // [SKELETON: GET /inventory-lots/statistics → Return statistics object]
  }
}