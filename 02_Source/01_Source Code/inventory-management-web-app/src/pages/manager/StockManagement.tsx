// === StockManagement.tsx ===
// Trang quản lý phiếu kho (Warehouse Slip) dành cho Manager
// Methods/Features: Xem danh sách phiếu kho (Inbound/Outbound) với phân trang, lọc theo loại phiếu và khoảng thời gian, xem chi tiết phiếu (OrderDetailDrawer), phê duyệt phiếu (approveWarehouseSlip), từ chối phiếu (rejectWarehouseSlip)
// Components: OrderWorklistTable, OrderDetailDrawer, ConfirmOrderDrawer, RejectOrderModal, Toast
// API/Dependencies: warehouseSlipService (fetchWarehouseSlip, approveWarehouseSlip, rejectWarehouseSlip), types/warehouseSlip