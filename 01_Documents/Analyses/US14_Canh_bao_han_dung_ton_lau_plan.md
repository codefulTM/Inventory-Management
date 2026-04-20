# US14 — Cảnh báo hạn dùng và tồn lâu (Plan)

Phiên bản: 1.0
Ngày: 2026-04-20

## Tóm tắt

Mục tiêu: phát hiện và cảnh báo tự động cho các vật tư/số lô sắp hết hạn hoặc nằm yên trong kho quá lâu (tồn lâu), giúp giảm rủi ro hư hỏng và tối ưu luân chuyển hàng.

## Tiêu chí chấp nhận (Acceptance Criteria)

- Cảnh báo chạy tự động hàng ngày (cron) theo cấu hình.
- Có thể cấu hình ngưỡng: `daysBeforeExpiry` (ví dụ 30/7/3 ngày) và `daysOfInactivity` (ví dụ 90/180 ngày) — có thể theo kho (warehouse) hoặc toàn hệ thống.
- Giao diện Alerts hiển thị danh sách cảnh báo, chi tiết lô, số lượng, vị trí, ngày hết hạn và mức độ nghiêm trọng; có lọc và tìm kiếm.
- Hệ thống gửi thông báo in-app và/hoặc email (cấu hình) cho role `Manager` và `Operator` theo thiết lập.
- Người dùng có thể acknowledge/close cảnh báo; hệ thống lưu audit trail (ai, khi nào, hành động).
- Tốc độ truy vấn danh sách cảnh báo đáp ứng (ví dụ <2s cho trang 1 với 1000+ lô).

## Phạm vi (In-scope / Out-of-scope)

- In-scope:
  - Định nghĩa rules (hạn dùng / tồn lâu) và scheduler backend.
  - Lưu alert records, API để truy vấn + acknowledge.
  - Frontend list + settings page để cấu hình ngưỡng và xem/acknowledge.
  - Notif: in-app + email (SMTP) (webhook/Slack làm mở rộng sau).
- Out-of-scope:
  - Tích hợp chữ ký số hay workflow phức tạp cho xử lý cảnh báo (task riêng nếu cần).

## Thiết kế tổng quan

- Data sources: `inventory_lots` (hoặc collection tương tự chứa `lot_id`, `material_id`, `expiry_date`, `quantity`, `warehouse_id`, `last_movement_date`, `bin_id`).
- New collection (alerts): `stock_alerts` để giữ alert hiện tại và lịch sử (tùy chọn). Schema gợi ý:

```
stock_alerts: {
  _id,
  alert_id (uuid),
  kind: 'EXPIRY'|'AGING',
  lot_id,
  material_id,
  warehouse_id,
  quantity,
  severity: 'INFO'|'WARN'|'CRITICAL',
  matched_at,
  rule_config_snapshot,
  status: 'OPEN'|'ACKNOWLEDGED'|'CLOSED',
  created_by_system: true,
  acknowledged_by?,
  acknowledged_at?,
  notes?,
}
```

- Indexes: đảm bảo index trên `inventory_lots.expiry_date`, `inventory_lots.last_movement_date`, và `stock_alerts.status, warehouse_id, matched_at`.

## Rules & Query (gợi ý)

- Expiry rule: select lots where `expiry_date != null` AND `expiry_date <= now + daysBeforeExpiry` AND `quantity > 0` AND `lot_status = 'Available'`.
- Aging rule: select lots where `last_movement_date <= now - daysOfInactivity` AND `quantity > 0`.
- Khi phát hiện, tạo hoặc cập nhật record trong `stock_alerts` (upsert) để tránh duplicate; giữ history nếu alert được resolved rồi re-open.

## Scheduler / Backend

- Job: `alerts.scan()` chạy theo cron (mặc định `0 0 * * *`, cấu hình bằng env `ALERTS_SCAN_CRON`).
- Hỗ trợ chạy on-demand qua API `POST /api/alerts/scan` (auth: Manager/Admin).
- Xử lý theo batch, paginated queries để tránh OOM; lock/run-id để tránh chạy song song.

## API endpoints (gợi ý)

- `GET /api/alerts` — list + filters (warehouse, kind, status, severity, date range, page/limit).
- `GET /api/alerts/:id` — chi tiết alert (link tới lot, material, lịch sử).
- `POST /api/alerts/scan` — trigger on-demand scan.
- `POST /api/alerts/:id/ack` — acknowledge (body: note).

## Frontend (UX)

- Page: `Alerts` trong Dashboard — table với columns: Severity, Material, Lot, Qty, Warehouse, Expiry, Last movement, Status, Actions(ack/close/view).
- Settings page: cấu hình `daysBeforeExpiry`, `daysOfInactivity`, notification channels per warehouse.
- Notification center: show in-app notifications; link tới alert detail.

## Notification channels

- In-app notification (required).
- Email via SMTP (configurable): send digest or immediate (configurable).
- Optional: webhook/Slack integration (future).

## Env / Konfig

- `ALERTS_SCAN_CRON` (default `0 0 * * *`)
- `ALERTS_DEFAULT_EXPIRY_DAYS` (e.g., 30)
- `ALERTS_DEFAULT_INACTIVITY_DAYS` (e.g., 180)
- `ALERTS_NOTIFY_EMAIL` (list or toggle)

## Kiểm thử (Testing)

- Unit tests: rule functions (expiry/aging evaluation) với nhiều trường hợp biên.
- Integration tests: tạo vài lots test (expiry/inactive) -> chạy `alerts.scan()` -> assert `stock_alerts` tạo/ cập nhật + notif gửi (mock SMTP).
- E2E: UI flow xem alert list, acknowledge.

## Migration & Deployment

- Add DB indexes (migration script) trước khi bật job ở production.
- Giải pháp rollout: bật chế độ `dry-run` (scan tạo logs nhưng không tạo `stock_alerts`) để giám sát false-positives trước khi bật create.

## Checklist triển khai (mapping với todo list)

1. Draft acceptance & scope — HOÀN THỰC HIỆN (bắt đầu)  
2. Design rules & indexes  
3. Implement alert scheduler (backend job, upsert alerts)  
4. Add API & notifications (in-app + email)  
5. Frontend UI & settings page  
6. Tests, docs, deploy config & migration

## Next steps

- Xác nhận Acceptance Criteria (nếu OK, tôi sẽ bắt đầu implement bước 2: thiết kế chi tiết queries và migration index). 
