# [US10] Manager Inventory Adjustment - Smoke Checklist

## 1) Scope

Smoke test cho luồng backend điều chỉnh tồn kho của Manager:

- Tạo phiếu điều chỉnh tồn kho
- Ghi transaction Adjustment vào lịch sử
- Cập nhật valuation
- Tra cứu list/detail adjustment

## 2) Preconditions

- Backend đang chạy với API US10.
- Có user role Manager đăng nhập hợp lệ.
- Có ít nhất 1 lot tồn kho để test điều chỉnh.

## 3) Case Group A - Tạo adjustment hợp lệ

1. Gọi POST /inventory-adjustments với reason_code = DAMAGED, quantity = -5.
2. Kỳ vọng:

- API 201.
- Trả adjustment_id, transaction_id, valuation_before/after.
- lot_after.quantity = lot_before.quantity - 5.

## 4) Case Group B - Validation

1. adjustment_quantity = 0.
2. Kỳ vọng: 400.

3. reason_code = OTHER nhưng thiếu reason_note.
4. Kỳ vọng: 400.

5. unit_cost_snapshot < 0.
6. Kỳ vọng: 400.

## 5) Case Group C - Conflict/Not Found

1. Điều chỉnh âm vượt quá tồn hiện tại.
2. Kỳ vọng: 409.

3. lot_id không tồn tại.
4. Kỳ vọng: 404.

## 6) Case Group D - RBAC

1. Gọi API bằng role Operator.
2. Kỳ vọng: 403.

## 7) Case Group E - Query list/detail

1. GET /inventory-adjustments với filter reason_code.
2. Kỳ vọng: 200, có dữ liệu đúng filter.

3. GET /inventory-adjustments/:id với id hợp lệ.
4. Kỳ vọng: 200.

5. GET /inventory-adjustments/:id với id không tồn tại.
6. Kỳ vọng: 404.

## 8) Pass criteria

- Toàn bộ case A-E pass.
- Có transaction type Adjustment trong lịch sử liên kết adjustment.
- Valuation delta tính đúng theo adjustment_quantity \* unit_cost_snapshot.

## 9) Execution record

- Backend build: [x] PASS / [ ] FAIL
- Unit test US10: [x] PASS / [ ] FAIL
- E2E test US10: [x] PASS / [ ] FAIL
- Frontend build (FE-1 -> FE-5): [x] PASS / [ ] FAIL
- Frontend smoke manual: [ ] PASS / [ ] FAIL
- Người test: GitHub Copilot
- Thời điểm test: 2026-04-04
- Ghi chú: Đã xác nhận flow backend create/list/detail (e2e pass) và đã tích hợp frontend FE-1 đến FE-5 (form react-hook-form, list/filter/detail, route/menu). Smoke manual cần xác nhận thêm trên môi trường chạy thật.
