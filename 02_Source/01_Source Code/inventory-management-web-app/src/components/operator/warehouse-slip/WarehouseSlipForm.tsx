// === WarehouseSlipForm.tsx ===
// Form tạo phiếu nhập/xuất kho (Warehouse Slip) dành cho Operator
// Methods/Features: Chọn loại phiếu (IN/OUT), chọn kho (có phân trang/tìm kiếm), thêm nhiều dòng hàng (mỗi dòng gồm: chọn lô, hiển thị nguyên liệu, số lượng, đơn giá, đơn vị), validate nguyên liệu phải được duyệt (approved) trước khi tạo phiếu, upload file đính kèm
// Components: AttachmentUploader, SelectMenu, react-hook-form (useForm, useFieldArray, Controller)
// API/Dependencies: createWarehouseSlip, fetchInventoryLotOptions, materialService, fetchWarehouses