# [Operator][US26] - Kế hoạch phát triển backend tra cứu lịch sử giao dịch cá nhân

## 0) Cập nhật trạng thái triển khai (02/04/2026)

Trạng thái thực hiện thực tế:

- Phase 1 (API contract + RBAC): DONE
- Phase 2 (Search theo mã phiếu / mã hàng): DONE
- Phase 3 (Detail read-only + ownership guard 403/404): DONE
- Phase 4 (Unit test + e2e + benchmark script): DONE
- Phase 5 (Handoff API + smoke checklist + FE plan): DONE

Tài liệu handoff frontend đã bổ sung:

- frontend/US26_OPERATOR_PERSONAL_TRANSACTION_HISTORY_API_GUIDE.md
- frontend/US26_OPERATOR_PERSONAL_TRANSACTION_HISTORY_SMOKE_CHECKLIST.md
- frontend/US26_OPERATOR_PERSONAL_TRANSACTION_HISTORY_FE_PLAN.md

## 1) Cơ sở yêu cầu đã review lại từ 01_Documents

Nguồn: 01_Documents/04_Product Backlog.md (mục Operator, US24-US28)

US26 (P1):

- Operator muốn tra cứu lịch sử giao dịch cá nhân để đối soát công việc.
- Acceptance Criteria:
  - Mặc định chỉ hiển thị giao dịch do chính mình thực hiện.
  - Tìm kiếm nhanh theo Mã phiếu hoặc Mã hàng trong < 2 giây.
  - Chỉ được xem chi tiết (Read-only), không được sửa dữ liệu đã chốt.

## 2) Review nhanh hiện trạng liên quan (US25 + module transaction)

### 2.1 Kết quả review hiện trạng US25

- Màn hình Operator và Manager cho luồng worklist/confirm/reject đã ổn định cơ bản.
- Diagnostics frontend cho 2 màn hình chính không có lỗi.
- Build frontend pass.
- Backend unit test cho import-export-order service pass.

Nhận xét:

- Đã đạt mức "hoàn thành cơ bản" cho [Operator][US25] như user xác nhận.

### 2.2 Hiện trạng backend module inventory-transaction

- Route hiện có: /transactions
- Controller hiện mở GET/POST/PATCH/DELETE cho role Manager + QC, chưa có route riêng cho Operator tra cứu lịch sử cá nhân.
- Repository đã có filter lot_id, transaction_type, search, from/to, paging.
- Schema transaction có các field cần thiết: transaction_id, lot_id, transaction_type, quantity, transaction_date, reference_number, performed_by.

Khoảng trống so với US26:

- Chưa có endpoint read-only theo người đăng nhập (performed_by = actor).
- Chưa có tìm kiếm trực tiếp theo "Mã hàng" (material_id) ở cấp API transaction.
- Chưa có response profile tối ưu cho Operator đối soát nhanh.

## 3) Mục tiêu backend cho US26

Hoàn thành backend để Operator có thể:

- Xem danh sách lịch sử giao dịch cá nhân (default scope theo actor).
- Tìm nhanh theo mã phiếu (reference_number / transaction_id) hoặc mã hàng (material_id).
- Xem chi tiết read-only 1 giao dịch.
- Không có bất kỳ endpoint update/delete nào cho luồng US26.

## 4) Thiết kế đề xuất

## 4.1 API đề xuất cho US26

Base route: /transactions

1. GET /transactions/my-history

- Role: Operator (có thể mở rộng Manager/QC nếu cần, nhưng US26 ưu tiên Operator).
- Query params:
  - page, limit
  - from, to
  - transaction_type
  - keyword (tìm theo transaction_id, reference_number, lot_id, material_id)
- Rule bắt buộc:
  - Không nhận performed_by từ client.
  - Hệ thống tự động ép filter performed_by = requester.actor.

2. GET /transactions/my-history/:id

- Role: Operator
- Rule:
  - Chỉ trả kết quả nếu transaction.performed_by = requester.actor.
  - Nếu không thuộc actor -> 403.
  - Nếu không tồn tại -> 404.

## 4.2 Response shape để frontend tích hợp

Danh sách my-history trả về:

- transaction_id
- transaction_type
- quantity
- unit_of_measure
- transaction_date
- reference_number
- lot_id
- material_id (resolve qua inventory_lots)
- performed_by

Chi tiết my-history/:id trả về đầy đủ hơn:

- Toàn bộ field transaction
- Snapshot thông tin lot/material (nếu lookup thấy)

## 4.3 Tìm kiếm theo mã phiếu / mã hàng (< 2 giây)

Đề xuất kỹ thuật:

- Bước 1: match theo performed_by + khoảng ngày + transaction_type sớm nhất có thể.
- Bước 2: nếu có keyword, áp dụng một trong hai hướng:
  - Hướng A (ưu tiên ngắn hạn): aggregation + lookup inventory_lots để lọc material_id.
  - Hướng B (tối ưu trung hạn): denormalize material_id vào inventory_transactions khi tạo giao dịch mới.

Để đảm bảo hiệu năng:

- Bổ sung index cho inventory_transactions:
  - { performed_by: 1, transaction_date: -1 }
  - { performed_by: 1, reference_number: 1 }
  - { performed_by: 1, lot_id: 1 }
- inventory_lots đã có index material_id (có thể tái sử dụng cho lookup).

## 4.4 Bảo mật và read-only policy

- Operator chỉ có 2 endpoint GET mới của US26.
- Không cho Operator dùng POST/PATCH/DELETE của /transactions.
- Route chi tiết bắt buộc check ownership transaction theo performed_by.
- Sanitize query input (keyword length, page/limit upper bound) để tránh query tốn tài nguyên.

## 5) Kế hoạch implement theo phase

## Phase 1 - API contract + RBAC

Task:

- Tạo DTO query cho my-history.
- Thêm endpoint GET /transactions/my-history.
- Thêm endpoint GET /transactions/my-history/:id.
- Inject requester từ auth context, ép scope theo actor.

Deliverable:

- Operator gọi được API read-only lịch sử cá nhân.

## Phase 2 - Search theo mã phiếu / mã hàng

Task:

- Mở rộng repository query với keyword.
- Hỗ trợ tìm keyword theo:
  - transaction_id
  - reference_number
  - lot_id
  - material_id (lookup inventory_lots)
- Add/verify index phục vụ performed_by + time + reference.

Deliverable:

- Tìm theo mã phiếu/mã hàng đạt mục tiêu thời gian theo acceptance US26 (dataset thực tế).

## Phase 3 - Chi tiết read-only và ownership guard

Task:

- Implement get detail theo id cho actor.
- Trả 403 nếu transaction không thuộc actor.
- Chuẩn hóa lỗi 404/403 cho frontend map toast.

Deliverable:

- Detail read-only đúng policy, không lộ dữ liệu người khác.

## Phase 4 - Test + benchmark

Task:

- Unit test service/repository:
  - default chỉ lấy performed_by của actor.
  - keyword reference_number pass.
  - keyword material_id pass.
  - ownership detail 403.
- E2E test route my-history cho role Operator.
- Benchmark query có keyword và không keyword trên seed data lớn hơn mặc định.

Deliverable:

- Test pass.
- Có số liệu benchmark để xác nhận < 2 giây trong điều kiện dữ liệu mục tiêu.

## Phase 5 - Handoff API cho frontend

Task:

- Tạo/bổ sung tài liệu API cho FE US26 (query/response/error map).
- Chốt checklist smoke Operator cho luồng lịch sử cá nhân.

Deliverable:

- Frontend có contract rõ ràng để triển khai màn hình US26.

## 6) Danh sách file backend dự kiến thay đổi

Dự kiến cập nhật:

- src/inventory-transaction/inventory-transaction.controller.ts
- src/inventory-transaction/inventory-transaction.service.ts
- src/inventory-transaction/inventory-transaction.repository.ts
- src/inventory-transaction/dto/transaction-filters.dto.ts (hoặc tạo dto mới us26)
- src/inventory-transaction/\*.spec.ts
- test/_us26_.e2e-spec.ts

Nếu chọn hướng denormalize material_id:

- src/schemas/inventory-transaction.schema.ts
- Các điểm tạo giao dịch (inventory-transaction service + import-export-order service)

## 7) Rủi ro và hướng giảm thiểu

- Rủi ro hiệu năng khi search theo material_id bằng lookup:
  - Giảm thiểu: match performed_by trước, pagination sớm, thêm index phù hợp.
- Rủi ro dữ liệu cũ thiếu tính nhất quán performed_by:
  - Giảm thiểu: script normalize giá trị performed_by trước UAT.
- Rủi ro lộ dữ liệu người dùng khác:
  - Giảm thiểu: ownership guard bắt buộc ở cả list và detail.

## 8) Definition of Done cho US26 Backend

US26 backend được xem là hoàn thành khi:

- Có endpoint my-history cho Operator, mặc định chỉ scope dữ liệu cá nhân.
- Có tìm kiếm theo mã phiếu và mã hàng.
- Có endpoint detail read-only + ownership guard.
- Không mở quyền sửa/xóa transaction cho Operator trong luồng US26.
- Unit + e2e test pass.
- Có tài liệu API handoff cho frontend.
