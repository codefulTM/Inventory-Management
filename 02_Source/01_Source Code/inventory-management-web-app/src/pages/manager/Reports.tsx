// === Reports.tsx ===
// Trang báo cáo kiểm kê tồn kho (Inventory Audit Report) dành cho Manager
// Methods/Features: Tạo mới báo cáo kiểm kê, xem danh sách báo cáo với phân trang, xem chi tiết báo cáo (danh sách vật tư, số lượng thực tế vs hệ thống), tải file PDF, lọc theo trạng thái/người tạo/khoảng thời gian, auto-poll báo cáo đang xử lý mỗi 3s
// Components: InventoryAuditReportCreateForm, InventoryAuditReportTable, InventoryAuditReportDetailPanel, Toast
// API/Dependencies: inventoryAuditReportService, INVENTORY_AUDIT_REPORT_STATUSES/LABELS