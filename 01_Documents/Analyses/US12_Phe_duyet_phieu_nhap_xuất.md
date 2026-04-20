# US12 — Phê duyệt phiếu nhập/xuất kho

Phiên bản: 1.0
Ngày: 2026-04-19

## Tóm tắt

Mục tiêu: Triển khai luồng phê duyệt (approve/reject) cho phiếu nhập/xuất (warehouse slip) — chỉ `Manager` được phê duyệt; khi `Approve` hệ thống khóa phiếu, thực hiện cập nhật tồn kho (cộng/trừ) một cách nguyên tử và ghi Audit log; khi `Reject` yêu cầu nhập lý do và ghi lại. Giao diện phê duyệt phải hiển thị ảnh/chứng từ kèm theo để so khớp.

## Tiêu chí chấp nhận (Acceptance Criteria)

- Chỉ `Manager` có quyền `Approve` / `Reject`.
- Khi `Approve`: phiếu chuyển trạng thái `CONFIRMED` (hoặc `APPROVED` theo chuẩn), phiếu bị khóa (không thể sửa/xóa), hệ thống thực hiện cộng/trừ tồn kho tương ứng và tạo các bản ghi giao dịch kho (inventory transaction).
- Khi `Reject`: phiếu chuyển trạng thái `REJECTED`, bắt buộc nhập `reject_reason` và lưu `rejected_by`/`rejected_at`.
- Ảnh/chứng từ (attachments) hiển thị trên màn hình phê duyệt để Manager đối chiếu.
- Mọi hành vi phải được ghi Audit (ai, hành động, thời gian, nội dung thay đổi).
- Hoạt động `Approve` phải idempotent (không áp dụng thay đổi tồn kho hai lần nếu thực hiện lại).
- Trong trường hợp `OUT` có thiếu tồn kho, trả lỗi rõ ràng và không commit thay đổi.

## Giả định

- US11 (tạo phiếu, attachments, schema `warehouse_slips`) đã được triển khai theo thiết kế hiện có.
- Hệ thống đã có cơ chế authentication/authorization (role `Manager`).
- Hạ tầng lưu attachments (local/MinIO/S3) đã sẵn sàng.

## Thay đổi dữ liệu đề xuất (MongoDB / Mongoose)

Thêm các trường trên document `warehouse_slip` để lưu trạng thái phê duyệt và hỗ trợ idempotency:

- `status`: enum(`PENDING`,`CONFIRMED`,`REJECTED`) — (US11 đã dùng `PENDING` mặc định).
- `confirmed_by?: string`
- `confirmed_at?: Date`
- `rejected_by?: string`
- `rejected_at?: Date`
- `reject_reason?: string`
- `locked?: boolean` — true khi đã Confirmed (khóa phiếu)
- `processed_transactions?: string[]` — danh sách `inventory_transaction_id` đã tạo (dùng cho idempotency / audit)

Ví dụ (Mongoose props):

```ts
@Prop() confirmed_by?: string;
@Prop() confirmed_at?: Date;
@Prop() rejected_by?: string;
@Prop() rejected_at?: Date;
@Prop() reject_reason?: string;
@Prop({ default: false }) locked?: boolean;
@Prop({ type: [String], default: [] }) processed_transactions?: string[];
```

Index đề xuất: `warehouse_id, status` đã có; bổ sung index `locked` nếu cần tìm nhanh phiếu đã khoá.

## API contract (đề xuất)

- `POST /api/warehouse/slips/:id/approve`
  - Auth: bearer token, role `Manager`
  - Body: `{ notify?: boolean }` (tùy chọn)
  - Success: `200 OK` + updated slip
  - Error: `400` (validation), `409` (conflict/already processed), `422` (business rules e.g. insufficient stock)

- `POST /api/warehouse/slips/:id/reject`
  - Auth: role `Manager`
  - Body: `{ reason: string }` (bắt buộc)
  - Success: `200 OK` + updated slip

Ghi chú: có thể triển khai dưới dạng một service method (e.g., `warehouseSlipService.approve(id, opts, user)`).

## Hành vi backend (flow chi tiết)

1. Kiểm tra quyền (role `Manager`).
2. Lấy slip bằng `id` (kèm kiểm tra `status === 'PENDING'`). Nếu `status` đã `CONFIRMED` trả 200 idempotent hoặc 409 tùy policy.
3. Bắt đầu DB transaction (MongoDB session hoặc transaction DB RDBMS).
4. Với mỗi `line` trong slip:
   - Nếu `type === 'IN'`: tạo inventory transaction `RECEIPT`, tăng số lượng tại `warehouse_id` / `bin` / `lot` tương ứng.
   - Nếu `type === 'OUT'`: kiểm tra tồn kho; nếu đủ, tạo inventory transaction `ISSUE`/`USAGE` và giảm tồn; nếu không đủ, abort transaction và trả lỗi `422`.
5. Lưu `inventory_transaction_id` vào `processed_transactions` để tránh duplicate.
6. Cập nhật `warehouse_slip`: `status='CONFIRMED'`, `confirmed_by`, `confirmed_at`, `locked=true`.
7. Tạo Audit log (ai, hành động approve, trước/sau nếu cần, danh sách transaction đã tạo).
8. Commit transaction và trả về slip đã cập nhật.

Notes: xử lý lỗi phải rollback toàn bộ. Đảm bảo atomicity và idempotency (kiểm tra `processed_transactions` trước khi tạo transaction mới).

## UI — Frontend (thay đổi)

- Page chi tiết phiếu: hiển thị toàn bộ attachments (ảnh/pdf thumbnails) bên cạnh thông tin phiếu.
- Hiển thị 2 nút `Approve` và `Reject` chỉ với user role `Manager`.
- `Approve` -> modal xác nhận → gọi `POST /approve` → show spinner → cập nhật trạng thái và hiển thị số transaction đã sinh.
- `Reject` -> modal nhập `Lý do` (bắt buộc) → gọi `POST /reject` → cập nhật trạng thái.
- Các thông báo rõ ràng khi có lỗi (ví dụ: tồn kho không đủ để xuất).

## Migration database

- Tạo migration script để thêm các trường mới (mặc định `locked=false`, `processed_transactions=[]`).
- Backfill: với slip hiện có `status='CONFIRMED'` có thể set `locked=true` và `confirmed_at` nếu có log cũ.

## Kiểm thử

- Unit tests: service approve/reject logic (bao gồm trường hợp success, idempotency, insufficient stock, already confirmed).
- Integration tests: simulate create slip → approve → kiểm tra inventory change + audit logs.
- E2E: UI flow (Operator tạo phiếu → Manager approve → verify stock change).

## Rủi ro & giải pháp

- Race conditions khi nhiều Manager approve cùng lúc: dùng transaction và check `status` trước cập nhật.
- Thiếu tồn kho cho `OUT`: trả lỗi rõ, không commit. Có thể cung cấp luồng partial/hold nếu yêu cầu.
- Đảm bảo attachments an toàn (scan) — nếu cần triển khai virus-scan pipeline trước khi hiển thị.

## Ước lượng & phụ thuộc

- Ước lượng: 3–7 ngày làm việc (backend + migration + tests: 2–5d, frontend + E2E: 1–2d, buffer/QA).
- Phụ thuộc: cơ chế transaction DB, mô-đun inventory hiện có (nếu chưa có, cần thời gian thêm), storage attachments.

## Checklist triển khai (mapping tới todo list)

1. Xác nhận tiêu chí chấp nhận — (HOÀN TẤT)
2. Khảo sát codebase liên quan — (tiếp theo)
3. Thiết kế API phê duyệt — (sẽ triển khai trong file code)
4. Thiết kế mô hình dữ liệu — (đã phác thảo ở trên)
5. Viết migration database
6. Cài đặt logic backend (service + endpoint)
7. Khóa phiếu và ghi Audit
8. Hiển thị ảnh chứng từ trên UI
9. Tạo giao diện phê duyệt (detail page)
10. Viết unit & integration tests
11. Viết kịch bản kiểm thử chấp nhận (E2E)
12. Chuẩn bị PR và hướng dẫn deploy (migrate trước)
13. Cập nhật tài liệu người dùng

## Bước tiếp theo đề xuất

- Nếu bạn đồng ý: tôi sẽ bắt đầu khảo sát codebase để tìm các file/endpoint hiện tại liên quan tới `warehouse_slips`, `inventory` và `audit` rồi báo cáo vị trí cần sửa (service, controller, schema, frontend component). Sau đó tôi có thể tạo PR thay đổi incremental.

---

File này là kế hoạch chi tiết cho US-12; nếu bạn muốn tôi bắt tay thực hiện luôn (khảo sát codebase → implement), cho biết để tôi tiếp tục.
