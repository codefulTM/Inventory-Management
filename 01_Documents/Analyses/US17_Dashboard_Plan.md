# US17 — Dashboard Báo Cáo Tổng Hợp (Plan)

Phiên bản: 1.1
Ngày: 2026-04-20

Tóm tắt

- Mục tiêu: xây dựng Dashboard cho `Manager` tổng hợp tình hình tồn kho, hiệu suất nhập/xuất, và các KPI quan trọng (Inventory Value, Turnover, Aging), cho phép drill-down tới transactions và attachments.
- Phạm vi: time-series nhập/xuất, cơ cấu tồn kho theo warehouse/category, inventory aging, top-N materials, drill-down tới `warehouse_slips` / `inventory_transactions`.

Tiêu chí chấp nhận (Acceptance Criteria)

- **AC1:** Dashboard hiển thị biểu đồ xu hướng nhập và xuất theo khoảng thời gian (daily/weekly/monthly) với lựa chọn filter warehouse/material.
- **AC2:** Có view `Structure` cho biết cơ cấu tồn kho theo category và theo warehouse (pie / treemap), có export PDF/Excel.
- **AC3:** KPI chính (Inventory Value, Inventory Turnover, Avg. Days in Inventory) hiển thị chính xác và có chú giải công thức.
- **AC4:** Từ mọi chart có thể drill-down vào danh sách transactions liên quan; click một item mở chi tiết slip (với attachments hiển thị).
- **AC5:** Endpoints trả kết quả lọc điển hình < 2s trên dataset mẫu (sử dụng indexing/caching/pre-aggregation).
- **AC6:** Có unit tests cho logic aggregation và integration tests cho các endpoint chủ chốt.

Giả định & Phụ thuộc

- DB: MongoDB với collections `warehouse_slips`, `inventory_transactions`, `materials`, `warehouses`.
- Auth: Keycloak hoặc hệ thống RBAC sẵn — role `Manager` tồn tại.
- Storage attachments (US11) đã có URL để hiển thị.
- Có Redis hoặc cache tương đương cho caching (nếu không, bổ sung vào phụ thuộc).

Chi tiết kỹ thuật & bước thực hiện (step-by-step)

Phase 0 — Chuẩn bị (0.5 ngày)

- B0.1: Tổ chức grooming (60 phút) với Product/Manager để xác nhận KPIs, granularity và filters.
- B0.2: Lấy mẫu dataset (sanitized) để dùng khi phát triển và test.

Phase 1 — Thiết kế dữ liệu & truy vấn (1.5 ngày)

- B1.1: Xác định metrics cụ thể và công thức cho mỗi KPI (ví dụ Inventory Turnover = COGS / Avg Inventory).
- B1.2: Thiết kế Aggregation Pipelines:
  - trends pipeline: $match(date range, warehouse/material) → $group by date bucket (day/week/month) → $sum(in_qty/out_qty, value).
  - structure pipeline: $match(current stock) → $group by category/warehouse → $sum(quantity/value).
  - aging pipeline: compute days-in-inventory per lot → $bucket range.
- B1.3: Viết pseudo-code aggregation và sample Mongo explain() để ước lượng cost.

Phase 2 — Indexes & Migration (0.5 ngày)

- B2.1: Đề xuất indexes: `inventory_transactions.transaction_date`, `inventory_transactions.warehouse_id`, `inventory_transactions.material_id`, `warehouse_slips.status`, `warehouse_slips.warehouse_id`.
- B2.2: Viết migration script mẫu (add indexes + optional backfill for pre-aggregates metadata).

Phase 3 — Backend implementation (2–3 ngày)

- B3.1: API contract (đoạn tóm tắt)
  - `GET /api/dashboard/summary` — trả KPIs tổng quan (body: {from,to,warehouseId,materialId}).
  - `GET /api/dashboard/trends` — trả time-series (query params: metric, interval, from, to, filters).
  - `GET /api/dashboard/structure` — trả cơ cấu tồn kho.
  - `GET /api/dashboard/aging` — trả aging buckets.
  - `GET /api/dashboard/drilldown` — trả paginated transactions list cho selection (params: metric, bucketId, page, size).
- B3.2: Implement service layer functions for each aggregation with parameters validation and projection.
- B3.3: Add idempotency/caching hooks (cache key includes filters + interval).
- B3.4: Add integration tests stubbing DB with small dataset.

Phase 4 — Caching & Pre-aggregation (1–2 ngày)

- B4.1: Design cache strategy: short-lived cache (TTL 30s–2m) for interactive queries; nightly pre-aggregate for 30/90/365-day windows.
- B4.2: Implement Redis cache wrapper; implement background job (cron) to compute and persist pre-aggregated results to a `dashboard_preaggregates` collection.
- B4.3: Add cache invalidation rules: on relevant transactions creation/approval events (US11/US12 hooks), invalidate affected keys or schedule incremental update.

Phase 5 — Frontend mockups & UX (1 day)

- B5.1: Produce low-fidelity mockups: dashboard layout (filters top-left, KPI cards, trends center, structure right, drill-down modal).
- B5.2: Define chart types: trends (line with stacked in/out), structure (treemap/pie), aging (bar buckets), top-N table.
- B5.3: Accessibility checks (contrast, keyboard, screen-reader labels).

Phase 6 — Frontend implementation (2–4 ngày)

- B6.1: Build reusable `ChartPanel` and `FilterBar` components.
- B6.2: Implement `DashboardPage` with data fetching hooks using backend endpoints and cache-aware UI.
- B6.3: Drill-down: clicking chart opens `DrilldownModal` with paginated `transactions` and link to slip detail (show attachments thumbnails).
- B6.4: Export: add `Export CSV/PDF` action using server-side `trends/structure` export endpoints.

Phase 7 — Tests (1–2 ngày)

- B7.1: Unit tests for aggregation functions (edge cases: empty ranges, zero inventory).
- B7.2: Integration tests for endpoints (using in-memory Mongo or test DB).
- B7.3: E2E test: simulate user flow filter→view trends→drill-down→open slip.

Phase 8 — Deploy, Monitoring & Runbook (0.5–1 ngày)

- B8.1: Instrument endpoints with timings (Prometheus metrics or existing monitoring stack).
- B8.2: Dashboard runbook: how to refresh pre-aggregates, handle cache issues, and roll back migration.

Phase 9 — Documentation & Handoff (0.5 ngày)

- B9.1: API docs (OpenAPI snippets for the endpoints).
- B9.2: User guide for Manager (how to interpret KPIs, export report).

Ước lượng tổng thời gian

- 9–13 working days (1 backend dev + 1 frontend dev + QA/DevOps support as needed).

Rủi ro & Giải pháp

- R1: Aggregations heavy on large historical data → giải pháp: pre-aggregate, use time-buckets, and ensure indexes.
- R2: KPIs có ý nghĩa khác nhau giữa các stakeholders → giải pháp: grooming sớm và xác nhận công thức mẫu trên dữ liệu test.

Env vars & cấu hình (đề xuất)

- `DASHBOARD_PREAGGREGATE_ENABLED` (bool)
- `DASHBOARD_CACHE_TTL_SECONDS` (int)
- `DASHBOARD_PREAGGREGATE_CRON` (cron spec)

Migration notes

- Tạo index scripts và migration để thêm collection `dashboard_preaggregates`.
- Nếu muốn nhanh: cấu hình pre-aggregate chỉ cho 30/90/365 ngày ban đầu.

Acceptance Test Checklist (detailed)

- [ ] KPIs match manual aggregation for sample ranges.
- [ ] Trend chart aggregates correct in daily/weekly/monthly buckets.
- [ ] Structure view sums equal total current inventory value across warehouses.
- [ ] Drill-down returns correct transactions and attachments links open.
- [ ] Endpoint response times meet target < 2s (with caching).
- [ ] Tests (unit/integration/E2E) present and passing in CI pipeline.

Checklist triển khai (tương ứng với todo list)

1. Finalize KPIs & filters with stakeholders (B0)
2. Design aggregation pipelines and schemas (B1)
3. Define DB indexes, migrations and backfill plan (B2)
4. Implement backend summary/trends/structure endpoints (B3)
5. Implement drill-down + pagination endpoints (B3)
6. Add caching and nightly pre-aggregation jobs (B4)
7. Performance tuning & monitoring (B8)
8. Frontend mockups, UX and accessibility review (B5)
9. Frontend implementation (charts, filters, drill-down) (B6)
10. Write unit, integration and E2E tests (B7)
11. Deployment, runbook and cache invalidation docs (B8)
12. Documentation, API docs and handoff (B9)

Next immediate actions (recommended)

- 1. Book a 60-minute grooming to finalize KPIs and filters. I can draft an agenda and sample KPI formulas.
- 2. After grooming: start B1 (data pipelines) and open a small spike PR with sample aggregation queries and `explain()` outputs.

Related files

- See `01_Documents/Analyses/US11_Tao_phieu_nhap_xuat_ke_hoach.md` and `01_Documents/Analyses/US12_Phe_duyet_phieu_nhap_xuất.md` for related data model and approve flows.
