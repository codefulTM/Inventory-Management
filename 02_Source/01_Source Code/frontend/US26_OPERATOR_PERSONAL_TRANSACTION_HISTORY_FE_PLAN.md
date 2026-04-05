# [Operator][US26] Frontend Plan - Tra cứu lịch sử giao dịch cá nhân

## 1) Mục tiêu

Triển khai màn hình tra cứu lịch sử giao dịch cá nhân cho Operator, bám đúng contract backend US26 đã bàn giao.

Kết quả mong đợi:

- Operator xem được danh sách giao dịch của chính mình.
- Tìm kiếm nhanh theo mã phiếu hoặc mã hàng.
- Xem chi tiết read-only từng giao dịch.
- Trải nghiệm mượt, có phân trạng thái loading/empty/error rõ ràng.

## 2) Hiện trạng có thể tái sử dụng

Các điểm tích hợp sẵn trong frontend:

- Trang operator có sẵn lịch sử nghiệp vụ nhập/xuất:
  - src/pages/operator/TransactionHistory.tsx
- Service transactions đã có nền tảng gọi /transactions:
  - src/services/inventoryTransactionService.ts
- Router đã có khung route Operator/Manager:
  - src/router/index.tsx

Khoảng trống hiện tại cho US26:

- Chưa có service wrapper cho /transactions/my-history và /transactions/my-history/:id.
- Chưa có query model cho keyword + transaction_type + khoảng ngày + paging theo contract US26.
- Chưa có UI list/detail chuyên cho lịch sử cá nhân transaction.

## 3) Thiết kế UX đề xuất

## 3.1 Bố cục trang

Đề xuất route: /operator/inventory-transactions

Khu vực chính:

- Thanh lọc:
  - keyword
  - transaction_type
  - from/to
- Bảng danh sách:
  - transaction_id
  - transaction_date
  - transaction_type
  - quantity + unit
  - reference_number
  - lot_id
  - material_id (nếu có)
- Panel chi tiết (drawer hoặc side panel):
  - toàn bộ trường read-only

## 3.2 Trạng thái UX bắt buộc

- Loading:
  - Skeleton cho table
  - Spinner cho detail
- Empty:
  - Không có giao dịch phù hợp bộ lọc
- Error:
  - Banner lỗi khu vực list
  - Toast cho lỗi thao tác detail

## 4) Kế hoạch triển khai theo phase FE

## FE-1: Contract và type

Task:

- Tạo type MyHistoryQuery, MyHistoryItem, MyHistoryListResponse.
- Chuẩn hóa enum transaction_type dùng chung.

Deliverable:

- src/types/inventoryTransaction.ts (hoặc file type mới cho US26)

## FE-2: Service layer

Task:

- Thêm hàm fetchMyHistory(params).
- Thêm hàm fetchMyHistoryDetail(transactionId).
- Chuẩn hóa error class để map status code.

Deliverable:

- src/services/inventoryTransactionService.ts

## FE-3: Màn hình danh sách

Task:

- Tạo page mới hoặc bổ sung tab trong trang Operator hiện hữu.
- Tích hợp filter + paging + debounce keyword.
- Đồng bộ state URL query (khuyến nghị) để chia sẻ link dễ dàng.

Deliverable:

- src/pages/operator/InventoryTransactionListOperator.tsx hoặc page mới cho US26

## FE-4: Chi tiết read-only

Task:

- Thêm panel chi tiết khi chọn 1 dòng.
- Gọi GET /transactions/my-history/:id.
- Map lỗi 403/404 đúng thông điệp.

Deliverable:

- Component detail drawer/panel cho US26

## FE-5: Hardening + handoff

Task:

- Validate date range trước khi gọi API.
- Chặn bắn request trùng khi đang loading.
- Hoàn tất smoke checklist và tài liệu handoff.

Deliverable:

- frontend/US26_OPERATOR_PERSONAL_TRANSACTION_HISTORY_SMOKE_CHECKLIST.md
- frontend/US26_OPERATOR_PERSONAL_TRANSACTION_HISTORY_API_GUIDE.md

## 5) Quy tắc validate phía frontend

- page >= 1
- 1 <= limit <= 100
- from <= to
- keyword sau trim có độ dài <= 100
- transaction_id detail phải đúng định dạng UUID trước khi gọi API

## 6) Mapping lỗi backend sang UX

- 400: Dữ liệu lọc không hợp lệ, vui lòng kiểm tra lại.
- 403: Bạn không có quyền xem giao dịch này.
- 404: Không tìm thấy giao dịch.
- 500+: Hệ thống đang bận, vui lòng thử lại sau.

## 7) Test plan frontend

- Positive:
  - Load list mặc định thành công
  - Filter theo transaction_type thành công
  - Search theo reference_number thành công
  - Search theo material_id thành công
  - Mở detail thành công
- Negative:
  - from > to -> không gọi API, hiển thị lỗi
  - keyword quá dài -> chặn submit
  - detail 403 -> hiển thị đúng thông điệp
  - detail 404 -> hiển thị đúng thông điệp

## 8) Definition of Done cho frontend US26

- Có màn hình lịch sử giao dịch cá nhân cho Operator.
- Hỗ trợ đầy đủ filter + keyword + paging theo contract.
- Xem chi tiết read-only hoạt động với map lỗi đúng.
- Smoke checklist pass.
- Build frontend pass, không phát sinh lỗi TypeScript mới.

## 9) Đề xuất thứ tự triển khai thực tế (2 ngày)

Ngày 1:

- FE-1, FE-2, FE-3

Ngày 2:

- FE-4, FE-5, smoke test + fix nhỏ + handoff
