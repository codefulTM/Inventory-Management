# [US16] Manager Export Inventory Audit Report - Smoke Checklist

## 1) Scope

Smoke test cho luồng backend xuất báo cáo kiểm kê của Manager:

- Tạo yêu cầu báo cáo
- Theo dõi trạng thái xử lý
- Tra cứu danh sách/chi tiết báo cáo
- Tải file PDF báo cáo
- Kiểm tra metadata checksum/chữ ký

## 2) Preconditions

- Backend chạy với API US16.
- Có user role Manager đăng nhập hợp lệ.
- Có dữ liệu tồn kho để sinh báo cáo.

## 3) Case Group A - Tạo báo cáo hợp lệ

1. Gọi POST /inventory-audit-reports với kỳ báo cáo hợp lệ.
2. Kỳ vọng:

- API 201.
- Trả report_id và status.
- report_id là UUID hợp lệ.

## 4) Case Group B - Validation

1. period_from > period_to.
2. Kỳ vọng: 400.

3. period_from không đúng định dạng date.
4. Kỳ vọng: 400.

## 5) Case Group C - RBAC

1. Gọi POST bằng role Operator.
2. Kỳ vọng: 403.

## 6) Case Group D - Query list/detail

1. GET /inventory-audit-reports với filter status=READY.
2. Kỳ vọng: 200, dữ liệu đúng filter.

3. GET /inventory-audit-reports/:id với id hợp lệ.
4. Kỳ vọng: 200.

5. GET /inventory-audit-reports/:id với id không tồn tại.
6. Kỳ vọng: 404.

## 7) Case Group E - Download PDF

1. GET /inventory-audit-reports/:id/download khi status READY.
2. Kỳ vọng:

- 200
- Content-Type = application/pdf
- Content-Disposition có filename .pdf

3. Download khi status chưa READY.
4. Kỳ vọng: 400.

## 8) Case Group F - Metadata integrity

1. Lấy detail report đã READY.
2. Kỳ vọng:

- Có file_sha256.
- Có signed_at.
- Có signature_provider.

3. Đảm bảo report FAILED có failure_reason.

## 9) Pass criteria

- Toàn bộ case A-F pass.
- PDF tải được với header chuẩn.
- Metadata checksum/chữ ký hiển thị đầy đủ cho report READY.

## 10) Execution record

- Backend build: [x] PASS / [ ] FAIL
- Unit test US16: [x] PASS / [ ] FAIL
- E2E test US16: [x] PASS / [ ] FAIL
- Frontend build: [x] PASS / [ ] FAIL
- Frontend smoke manual: [ ] PASS / [ ] FAIL
- Người test: GitHub Copilot
- Thời điểm test: 2026-04-04
- Ghi chú: FE đã tích hợp create/list/detail/download và polling trạng thái cho US16; cần QA xác nhận smoke manual trên môi trường tích hợp thực tế. Kiểm thử chữ ký số pháp định (PAdES/TSA) cần môi trường provider thực.
