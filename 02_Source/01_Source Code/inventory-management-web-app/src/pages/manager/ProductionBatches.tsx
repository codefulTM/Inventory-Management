// === PRODUCTION_BATCHES (MANAGER) ===
// Trang quản lý lô sản xuất dành cho Manager
// Props/Input: pagination params, search term, status filter
// Features chính:
//   - CRUD lô sản xuất: tạo mới, xem chi tiết, cập nhật, xóa
//   - Quản lý Batch Components (thành phần nguyên liệu): thêm/xóa nguyên liệu vào lô
//   - Phân trang danh sách lô (page, totalPages, total)
//   - Lọc theo trạng thái: In Progress, Complete, On Hold, Cancelled
//   - Tìm kiếm theo batch_number hoặc product_id
//   - Hiển thị thông tin: mã lô, số lô, sản phẩm, ngày SX/hết hạn, trạng thái, kích thước
// API calls: fetchProductionBatches, fetchProductionBatchesByStatus, createProductionBatch, updateProductionBatch, deleteProductionBatch, fetchBatchComponents, createBatchComponent, deleteBatchComponent