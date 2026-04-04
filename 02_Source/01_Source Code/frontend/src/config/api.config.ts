/**
 * API Configuration
 * Defines base URL and defaults for API requests
 */

// Use environment variable or default to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const API_ENDPOINTS = {
  TRANSACTIONS: "/transactions",
  TRANSACTIONS_BULK: "/transactions/bulk",
  TRANSACTIONS_DETAIL: (id: string) => `/transactions/${id}`,
  TRANSACTIONS_MY_HISTORY: "/transactions/my-history",
  TRANSACTIONS_MY_HISTORY_DETAIL: (transactionId: string) =>
    `/transactions/my-history/${transactionId}`,

  MATERIALS: "/materials",
  MATERIALS_SEARCH: "/materials/search",
  MATERIALS_TYPES: "/materials/types",
  MATERIALS_DETAIL: (id: string) => `/materials/${id}`,
  MATERIALS_UPDATE: (id: string) => `/materials/${id}`,
  MATERIALS_DELETE: (id: string) => `/materials/${id}`,
  MATERIALS_FILTER_TYPE: (type: string) => `/materials/type/${type}`,

  // Label Template endpoints
  LABEL_TEMPLATES: "/label-templates",
  LABEL_TEMPLATES_SEARCH: "/label-templates/search",
  LABEL_TEMPLATES_TYPES: "/label-templates/types",
  LABEL_TEMPLATES_GENERATE: "/label-templates/generate",
  LABEL_TEMPLATES_DETAIL: (id: string) => `/label-templates/${id}`,
  LABEL_TEMPLATES_UPDATE: (id: string) => `/label-templates/${id}`,
  LABEL_TEMPLATES_DELETE: (id: string) => `/label-templates/${id}`,
  LABEL_TEMPLATES_FILTER_TYPE: (type: string) =>
    `/label-templates/type/${encodeURIComponent(type)}`,

  // Import/Export Order endpoints (US24/US25)
  IMPORT_EXPORT_ORDERS: "/import-export-orders",
  IMPORT_EXPORT_ORDER_WORKLIST: "/import-export-orders/worklist",
  IMPORT_EXPORT_ORDER_DETAIL: (orderId: string) =>
    `/import-export-orders/${orderId}`,
  IMPORT_EXPORT_ORDER_CONFIRM: (orderId: string) =>
    `/import-export-orders/${orderId}/confirm`,
  IMPORT_EXPORT_ORDER_REJECT: (orderId: string) =>
    `/import-export-orders/${orderId}/reject`,
  IMPORT_EXPORT_ORDER_ATTACHMENTS: (orderId: string) =>
    `/import-export-orders/${orderId}/attachments`,
  IMPORT_EXPORT_ORDER_SCAN_RESOLVE: "/import-export-orders/scan/resolve",

  // Inventory Adjustment endpoints (US10)
  INVENTORY_ADJUSTMENTS: "/inventory-adjustments",
  INVENTORY_ADJUSTMENTS_DETAIL: (adjustmentId: string) =>
    `/inventory-adjustments/${adjustmentId}`,
};
