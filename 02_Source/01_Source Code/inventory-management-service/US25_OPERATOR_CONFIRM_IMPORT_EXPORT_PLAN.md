# [Operator][US25] - Kế hoạch triển khai xác nhận nhập/xuất kho thực tế (Backend)

## 1) Cơ sở yêu cầu đã review từ 01_Documents

- 01_Documents/04_Product Backlog.md:
  - US25 (P0): Operator xác nhận nhập/xuất kho thực tế để cập nhật tồn kho theo thời gian thực.
  - Acceptance Criteria:
    - Bắt buộc nhập số lượng thực tế kiểm đếm (Blind count) để đối chiếu.
    - Hệ thống cập nhật tồn kho ngay khi nhấn Xác nhận.
    - Có danh sách công việc (Worklist).
- 01_Documents/02_Domain Model.md:
  - Mọi thay đổi số lượng phải sinh InventoryTransaction để đảm bảo truy vết.
- 01_Documents/Workflow.md + 01_Documents/05_Architecture.md:
  - Đồng bộ biến động tồn kho, truy vết theo lot, và lưu audit log.

## 2) Hiện trạng backend liên quan (US24)

- Đã có module import-export-order với các endpoint:
  - POST /import-export-orders
  - GET /import-export-orders
  - GET /import-export-orders/:id
  - PATCH /import-export-orders/:id
  - POST /import-export-orders/:id/attachments
  - POST /import-export-orders/scan/resolve
- Đã có status trên order: PendingConfirmation / Confirmed / Rejected.
- Chưa có endpoint xác nhận nghiệp vụ US25 (confirm thực tế + cập nhật tồn kho realtime).
- Chưa có Worklist phù hợp với mô hình mỗi vai trò chỉ có 1 tài khoản.
- InventoryTransaction module đã có, nhưng chưa được gọi từ luồng confirm của import_export_orders.

## 3) Mục tiêu backend cho US25

Hoàn thành luồng xác nhận nhập/xuất kho thực tế cho Operator, đảm bảo:

- Có số lượng thực tế (actual quantity) để đối chiếu với số lượng dự kiến trên phiếu.
- Cập nhật tồn kho ngay lập tức sau khi xác nhận thành công.
- Sinh InventoryTransactions đầy đủ cho mỗi dòng hàng trên phiếu.
- Hỗ trợ Worklist theo tài khoản vai trò hiện có (đặc biệt là admin_operator).

## 4) Thiết kế đề xuất

## 4.1 Mở rộng dữ liệu import_export_orders

Mở rộng schema hiện tại (giữ nguyên tương thích ngược):

- confirmation:
  - confirmed_by: string
  - confirmed_at: date
  - confirm_note: string?
  - blind_count_required: boolean (default true)
- thông tin đối chiếu theo dòng:
  - confirmed_items: array
    - material_id: string
    - lot_id: string?
    - expected_quantity: number
    - actual_quantity: number
    - variance_quantity: number (actual - expected)
    - unit_of_measure: string

Chỉ mục đề xuất bổ sung:

- { created_by: 1, status: 1, created_date: -1 }
- { status: 1, modified_date: -1 }

## 4.2 API backend đề xuất cho US25

Base route: /import-export-orders

- GET /import-export-orders/worklist
  - Mục đích: lấy danh sách pending cho tài khoản đang đăng nhập.
  - Query: page, limit, from, to, order_type.
  - Rule:
    - Operator: chỉ thấy created_by = actor.
    - Manager: xem toàn bộ.

- POST /import-export-orders/:id/confirm
  - Mục đích: xác nhận thực tế và cập nhật tồn kho realtime.
  - Quyền: Operator + Manager.
  - Body:
    - confirmed_items[] với actual_quantity > 0
    - confirm_note?
  - Kết quả:
    - status -> Confirmed
    - lưu confirmed_items
    - cập nhật lot quantity
    - sinh inventory_transactions

- POST /import-export-orders/:id/reject
  - Mục đích: từ chối phiếu nếu không khớp thực tế.
  - Quyền: Operator + Manager.
  - Body: reason.
  - Kết quả: status -> Rejected, không cập nhật tồn kho.

## 4.3 Quy tắc nghiệp vụ cần khóa chặt

- Chỉ cho xử lý khi order.status = PendingConfirmation.
- Blind count bắt buộc:
  - confirmed_items phải đầy đủ theo dòng cần xác nhận.
  - actual_quantity > 0.
- Outbound confirm:
  - Kiểm tra tồn kho tại thời điểm xác nhận.
  - Nếu thiếu tồn -> trả 409 Conflict, không cập nhật gì.
- Inbound confirm:
  - Cộng tồn theo actual_quantity.
  - Nếu lot không tồn tại và policy cho phép, tạo lot mới hoặc trả 400 (chốt theo nghiệp vụ khi refine).
- Mỗi dòng confirm phải sinh InventoryTransaction:
  - Inbound -> Receipt (quantity dương)
  - Outbound -> Usage (quantity âm)
  - reference_number = order_id
  - performed_by = requester.actor
- Toàn bộ luồng confirm phải chạy trong MongoDB transaction/session để đảm bảo tính toàn vẹn.
- Idempotency:
  - Nếu order đã Confirmed/Rejected -> trả 409, không xử lý lặp.

## 4.4 Worklist assignment policy

- Hệ thống hiện có 1 tài khoản/role nên không triển khai assignment nhiều người.
- Worklist được xác định trực tiếp từ dữ liệu phiếu PendingConfirmation.
- Với Operator: hiển thị các phiếu do chính tài khoản đang đăng nhập tạo.
- Với Manager: hiển thị toàn bộ phiếu pending để giám sát.

## 5) Kế hoạch implement theo phase

## Phase 1 - Đặt nền data model + DTO (DONE)

- Mở rộng schema import_export_order:
  - confirmed_by, confirmed_at, confirm_note
  - confirmed_items
- Tạo DTO mới:
  - confirm-import-export-order.dto.ts
  - reject-import-export-order.dto.ts
- Bổ sung validator cho blind count.

Deliverable:

- Build pass, schema migration an toàn với dữ liệu US24 cũ.

## Phase 2 - Worklist API (DONE)

- Thêm endpoint GET /worklist.
- Bổ sung policy role và created_by check trong service.

Deliverable:

- Operator nhận đúng danh sách phiếu được giao.

## Phase 3 - Confirm/Reject nghiệp vụ thực tế (DONE - core)

- Thêm endpoint POST /:id/confirm và POST /:id/reject.
- Implement luồng update tồn kho + sinh inventory transactions.
- Xử lý transaction (session) cho update order + lot + transaction records.

Deliverable:

- Xác nhận xong là tồn kho thay đổi ngay.
- Tạo đủ inventory_transactions theo từng dòng hàng.

## Phase 4 - Hardening, logs, và test (DONE - unit + controller e2e)

- Unit test service cho các case:
  - Confirm inbound thành công.
  - Confirm outbound đủ tồn / thiếu tồn.
  - Reject flow.
  - Idempotency và permission.
- E2E test cho worklist + confirm/reject.
- Thêm audit logs với order_id, actor, kết quả, variance.

Deliverable:

- Test pass, có bằng chứng cho acceptance criteria US25.

## Phase 5 - Integration rollout (DONE)

- Cập nhật tài liệu API cho frontend US25.
- Seed demo (nếu cần) để có pending orders created_by admin_operator.
- Checklist smoke test với role Operator và Manager.

Artifacts đã bổ sung:

- frontend/US25_IMPORT_EXPORT_CONFIRM_API_GUIDE.md
- frontend/US25_OPERATOR_MANAGER_SMOKE_CHECKLIST.md
- frontend/US25_OPERATOR_CONFIRM_IMPORT_EXPORT_FE_PLAN.md
- database/mongo-init.js (bổ sung REF-US25-001, REF-US25-002)

Deliverable:

- Sẵn sàng handoff frontend + QA.

## 6) RỦI RO và đề xuất giảm thiểu

- Rủi ro race condition khi 2 người cùng confirm 1 phiếu:
  - Giảm thiểu: optimistic check theo status + Mongo transaction.
- Rủi ro sai đơn vị tính giữa order item và lot:
  - Giảm thiểu: validate unit_of_measure trước khi cập nhật tồn.
- Rủi ro dữ liệu cũ dùng created_by không đồng nhất (username/UUID):
  - Giảm thiểu: chuẩn hóa created_by theo username trước khi test US25.

## 7) Definition of Done (US25 Backend)

- Có Worklist cho tài khoản Operator hiện hành.
- Có endpoint confirm/reject thực tế.
- Confirm cập nhật tồn kho realtime.
- Mọi biến động được ghi vào inventory_transactions.
- Role/permission đúng theo nghiệp vụ.
- Unit test + e2e test cho các luồng chính đều pass.
