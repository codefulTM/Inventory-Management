// === ProductCreation.tsx (Manager) ===
// Trang quản lý Production Batch (Manager): tạo mới, xem danh sách, chi tiết lô
// Create: khai báo batch_number, product_id, batch_size, shelf_life, nguyên liệu sử dụng (components)
// List: phân trang, lọc theo trạng thái, xem chi tiết modal
// Status: On Hold → In Progress → Complete / Cancelled
// API: createProductionBatch, fetchProductionBatches, updateProductionBatch, fetchMaterials, fetchInventoryLots