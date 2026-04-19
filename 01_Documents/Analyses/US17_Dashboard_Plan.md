# US17 — Dashboard Báo Cáo Tổng Hợp (Plan)

Phiên bản: 1.2 — Minimal plan
Ngày: 2026-04-20

Yêu cầu của bạn: chỉ giữ các bước thiết yếu; bỏ qua các bước phụ không cần thiết.

Mục tiêu rút gọn

- Cung cấp một Dashboard tối thiểu đáp ứng AC cơ bản: KPIs chính, biểu đồ xu hướng (in/out), và khả năng drill-down tới danh sách transactions và mở chi tiết slip.

Chỉ các bước thiết yếu (step-by-step)

1. Grooming nhanh (30–60 phút)

- KQ: xác nhận 3 KPI bắt buộc (Inventory Value, In/Out volume trend, Top-10 materials) và các filter cần thiết (date range, warehouse).

2. Spike: viết core aggregation queries (0.5–1 ngày)

- Viết 3 aggregation scripts trong Mongo shell / playground:
  a) summary KPI (current inventory value per warehouse)
  b) trends (daily in/out sums for date range)
  c) drilldown query (transactions list for a date bucket / material)
- Chạy `explain()` cho mỗi query và lưu 1–2 dòng comment về index cần thêm.

3. Implement backend minimal endpoints (1–2 ngày)

- `GET /api/dashboard/summary` → returns KPIs (fast aggregation).
- `GET /api/dashboard/trends` → returns time-series (metric=in|out, from,to,interval).
- `GET /api/dashboard/drilldown` → paginated list of `warehouse_slips`/`inventory_transactions` matching selection.
- Requirements: input validation, simple caching (in-memory TTL 30s) if Redis unavailable, and basic unit tests for aggregation functions.

4. Minimal frontend (1–2 ngày)

- Single `DashboardPage` with:
  - Filter bar (date range, warehouse)
  - KPI cards (Inventory Value, In volume, Out volume)
  - One trends chart (line) with click-to-drilldown
  - Drilldown modal showing paginated transactions with link to slip detail
- Use existing chart library in repo (if available) or a lightweight choice (Chart.js).

5. Basic tests & docs (0.5 ngày)

- Unit tests for aggregation logic (happy path + empty result).
- Integration test for endpoints using small test DB.
- Minimal API docs (1 paragraph + example requests for each endpoint).

Acceptance checklist (minimal)

- [ ] KPIs display and trends chart render for sample date range.
- [ ] Click on chart bucket opens drilldown with correct transactions.
- [ ] Endpoints have basic tests and return results under acceptable latency on sample dataset.

Next immediate action I will take if you confirm

- Draft a 30–60 minute grooming agenda with KPI formulas and example queries.

Related files

- See `01_Documents/Analyses/US11_Tao_phieu_nhap_xuat_ke_hoach.md` and `01_Documents/Analyses/US12_Phe_duyet_phieu_nhap_xuất.md` for data model references.
