// === PRODUCTION_BATCH_DETAIL (OPERATOR) ===
// Trang xem chi tiết lô sản xuất dành cho Operator
// Props/Input: batchId từ URL params
// Features chính:
//   - Hiển thị thông tin chi tiết lô: mã lô, số lô, sản phẩm, kích thước, ngày SX/hết hạn, trạng thái
//   - Quản lý Batch Components (nguyên liệu): thêm/xóa nguyên liệu (chỉ khi On Hold)
//   - Ghi số lượng thực tế (Actual Qty) cho từng nguyên liệu (chỉ khi In Progress)
//   - Thay đổi trạng thái lô: On Hold → In Progress → Complete / On Hold / Resume
//   - Xóa lô (chỉ khi không ở trạng thái In Progress)
//   - Modal thêm nguyên liệu: chọn lot_id, planned_quantity, unit, addition_date, added_by
//   - Modal ghi actual_quantity: cập nhật số lượng thực tế đã sử dụng
// API calls: fetchProductionBatch, fetchBatchComponents, deleteProductionBatch, updateProductionBatch, createBatchComponent, deleteBatchComponent, updateBatchComponent