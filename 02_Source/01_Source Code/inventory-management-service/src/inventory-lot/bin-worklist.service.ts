// === BIN_WORKLIST_SERVICE ===
// Service quản lý Bin Worklist - Quy trình đếm và kiểm kê tồn kho tại từng vị trí lưu kho (bin)
// Bin (Storage Location) là vị trí lưu kho cụ thể: Warehouse -> Zone -> Rack -> Bin
// Chức năng: Tạo/sửa/xóa Bin, lấy worklist bins kèm lô hàng, ghi nhận kết quả đếm, so sánh vs kỳ vọng, phát hiện bất thường (delta >= 50%), gửi email cho Manager khi flag, tự động tạo Warehouse Slip điều chỉnh, ghi Audit Log
// Methods chính: createBin, updateBin, deleteBin, getWorklist, getBinDetails, submitCounts, getBinCounts
// Dependencies: InventoryLotRepository, BinCountRecordRepository, MaterialRepository, WarehouseSlipService, AuditLogService, MailService, ConfigService, UserService, StorageLocationModel
// Database queries: storage_locations, inventory_lots, bin_count_records, materials, warehouse_slips, audit_logs