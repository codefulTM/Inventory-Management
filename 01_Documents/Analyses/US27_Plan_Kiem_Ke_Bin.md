# US27 — Plan: Worklist kiểm kê theo vị trí kệ (Bin)

## Mục tiêu
- Hiển thị danh sách vị trí kệ (Bin) cần kiểm tra cho nhân viên (worklist).
- Cảnh báo khi chênh lệch > 50% so với hệ thống.
- Hỗ trợ nhập liệu offline và đồng bộ khi có mạng.

## Acceptance criteria (US27)
- UI hiển thị danh sách `bin` (mã ô/kệ) cần kiểm tra với: `bin_code`, `expected_qty`, `current_qty_by_lot`, `last_count_date`.
- Cho phép drill-down vào từng `bin` để nhập số lượng thực tế cho từng lot/SKU.
- Nếu |counted - expected| / expected >= 50% thì hiện cảnh báo và tạo flag/ task review.
- Hỗ trợ lưu tạm offline và sync lại khi online; sync conflict được ghi log và audit.

## Giả định
- Hiện có trường `storage_location` trên `inventory_lots` (schema hiện tại).
- Hệ thống dùng MongoDB + Mongoose (NestJS).

## Tổng quan giải pháp (2 lựa chọn)
- Option A — Quick Win: dùng `storage_location` làm `bin_code` (không tạo collection mới):
  - Ưu: triển khai nhanh, ít migration.
  - Nhược: không có metadata cho bin (capacity, zone, parent).
- Option B — Long-term: tạo collection `bins` (recommended nếu cần quản lý vị trí):
  - `bins` có fields: `bin_id`, `code`, `warehouse_id`, `parent_id`, `capacity`, `attributes`, `is_active`.
  - `inventory_lots` lưu `bin_id` (nullable) làm tham chiếu.

Khuyến nghị: Bắt đầu với Option A (dùng `storage_location`) để hiện thực feature nhanh, sau đó migrate lên `bins` khi cần metadata/quyền/ quản lý vị trí phức tạp.

---

## Chi tiết kỹ thuật & bước thực hiện

### 1) Xác định & chốt acceptance (1–2 giờ)
- Chốt độ lệch cảnh báo (theo backlog: 50%).
- Chốt quy tắc selection (bên dưới).

### 2) Data model + Migration (Option A — quick)
- Thêm index cho search/aggregation:

```ts
// backend/src/schemas/inventory-lot.schema.ts (migration)
InventoryLotSchema.index({ storage_location: 1 });
```

- Kiểm tra và chuẩn hoá format `storage_location` (trim, uppercase) khi insert/update.
- Backfill: chạy aggregation để tìm tất cả `storage_location` null -> set `UNASSIGNED` hoặc leave null.
- Nếu muốn, thêm validation regex cho `storage_location` (ví dụ `^[A-Z0-9-]+$`).

### 3) Data model (Option B — migrate to `bins`)
- Tạo schema `bins` (Mongoose) và tạo documents cho mỗi unique `storage_location`:

```ts
@Schema({ collection: 'bins' })
class Bin { code: string; warehouse_id?: string; parent_id?: string; attributes?: Record<string,any>; is_active?: boolean; }
```
- Backfill steps:
  1. Distinct `storage_location` from `inventory_lots`.
  2. Insert into `bins` (code = storage_location).
  3. Update `inventory_lots` set `bin_id` by lookup code->id.

### 4) Backend — API contract
- `GET /api/inventory/bin-worklist?warehouse_id=&page=&limit=&filter=`
  - Response: [{ bin_code, bin_id?, expected_qty, lots: [{lot_id, material_id, expected_qty}], last_count_date, priority }]
- `GET /api/inventory/bins/:bin_code` (or `:bin_id`) — lấy chi tiết bin
- `POST /api/inventory/bins/:bin_code/counts` — submit kết quả kiểm kê cho bin
  - Body: `{ counted_by, counted_at, entries: [{ lot_id?, material_id, counted_qty }], attachments? }`
- `GET /api/inventory/bin-worklist/export?format=pdf` — export báo cáo

### 5) Selection logic — rules để sinh worklist
- Configurable rules (priority order):
  - Bins chưa được kiểm kê trong `N` ngày (config, default 90).
  - Bins có giao dịch (receipt/usage/transfer) trong `M` ngày gần đây.
  - Bins với biến động qty lớn (std dev) hoặc có nhiều điều chỉnh trước đó.
  - Cycle counting rule: theo ABC (A: kiểm kê thường xuyên hơn).

Sample Mongo aggregation (expected qty per bin):
```js
db.inventory_lots.aggregate([
  { $match: { storage_location: { $ne: null } } },
  { $group: { _id: "$storage_location", expected_qty: { $sum: "$quantity" }, last_modified: { $max: "$modified_date" } } },
  { $sort: { expected_qty: -1 } }
])
```

### 6) Counting flow (frontend + backend)
- Operator chọn bin (scan barcode hoặc tìm).
- Hiện list lots trong bin với `expected_qty`.
- Operator nhập `counted_qty` cho từng lot (có thể nhập tổng nếu không theo-lot).
- Client lưu locally nếu offline (queue), và show `sync_status`.
- Khi submit/sync: backend tính `delta_pct = |counted - expected| / expected * 100`.
  - Nếu `expected == 0 && counted > 0` => treat as 100% discrepancy.
  - Nếu `delta_pct >= 50%` => tạo `flag_review: true` và notify manager; không auto-apply adjustment (configurable).
  - Nếu `delta_pct < 50%` và config cho phép auto-adjust => create adjustment slip (`warehouse_slips`) with type `ADJUSTMENT` and status `PENDING`.
- Ghi `history`/audit record lên `inventory_lots` và `bin_count_records` collection.

### 7) Frontend — UI & Offline
- Mobile-first worklist screen: list bins → open bin → count screen.
- Controls: scan barcode, photo attachment, quick-edit numeric pad.
- Offline: use IndexedDB/localStorage to persist queued count events; sync worker tries to push when online.
- Show conflict UI on sync failure.

### 8) Alerts & Reports
- Real-time in-app notification (and optional email) when flagged counts detected.
- Export PDF report of count session (include photos, operator, timestamps, deltas).

### 9) Tests
- Unit tests: aggregation logic, delta computation, flagging rules.
- Integration tests: POST count flow and resulting DB changes.
- E2E: simulate offline capture → sync → verify adjustment/flag.

### 10) Rollout & Migration steps
1. Implement Option A changes on staging: index + API + frontend.
2. Backfill `storage_location` normalization script; test queries.
3. QA: run sample counts with test data (include cases >50% discrepancy).
4. Deploy to production during maintenance window; run backfill; monitor.
5. If migrating to `bins` (Option B): run the 3-step backfill and switch API to use `bin_id`.

### 11) Deliverables
- Backend: endpoints, aggregation logic, migration scripts.
- Frontend: worklist screens + offline sync.
- Tests & docs: runbook cho kiểm kê, rollback steps.

### 12) Tạm tính effort (thô)
- Quick Win (Option A): 3–5 days (1 dev + 1 QA).
- Full `bins` migration + UI polish: 7–12 days.

---

## Next actions (gợi ý)
- Chọn Option A (quick) hoặc Option B (migrate to `bins`).
- Nếu chọn A: mình có thể tạo migration/index patch và example API controller (PR). Nếu OK, mình sẽ tạo code mẫu tiếp theo.

---

*File này được tạo để làm checklist triển khai US27 — Worklist kiểm kê theo vị trí kệ.*
