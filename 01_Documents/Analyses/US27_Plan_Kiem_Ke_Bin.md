# US27 — Plan: Worklist kiểm kê theo vị trí kệ (Bin)

[//]: # "File rewritten to follow Option A — use storage_location as bin_code"

# US27 — Plan: Worklist kiểm kê theo vị trí kệ (Option A — sử dụng `storage_location`)

## Mục tiêu

- Hiển thị danh sách vị trí kệ (bin) cần kiểm tra cho nhân viên (worklist).
- Cảnh báo khi chênh lệch >= 50% so với số liệu hệ thống.
- Hỗ trợ nhập liệu offline và đồng bộ khi có mạng.

## Acceptance criteria (US27)

- Worklist trả về danh sách `bin` dựa trên `storage_location` từ `inventory_lots` gồm: `bin_code` (== `storage_location`), `expected_qty`, `lots` (chi tiết lot trong bin), `last_count_date`, `priority`.
- Người dùng có thể drill-down vào bin để nhập `counted_qty` theo lot hoặc tổng, đính kèm ảnh bằng chứng.
- Nếu |counted - expected| / expected >= 50% (hoặc expected == 0 và counted > 0) -> hệ thống gắn `flag_review` và gửi notification cho manager; không auto-apply thay đổi kho.
- Cho phép lưu tạm (offline) và sync khi online; sync phải tạo `bin_count_record` và audit trail.

## Giả định

- Đã tồn tại trường `storage_location` trong `inventory_lots` (backend/src/schemas/inventory-lot.schema.ts).
- Hệ thống backend dùng MongoDB + Mongoose (NestJS).

## Giải pháp (Option A — dùng `storage_location` làm `bin_code`)

Tóm tắt: sử dụng ngay trường `storage_location` trên `inventory_lots` như mã bin (bin_code). Ưu điểm: triển khai nhanh, ít thay đổi schema; có thể migrate sau sang collection `bins` nếu cần metadata.

### 1) Thay đổi schema nhỏ (backend)

- Chỉnh `inventory-lot.schema.ts` để chuẩn hoá và validate `storage_location`:

```ts
// backend/src/schemas/inventory-lot.schema.ts
@Prop({ type: String, maxlength: 100, required: false, trim: true, uppercase: true, match: /^[A-Z0-9-]+$/ })
storage_location?: string;

// index để tăng tốc aggregation/group-by
InventoryLotSchema.index({ storage_location: 1 });
InventoryLotSchema.index({ storage_location: 1, modified_date: -1 });
```

Ghi chú: `match` là tuỳ chọn—bỏ nếu có mã vị trí chứa ký tự khác. `uppercase: true` giúp chuẩn hoá.

### 2) Backfill & normalization

- Viết script migration (NodeJS hoặc Mongo shell) để:
  1. Trim + uppercase tất cả `storage_location` hiện có.
  2. Đổi các giá trị rỗng/null thành `UNASSIGNED` (hoặc để null tuỳ yêu cầu).

Mongo shell (ví dụ):

```js
db.inventory_lots.updateMany({}, [
  {
    $set: {
      storage_location: {
        $cond: [
          {
            $in: [
              { $trim: { input: "$storage_location" } },
              [null, "", undefined],
            ],
          },
          "UNASSIGNED",
          { $toUpper: { $trim: { input: "$storage_location" } } },
        ],
      },
    },
  },
]);

// Tạo index
db.inventory_lots.createIndex({ storage_location: 1 });
```

### 3) Lưu kết quả kiểm kê: `bin_count_records` collection

- Tạo collection để lưu session kiểm kê (audit + sync):

```ts
// backend/src/schemas/bin-count-record.schema.ts
@Schema({ collection: "bin_count_records", timestamps: true })
class BinCountRecord {
  @Prop() bin_code: string;
  @Prop() counted_by: string;
  @Prop() counted_at: Date;
  @Prop({
    type: [
      {
        lot_id: String,
        material_id: String,
        expected_qty: Number,
        counted_qty: Number,
      },
    ],
  })
  entries: any[];
  @Prop({ default: false }) flag_review: boolean;
  @Prop() notes?: string;
  @Prop({ type: [Object], default: [] }) attachments?: Record<string, any>[];
}
```

### 4) API endpoints (gợi ý)

- `GET /api/inventory/bin-worklist?warehouse_id=&limit=&page=`
  - Trả về danh sách bin (bin_code, expected_qty, lots[], last_count_date, priority).
- `GET /api/inventory/bins/:bin_code` — details của bin (lots trong bin).
- `POST /api/inventory/bins/:bin_code/counts` — submit kết quả kiểm kê (tạo `BinCountRecord`).

Ví dụ aggregation để sinh worklist (expected qty per bin):

```js
db.inventory_lots.aggregate([
  { $match: { storage_location: { $ne: null } } },
  {
    $group: {
      _id: "$storage_location",
      expected_qty: { $sum: "$quantity" },
      lots: {
        $push: {
          lot_id: "$lot_id",
          material_id: "$material_id",
          qty: "$quantity",
        },
      },
      last_modified: { $max: "$modified_date" },
    },
  },
  {
    $project: {
      bin_code: "$_id",
      expected_qty: 1,
      lots: 1,
      last_count_date: "$last_modified",
    },
  },
  { $sort: { expected_qty: -1 } },
]);
```

### 5) Logic kiểm kê & business rules

- Khi nhận `POST /counts`, backend:
  1. Tính `expected = sum(expected_qty)` từ `inventory_lots` (đã group theo lot nếu client gửi theo lot).
  2. Tính `counted = sum(counted_qty)` do operator gửi.
  3. `delta_pct = expected === 0 ? 100 : Math.abs(counted - expected) / expected * 100`.
  4. Nếu `delta_pct >= 50` → set `flag_review = true`, tạo `BinCountRecord` với flag, gửi `notification` tới Manager; không auto-apply adjustment.
  5. Nếu `delta_pct < 50` và cấu hình cho phép auto-adjust → tạo `warehouse_slip` type `ADJUSTMENT` với status `PENDING`.
  6. Ghi audit vào `inventory_lots.history` và `bin_count_records`.

### 6) Frontend & Offline

- Worklist screen (mobile-first): list bin → open bin → count screen.
- Offline: lưu queued count sessions trong IndexedDB; sync worker gửi lên khi online.
- Sync phải trả về per-entry result (accepted, flagged, conflict). Conflicts được hiển thị cho operator/manager để review.

### 7) Alerts, Reports & Export

- Khi `flag_review` được tạo: push notification in-app và email (tuỳ cấu hình) cho role Manager.
- Export PDF/CSV của session kiểm kê, bao gồm ảnh chứng từ, delta và lịch sử.

### 8) Tests

- Unit: aggregation, delta calculation, flagging rules.
- Integration: submit counts → verify `bin_count_records` và notification.
- E2E: offline capture → sync → result handling.

### 9) Rollout ngắn

1. Dev: implement schema small changes + migration script + bin_count_records + API skeleton.
2. Staging: chạy migration (normalization), seed small dataset, QA thực hiện sample counts.
3. Production: deploy migration trong maintenance window; monitor indexes + slow queries.

### 10) Deliverables & effort

- Deliverables: migration script, schema patch, `bin_count_records` schema, API endpoints, frontend worklist screens, tests, runbook.
- Effort estimate (Option A): 2–4 days (1 dev + 1 QA) for PoC + basic UI; thêm 2–4 days để polish offline UX and export.

## Next actions (tôi có thể làm tiếp)

- Tạo patch sửa `inventory-lot.schema.ts` (thêm `trim/uppercase` + index) và migration normalization script.
- Scaffold API controller + service `bin-worklist` + `counts` endpoint.
- Tạo schema `bin_count_records` và mẫu aggregation query.

Cho mình biết bạn muốn mình bắt đầu với (1) schema + migration, (2) API scaffold, hoặc (3) frontend wireframe.

_File này đã được chỉnh lại để chỉ theo Option A (dùng `storage_location` làm `bin_code`)._

---

## Next actions (gợi ý)

- Chọn Option A (quick) hoặc Option B (migrate to `bins`).
- Nếu chọn A: mình có thể tạo migration/index patch và example API controller (PR). Nếu OK, mình sẽ tạo code mẫu tiếp theo.

---

_File này được tạo để làm checklist triển khai US27 — Worklist kiểm kê theo vị trí kệ._
