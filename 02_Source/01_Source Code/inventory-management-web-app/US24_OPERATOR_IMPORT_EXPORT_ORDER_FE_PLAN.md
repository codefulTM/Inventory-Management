# [Operator][US24] Frontend Plan - Import/Export Order

## 1) Mục tiêu

Xây dựng giao diện frontend cho module import-export-order (US24) để Operator có thể:

- Tạo phiếu nhập kho (Inbound).
- Tạo phiếu xuất kho (Outbound).
- Quét barcode để auto-fill vật tư/lô.
- Đính kèm chứng từ (ảnh/PDF) lưu local disk qua backend.
- Xem lịch sử phiếu do chính mình tạo, xem chi tiết và chỉnh sửa khi còn PendingConfirmation.

Phạm vi trang chỉ thuộc màn hình Operator.

## 2) API contract cho frontend

Luồng gọi API sử dụng apiClient hiện tại của dự án.

- Base URL đang theo cấu hình môi trường tại src/services/apiClient.ts.
- Endpoint path bên dưới là path tương đối so với base URL.

### 2.1 POST /import-export-orders

Mục đích: tạo phiếu nhập/xuất.

Request body:

- order_type: "Inbound" | "Outbound"
- warehouse_id: string
- reason?: string
- reference_number?: string
- items: array (bat buoc >= 1 phan tu)
- attachments?: array (co the bo qua luc tao)

Mỗi item gồm:

- material_id: string
- lot_id?: string
- quantity: number (bat buoc > 0)
- unit_of_measure: string
- expected_location?: string

Response thành công:

- Trả document phiếu vừa tạo.
- status luôn là PendingConfirmation theo flow US24.

Lỗi thường gặp:

- 400: dữ liệu không hợp lệ (quantity <= 0, items rỗng, sai enum).
- 403: role không hợp lệ.

### 2.2 GET /import-export-orders

Mục đích: lấy danh sách phiếu.

Query params hỗ trợ:

- status?: PendingConfirmation | Confirmed | Rejected
- order_type?: Inbound | Outbound
- created_by?: string
- from?: ISO date
- to?: ISO date
- page?: number (default 1)
- limit?: number (default 20, max 100)

Response thành công:

- items: ImportExportOrder[]
- total: number
- page: number
- limit: number

Ghi chú phân quyền:

- Operator chỉ nhận dữ liệu do chính mình tạo (backend đã tự áp policy).
- Manager có thể thấy toàn bộ.

### 2.3 GET /import-export-orders/:id

Mục đích: lấy chi tiết phiếu.

Response thành công:

- Trả full document phiếu (items, attachments, metadata thời gian).

Lỗi thường gặp:

- 404: không tồn tại.
- 403: Operator truy cập phiếu của người khác.

### 2.4 PATCH /import-export-orders/:id

Mục đích: cập nhật nội dung phiếu khi còn PendingConfirmation.

Request body (partial):

- order_type?
- warehouse_id?
- reason?
- reference_number?
- items?
- attachments?

Ràng buộc nghiệp vụ:

- Không cho đổi status trong US24.
- Chỉ phiếu PendingConfirmation mới sửa được.

Lỗi thường gặp:

- 400: cố đổi status hoặc phiếu không còn pending.
- 403: không đủ quyền.
- 404: không tồn tại.

### 2.5 POST /import-export-orders/:id/attachments

Mục đích: upload chứng từ cho phiếu.

Content-Type:

- multipart/form-data

Form-data:

- file: bắt buộc
- source?: "upload" | "camera" (mặc định upload)

Giới hạn file:

- MIME: image/jpeg, image/png, application/pdf
- Size: tối đa 5MB

Response thành công:

- Trả document phiếu sau khi push attachment vào mảng attachments.

Lỗi thường gặp:

- 400: thiếu file, sai MIME, file quá lớn, hoặc phiếu không còn pending.
- 403: không đủ quyền.

### 2.6 POST /import-export-orders/scan/resolve

Mục đích: resolve mã quét để auto-fill item.

Request body:

- scan_code: string

Thứ tự resolve backend đã chốt:

1. lot_id
2. manufacturer_lot
3. material_id
4. part_number

Response thành công:

- scan_code: string
- resolved: boolean
- matched_by: lot_id | manufacturer_lot | material_id | part_number | null
- item: object | null
- lot: object | null
- warnings: string[]
- message?: string

Ghi chú UI:

- resolved=false: hiển thị thông báo không tìm thấy, giữ người dùng trên form để quét tiếp.
- warnings có dữ liệu: hiển thị badge cảnh báo trên dòng item.

## 3) Pages sẽ xây dựng (Operator)

Tận dụng route có sẵn trong router hiện tại:

- /operator/stock-in
- /operator/stock-out
- /operator/history

File page tương ứng cần triển khai:

- src/pages/operator/StockIn.tsx
- src/pages/operator/StockOut.tsx
- src/pages/operator/TransactionHistory.tsx

Mô tả chức năng theo page:

- StockIn: tạo phiếu Inbound, quét barcode, thêm/xóa dòng item, upload chứng từ trước khi submit.
- StockOut: tạo phiếu Outbound, quét barcode, thêm/xóa dòng item, upload chứng từ trước khi submit.
- TransactionHistory: danh sách phiếu của Operator, filter, phân trang, xem chi tiết, chỉnh sửa phiếu pending.

## 4) Quy ước tách component

Nếu tách thành component, đặt trong thư mục:

- src/components/operator

Đề xuất cấu trúc:

- src/components/operator/import-export-order/OrderForm.tsx
- src/components/operator/import-export-order/OrderItemTable.tsx
- src/components/operator/import-export-order/ScanInput.tsx
- src/components/operator/import-export-order/AttachmentUploader.tsx
- src/components/operator/import-export-order/OrderStatusBadge.tsx
- src/components/operator/import-export-order/OrderHistoryTable.tsx
- src/components/operator/import-export-order/OrderDetailDrawer.tsx

## 5) Service + Types phía frontend

Đề xuất thêm các file:

- src/services/importExportOrderService.ts
- src/types/importExportOrder.ts

Nội dung service:

- createImportExportOrder(payload)
- fetchImportExportOrders(params)
- fetchImportExportOrderDetail(orderId)
- updateImportExportOrder(orderId, payload)
- uploadImportExportOrderAttachment(orderId, formData)
- resolveImportExportOrderScan(scan_code)

## 6) Trạng thái triển khai

- FE-1: DONE
- FE-2: DONE
- FE-3: DONE
- FE-4: DONE
- FE-5: DONE

Các hạng mục đã hoàn tất trong FE-1:

- Đã tạo src/types/importExportOrder.ts.
- Đã tạo src/services/importExportOrderService.ts.
- Đã bổ sung endpoint config cho import-export-order trong src/config/api.config.ts.

Các hạng mục đã hoàn tất trong FE-2:

- Đã thay thế page placeholder tại src/pages/operator/StockIn.tsx bằng form tạo phiếu Inbound.
- Đã thay thế page placeholder tại src/pages/operator/StockOut.tsx bằng form tạo phiếu Outbound.
- Đã tạo component dùng chung trong src/components/operator/import-export-order:
  - OrderForm.tsx
  - OrderItemTable.tsx
- Đã tích hợp validate client-side:
  - quantity phải là số nguyên dương
  - items phải có ít nhất 1 dòng
  - warehouse_id và các trường bắt buộc trên item không được trống

Các hạng mục đã hoàn tất trong FE-3:

- Đã tạo ScanInput.tsx và tích hợp tra mã qua API POST /import-export-orders/scan/resolve.
- Đã tự động auto-fill material_id, lot_id, unit_of_measure, expected_location vào dòng item được chọn.
- Đã tạo AttachmentUploader.tsx và tích hợp chọn file nhiều tệp, validate MIME/size ở client.
- Đã tích hợp upload chứng từ qua API POST /import-export-orders/:id/attachments sau khi tạo phiếu thành công.
- Đã hiển thị danh sách file chờ tải và file đã lưu thành công từ backend.
- Đã cập nhật realtime nhãn "Ghi vào dòng" sau khi scan thành công (hiển thị đúng material_id vừa điền).
- Đã xử lý tự động ẩn lỗi file > 5MB khi lần chọn mới hợp lệ.
- Đã thay success line bằng dialog xác nhận khi tạo phiếu thành công.

Các hạng mục đã hoàn tất trong FE-4:

- Đã thay placeholder tại src/pages/operator/TransactionHistory.tsx bằng trang lịch sử thực tế.
- Đã tạo bộ lọc theo trạng thái, loại phiếu, khoảng ngày và hỗ trợ phân trang dữ liệu.
- Đã tạo src/components/operator/import-export-order/OrderHistoryTable.tsx để hiển thị danh sách phiếu và action.
- Đã tạo src/components/operator/import-export-order/OrderStatusBadge.tsx để hiển thị trạng thái chuẩn hóa theo màu.
- Đã tạo src/components/operator/import-export-order/OrderDetailDrawer.tsx để xem chi tiết phiếu.
- Đã tích hợp chỉnh sửa phiếu PendingConfirmation (warehouse, loại phiếu, lý do, tham chiếu, danh sách item) qua API PATCH /import-export-orders/:id.

Các hạng mục đã hoàn tất trong FE-5:

- Đã cải thiện trạng thái loading cho bảng lịch sử bằng skeleton rows trong OrderHistoryTable.tsx.
- Đã bổ sung toast thông báo thành công/thất bại cho luồng xem chi tiết và cập nhật phiếu tại TransactionHistory.tsx.
- Đã chuẩn hóa mapping lỗi backend theo mã HTTP (400/403/404/500+) cho UX thông báo.
- Đã bổ sung lớp lỗi typed ImportExportOrderApiError trong importExportOrderService.ts để giữ statusCode khi xử lý lỗi UI.
- Đã tạo checklist test tay E2E cho US24 tại file frontend/US24_OPERATOR_IMPORT_EXPORT_ORDER_FE5_QA_CHECKLIST.md.

## 7) Kế hoạch triển khai theo phase (frontend)

### Phase FE-1: Khởi tạo contract

- Tạo type/interface cho request/response.
- Tạo importExportOrderService bọc API.
- Viết helper normalize dữ liệu response nếu cần.

Deliverable:

- src/types/importExportOrder.ts
- src/services/importExportOrderService.ts

### Phase FE-2: Xây form tạo phiếu

- Triển khai UI StockIn và StockOut.
- Dùng component chung OrderForm cho 2 page để giảm trùng lặp.
- Validate client-side: quantity > 0, items >= 1, order_type đúng theo page.

Deliverable:

- src/pages/operator/StockIn.tsx
- src/pages/operator/StockOut.tsx
- Nhóm component trong src/components/operator/import-export-order

### Phase FE-3: Scan-to-fill + upload chứng từ

- Tích hợp POST /scan/resolve vào ScanInput.
- Auto-fill material_id/lot_id/uom/location cho dòng item.
- Tích hợp upload multipart qua endpoint attachments.
- Hiển thị danh sách file đã đính kèm.

Deliverable:

- ScanInput.tsx
- AttachmentUploader.tsx
- Cập nhật OrderForm.tsx

### Phase FE-4: Lịch sử + chi tiết + chỉnh sửa

- Triển khai TransactionHistory với filter + paging.
- Xem detail phiếu trong drawer/modal.
- Cho phép chỉnh sửa phiếu PendingConfirmation.

Deliverable:

- src/pages/operator/TransactionHistory.tsx
- OrderHistoryTable.tsx
- OrderDetailDrawer.tsx

### Phase FE-5: Hoàn thiện UX + kiểm thử

- Trạng thái loading/error/empty.
- Toast thông báo thành công/thất bại theo mã lỗi backend.
- Test tay end-to-end theo 3 luồng: tạo nhập, tạo xuất, tra cứu lịch sử.

## 8) Mapping lỗi backend sang UX

- 400: hiển thị message dưới form hoặc toast warning theo message backend.
- 403: hiển thị "Bạn không có quyền thực hiện thao tác này".
- 404: hiển thị "Phiếu không tồn tại hoặc đã bị xóa".
- 500: hiển thị fallback "Hệ thống đang bận, vui lòng thử lại".

## 9) Definition of Done cho frontend US24

- Operator tạo được phiếu nhập và phiếu xuất.
- Quét barcode auto-fill đúng theo thứ tự resolve đã chốt.
- Upload chứng từ ảnh/PDF thành công, hiển thị được danh sách file.
- Operator xem được lịch sử phiếu của chính mình.
- Chỉnh sửa được phiếu khi trạng thái PendingConfirmation.
- Không tạo mới route ngoài phạm vi màn hình Operator.
- Reusable components nằm dưới src/components/operator.
