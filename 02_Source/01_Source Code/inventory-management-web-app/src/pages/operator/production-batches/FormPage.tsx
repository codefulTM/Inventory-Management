// === FormPage.tsx (Operator) ===
// Trang tạo/chỉnh sửa Production Batch (Operator)
// Create: auto-generate batch_id (BAT-n), chọn Product từ dropdown
// Edit: readonly batch_id & product_id, cập nhật status (In Progress/Complete/On Hold/Cancelled)
// Fields: batch_number, product_id, batch_size, unit_of_measure, manufacture_date, expiration_date, status
// API: fetchProductionBatch, createProductionBatch, updateProductionBatch, fetchMaterials