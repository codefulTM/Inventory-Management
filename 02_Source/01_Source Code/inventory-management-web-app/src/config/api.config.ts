/**
 * File: config/api.config.ts
 * Cấu hình API cho frontend - Định nghĩa URL gốc và các endpoint của backend
 *
 * Chức năng:
 * - Cấu hình base URL cho tất cả các request đến backend NestJS (port 3001)
 * - Định nghĩa tất cả các endpoint API được sử dụng trong ứng dụng
 * - Hỗ trợ cấu hình timeout và headers mặc định
 */

// Sử dụng biến môi trường VITE_API_URL hoặc mặc định là localhost:3001 cho development
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Cấu hình chung cho API client (axios, fetch, etc.)
export const apiConfig = {
  baseURL: API_BASE_URL, // URL gốc của backend API
  timeout: 30000, // Timeout 30 giây cho mỗi request
  headers: {
    "Content-Type": "application/json", // Mặc định gửi dữ liệu dạng JSON
  },
};

// Định nghĩa tất cả các endpoint API của backend
export const API_ENDPOINTS = {
  // === QUẢN LÝ GIAO DỊCH KHO (Inventory Transactions) ===
  TRANSACTIONS: "/transactions", // Danh sách giao dịch
  TRANSACTIONS_BULK: "/transactions/bulk", // Thao tác hàng loạt giao dịch
  TRANSACTIONS_DETAIL: (id: string) => `/transactions/${id}`, // Chi tiết giao dịch
  TRANSACTIONS_MY_HISTORY: "/transactions/my-history", // Lịch sử giao dịch cá nhân
  TRANSACTIONS_MY_HISTORY_DETAIL: (transactionId: string) =>
    `/transactions/my-history/${transactionId}`, // Chi tiết lịch sử cá nhân

  // === QUẢN LÝ VẬT TƯ (Materials) ===
  MATERIALS: "/materials", // Danh sách vật tư
  MATERIALS_SEARCH: "/materials/search", // Tìm kiếm vật tư
  MATERIALS_OPTIONS: "/materials/options", // Danh sách vật tư cho dropdown
  MATERIALS_TYPES: "/materials/types", // Các loại vật tư
  MATERIALS_DETAIL: (id: string) => `/materials/${id}`, // Chi tiết vật tư
  MATERIALS_UPDATE: (id: string) => `/materials/${id}`, // Cập nhật vật tư
  MATERIALS_DELETE: (id: string) => `/materials/${id}`, // Xóa vật tư
  MATERIALS_FILTER_TYPE: (type: string) => `/materials/type/${type}`, // Lọc theo loại

  // === TEMPLATE NHÃN (Label Templates) ===
  LABEL_TEMPLATES: "/label-templates", // Danh sách template nhãn
  LABEL_TEMPLATES_SEARCH: "/label-templates/search", // Tìm kiếm template
  LABEL_TEMPLATES_TYPES: "/label-templates/types", // Các loại template
  LABEL_TEMPLATES_GENERATE: "/label-templates/generate", // Tạo nhãn từ template
  LABEL_TEMPLATES_DETAIL: (id: string) => `/label-templates/${id}`, // Chi tiết template
  LABEL_TEMPLATES_UPDATE: (id: string) => `/label-templates/${id}`, // Cập nhật template
  LABEL_TEMPLATES_DELETE: (id: string) => `/label-templates/${id}`, // Xóa template
  LABEL_TEMPLATES_FILTER_TYPE: (type: string) =>
    `/label-templates/type/${encodeURIComponent(type)}`, // Lọc theo loại

  // === ĐƠN NHẬP/XUẤT KHO (Import/Export Orders - US24/US25) ===
  IMPORT_EXPORT_ORDERS: "/import-export-orders", // Danh sách đơn nhập/xuất
  IMPORT_EXPORT_ORDER_WORKLIST: "/import-export-orders/worklist", // Danh sách chờ xử lý
  IMPORT_EXPORT_ORDER_DETAIL: (orderId: string) =>
    `/import-export-orders/${orderId}`, // Chi tiết đơn hàng
  IMPORT_EXPORT_ORDER_CONFIRM: (orderId: string) =>
    `/import-export-orders/${orderId}/confirm`, // Xác nhận đơn hàng
  IMPORT_EXPORT_ORDER_REJECT: (orderId: string) =>
    `/import-export-orders/${orderId}/reject`, // Từ chối đơn hàng
  IMPORT_EXPORT_ORDER_ATTACHMENTS: (orderId: string) =>
    `/import-export-orders/${orderId}/attachments`, // Tệp đính kèm
  IMPORT_EXPORT_ORDER_SCAN_RESOLVE: "/import-export-orders/scan/resolve", // Quét và xử lý mã
  IMPORT_EXPORT_WAREHOUSES_OPTIONS: "/import-export-orders/warehouses/options", // Kho cho dropdown
  IMPORT_EXPORT_STORAGE_LOCATIONS_OPTIONS:
    "/import-export-orders/storage-locations/options", // Vị trí lưu kho cho dropdown

  // === LÔ HÀNG (Inventory Lots) ===
  INVENTORY_LOTS_OPTIONS: "/inventory-lots/options", // Danh sách lô hàng cho dropdown

  // === ĐIỀU CHỈNH TỒN KHO (Inventory Adjustment - US10) ===
  INVENTORY_ADJUSTMENTS: "/inventory-adjustments", // Điều chỉnh số lượng tồn kho

  // === BÁO CÁO KIỂM KÊ (Inventory Audit Report - US16) ===
  INVENTORY_AUDIT_REPORTS: "/inventory-audit-reports", // Danh sách báo cáo kiểm kê
  INVENTORY_AUDIT_REPORT_DETAIL: (reportId: string) =>
    `/inventory-audit-reports/${reportId}`, // Chi tiết báo cáo
  INVENTORY_AUDIT_REPORT_DOWNLOAD: (reportId: string) =>
    `/inventory-audit-reports/${reportId}/download`, // Tải xuống báo cáo

  // === PHIẾU KHO (Warehouse Slips - US11) ===
  WAREHOUSE_SLIPS: "/warehouse/slips", // Danh sách phiếu kho
  WAREHOUSE_SLIP_DETAIL: (slipId: string) => `/warehouse/slips/${slipId}`, // Chi tiết phiếu
  WAREHOUSE_SLIP_ATTACHMENTS: (slipId: string) =>
    `/warehouse/slips/${slipId}/attachments`, // Tệp đính kèm phiếu
  WAREHOUSE_SLIP_PRINT: (slipId: string) => `/warehouse/slips/${slipId}/print`, // In phiếu
  WAREHOUSE_SLIP_APPROVE: (slipId: string) =>
    `/warehouse/slips/${slipId}/approve`, // Phê duyệt phiếu
  WAREHOUSE_SLIP_REJECT: (slipId: string) =>
    `/warehouse/slips/${slipId}/reject`, // Từ chối phiếu

  // === DASHBOARD (US17 - Thống kê tổng quan) ===
  DASHBOARD_SUMMARY: "/dashboard/summary", // Tổng quan dashboard
  DASHBOARD_TRENDS: "/dashboard/trends", // Xu hướng biểu đồ
  DASHBOARD_DRILLDOWN: "/dashboard/drilldown", // Chi tiết số liệu
};
