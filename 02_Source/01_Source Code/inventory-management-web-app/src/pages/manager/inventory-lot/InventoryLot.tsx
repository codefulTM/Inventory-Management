// === InventoryLot.tsx ===
// Trang quản lý lô hàng (Inventory Lot) dành cho Manager
// Methods/Features: Hiển thị danh sách lô hàng với phân trang, tìm kiếm theo mã/nhà sản xuất, thêm/sửa/xóa lô hàng qua modal, điều chỉnh tồn kho (inventory adjustment), xem lịch sử điều chỉnh khi ở route /manager/stock
// Components: SearchAndFilters, InventoryLotTable, DetailModal, EditModal, AddModal, LoadingAndError, InventoryAdjustmentForm
// API/Dependencies: InventoryLotAPI, inventoryAdjustmentService, Toast, getCurrentUser