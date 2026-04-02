# [Operator][US25] Frontend Plan - Xác nhận nhập/xuất kho thực tế

## 1) Mục tiêu

Triển khai đầy đủ UI frontend cho US25 để không dừng ở mức API Guide, bao gồm:

- Danh sách công việc chờ xác nhận (worklist) theo đúng role.
- Luồng xác nhận phiếu nhập/xuất với blind count.
- Luồng từ chối phiếu với lý do bắt buộc.
- Hiển thị rõ kết quả đối chiếu expected/actual/variance.
- Trải nghiệm nhất quán giữa Operator và Manager.

## 2) Hiện trạng có thể tái sử dụng

Các thành phần US24 đã có và cần tận dụng:

- Trang Operator:
  - src/pages/operator/StockIn.tsx
  - src/pages/operator/StockOut.tsx
  - src/pages/operator/TransactionHistory.tsx
- Component:
  - src/components/operator/import-export-order/OrderHistoryTable.tsx
  - src/components/operator/import-export-order/OrderDetailDrawer.tsx
  - src/components/operator/import-export-order/OrderStatusBadge.tsx
- Service + type:
  - src/services/importExportOrderService.ts
  - src/types/importExportOrder.ts
- Navigation + route:
  - src/layouts/MainLayout.tsx
  - src/router/index.tsx
- Trang Manager hiện tại còn placeholder:
  - src/pages/manager/StockManagement.tsx

## 3) Khoảng trống cần bổ sung cho US25 UI

- Chưa có type dữ liệu confirmed_items/confirm_note/confirmed_by/confirmed_at.
- Chưa có API wrapper cho:
  - GET /import-export-orders/worklist
  - POST /import-export-orders/:id/confirm
  - POST /import-export-orders/:id/reject
- Chưa có màn hình xác nhận thực tế theo blind count.
- Chưa có modal từ chối phiếu.
- Chưa có khu vực Manager để theo dõi và xử lý worklist.

## 4) Thiết kế UX đề xuất

## 4.1 Operator

Mục tiêu UX: thao tác nhanh, ít chuyển trang, giảm sai số nhập liệu.

- Giữ trang src/pages/operator/TransactionHistory.tsx làm trung tâm.
- Bổ sung tab hoặc chế độ xem mới: Công việc cần xác nhận.
- Danh sách worklist mặc định lọc PendingConfirmation.
- Mỗi dòng có 3 action:
  - Xem chi tiết
  - Xác nhận
  - Từ chối
- Khi bấm Xác nhận:
  - Mở drawer xác nhận với bảng từng dòng item.
  - Mỗi dòng hiển thị expected_quantity (read-only), nhập actual_quantity.
  - Tính và hiển thị variance_quantity realtime.
- Khi bấm Từ chối:
  - Mở modal nhập reason (bắt buộc).

## 4.2 Manager

Mục tiêu UX: giám sát toàn bộ pending, can thiệp khi cần.

- Triển khai trang quản lý nhập/xuất tại route manager hiện có:
  - /manager/in-out (đang map vào StockManagement)
- Thay nội dung placeholder bằng giao diện worklist tương tự Operator nhưng không khóa theo created_by.
- Có bộ lọc nâng cao:
  - created_by
  - order_type
  - khoảng ngày
- Có thể dùng cùng component table/drawer với Operator để tránh trùng lặp.

## 5) Đề xuất thay đổi code theo lớp

## 5.1 Type layer

Cập nhật file src/types/importExportOrder.ts:

- Thêm type ConfirmImportExportOrderItem
- Thêm field mới vào ImportExportOrder:
  - confirmed_by?: string
  - confirmed_at?: string
  - confirm_note?: string
  - blind_count_required?: boolean
  - confirmed_items?: ConfirmImportExportOrderItem[]
- Thêm payload types:
  - ConfirmImportExportOrderPayload
  - RejectImportExportOrderPayload

## 5.2 API config

Cập nhật src/config/api.config.ts:

- IMPORT_EXPORT_ORDER_WORKLIST
- IMPORT_EXPORT_ORDER_CONFIRM(orderId)
- IMPORT_EXPORT_ORDER_REJECT(orderId)

## 5.3 Service layer

Cập nhật src/services/importExportOrderService.ts:

- fetchImportExportOrderWorklist(params)
- confirmImportExportOrder(orderId, payload)
- rejectImportExportOrder(orderId, payload)
- Chuẩn hóa map lỗi 409 cho idempotency và thiếu tồn kho.

## 5.4 UI components

Tạo mới trong src/components/operator/import-export-order:

- OrderWorklistTable.tsx
- ConfirmOrderDrawer.tsx
- RejectOrderModal.tsx
- VarianceBadge.tsx

Cập nhật component cũ:

- OrderDetailDrawer.tsx
  - Hiển thị block thông tin confirmed_by/confirmed_at/confirm_note nếu đã xử lý.
- OrderHistoryTable.tsx
  - Mở rộng action để vào flow confirm/reject khi ở tab worklist.

## 5.5 Pages

- Cập nhật src/pages/operator/TransactionHistory.tsx:
  - Thêm chế độ dữ liệu worklist (gọi endpoint worklist).
  - Gắn luồng confirm/reject.
- Cập nhật src/pages/manager/StockManagement.tsx:
  - Thay ComingSoon bằng màn hình worklist cho Manager.

## 6) Luồng dữ liệu chi tiết

## 6.1 Worklist load

- Khi mở tab Công việc cần xác nhận:
  - Gọi fetchImportExportOrderWorklist({ page, limit, order_type, from, to })
- Loading: skeleton rows.
- Empty: thông điệp chưa có phiếu pending.

## 6.2 Confirm flow

- Người dùng chọn phiếu PendingConfirmation.
- FE nạp sẵn expected_quantity từ order.items.
- Người dùng nhập actual_quantity cho từng dòng.
- FE tính variance tại client để hỗ trợ quyết định nhanh.
- Submit gọi confirmImportExportOrder.
- Thành công:
  - Đóng drawer.
  - Toast success.
  - Reload worklist + lịch sử.
- Thất bại:
  - 400: hiển thị lỗi input/đối soát.
  - 409: hiển thị phiếu đã xử lý hoặc không đủ tồn.

## 6.3 Reject flow

- Người dùng mở modal từ chối.
- Bắt buộc nhập reason.
- Submit gọi rejectImportExportOrder.
- Thành công:
  - Đóng modal.
  - Toast success.
  - Reload worklist + lịch sử.

## 7) Quy tắc validate phía frontend

- Confirm:
  - confirmed_items phải đủ số dòng như order.items.
  - actual_quantity phải > 0.
  - Không cho submit khi còn dòng thiếu actual_quantity.
- Reject:
  - reason không được rỗng.
  - reason trim tối đa 255 ký tự.
- Chặn double-submit khi đang gọi API.

## 8) Mapping lỗi sang UX

- 400: Dữ liệu không hợp lệ, vui lòng kiểm tra lại.
- 403: Bạn không có quyền thực hiện thao tác này.
- 404: Phiếu không tồn tại hoặc đã bị xóa.
- 409: Phiếu đã được xử lý hoặc tồn kho không đủ.
- 500+: Hệ thống đang bận, vui lòng thử lại.

## 9) Kế hoạch triển khai theo phase (frontend)

## Phase FE-6: Mở rộng contract US25

- Cập nhật type + endpoint + service cho worklist/confirm/reject.

Deliverable:

- src/types/importExportOrder.ts
- src/config/api.config.ts
- src/services/importExportOrderService.ts

## Phase FE-7: UI worklist cho Operator

- Mở rộng TransactionHistory thành 2 mode:
  - Lịch sử
  - Công việc cần xác nhận
- Thêm bảng worklist và action.

Deliverable:

- src/pages/operator/TransactionHistory.tsx
- src/components/operator/import-export-order/OrderWorklistTable.tsx

## Phase FE-8: Confirm/Reject interaction

- Tạo drawer xác nhận blind count.
- Tạo modal từ chối.
- Tích hợp toast + reload dữ liệu.

Deliverable:

- src/components/operator/import-export-order/ConfirmOrderDrawer.tsx
- src/components/operator/import-export-order/RejectOrderModal.tsx
- src/components/operator/import-export-order/VarianceBadge.tsx

## Phase FE-9: Manager screen

- Triển khai UI tại /manager/in-out từ trang placeholder.
- Cho Manager xem toàn bộ pending và xử lý giống Operator.

Deliverable:

- src/pages/manager/StockManagement.tsx
- Cập nhật điều hướng tại src/layouts/MainLayout.tsx (nếu cần đổi label/menu)

## Phase FE-10: Hardening + test + handoff

- Test tay theo checklist smoke US25.
- Kiểm thử role Operator/Manager.
- Rà lại empty/loading/error.
- Chốt tài liệu handoff.

Deliverable:

- frontend/US25_OPERATOR_MANAGER_SMOKE_CHECKLIST.md
- frontend/US25_IMPORT_EXPORT_CONFIRM_API_GUIDE.md

## 10) Test plan (tối thiểu)

- Operator:
  - Thấy đúng worklist pending của mình.
  - Confirm thành công 1 phiếu inbound.
  - Reject thành công 1 phiếu outbound.
- Manager:
  - Thấy toàn bộ worklist pending.
  - Xử lý confirm/reject được.
- Negative:
  - 409 khi xử lý lại phiếu đã confirmed/rejected.
  - 400 khi submit actual_quantity không hợp lệ.

## 11) Rủi ro và phương án giảm thiểu

- Rủi ro sai dữ liệu khi nhập actual hàng loạt:
  - Giảm thiểu: highlight variance theo màu, bắt buộc review trước submit.
- Rủi ro mất đồng bộ khi nhiều người xử lý cùng lúc:
  - Giảm thiểu: luôn reload chi tiết trước submit và xử lý rõ lỗi 409.
- Rủi ro trùng lặp UI giữa Operator/Manager:
  - Giảm thiểu: tách component dùng chung, chỉ khác policy và route.

## 12) Definition of Done cho UI US25

- Có màn hình worklist cho Operator và Manager.
- Có drawer xác nhận blind count với variance realtime.
- Có modal từ chối với reason bắt buộc.
- Map lỗi backend đầy đủ 400/403/404/409/500.
- Smoke checklist pass cho cả 2 role.
- Không phá vỡ các luồng US24 đã hoàn thành.
