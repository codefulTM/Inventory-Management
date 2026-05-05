// === IMPORT_EXPORT_ORDER_SERVICE ===
// Service quản lý phiếu nhập/xuất kho (Import/Export Order)
// Quản lý full lifecycle: tạo, xác nhận, từ chối, cập nhật phiếu, đính kèm tài liệu, resolve mã quét (lot_id/material_id/part_number/manufacturer_lot)
// Inbound: Tạo lô tạm (provisional), tăng số lượng tồn; Outbound: Giảm số lượng tồn, tự động set DEPLETED khi hết
// Chức năng: Tạo/cập nhật/từ chối phiếu, confirm với blind count validation, xử lý inventory transactions (Receipt/Usage), validate warehouse/location
// Methods chính: create, getAll, getWorklist, getOne, confirm, reject, update, addAttachment, resolveScanCode, getMaterialOptions, getInventoryLotOptions, getWarehouseOptions, getStorageLocationOptions
// Dependencies: ImportExportOrderRepository, RedisIdService
// Database queries: import_export_orders, inventory_lots, materials, warehouses, storage_locations, inventory_transactions