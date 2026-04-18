# [Manager][US16] - Kế hoạch phát triển backend xuất báo cáo kiểm kê

## Cập nhật trạng thái triển khai (04/04/2026)

Trạng thái thực hiện thực tế:

- Phase 1 (Contract API + Model dữ liệu): DONE
- Phase 2 (Data aggregation + Snapshot): DONE
- Phase 3 (Render PDF + ký số): DONE
- Phase 4 (Download + Audit + Hardening): DONE
- Phase 5 (Test + Handoff FE/QA): DONE

Artifact phase 5 đã bổ sung:

- Unit test: src/inventory-audit-report/inventory-audit-report.service.spec.ts
- E2E test: test/us16-manager-inventory-audit-report.e2e-spec.ts
- FE handoff API guide: frontend/US16_MANAGER_EXPORT_INVENTORY_AUDIT_REPORT_API_GUIDE.md
- FE smoke checklist: frontend/US16_MANAGER_EXPORT_INVENTORY_AUDIT_REPORT_SMOKE_CHECKLIST.md

## 1. Bối cảnh và mục tiêu

Theo Product Backlog, US16 yêu cầu:

- Quản lý xuất báo cáo kiểm kê chính thức phục vụ kiểm toán/thanh tra.
- Báo cáo theo biểu mẫu kiểm kê hàng tồn kho pháp định.
- Tích hợp chữ ký số trong file PDF để đảm bảo tính xác thực.
- File báo cáo sau khi xuất không thể chỉnh sửa nội dung.

Mục tiêu backend:

- Sinh báo cáo kiểm kê từ dữ liệu đã chốt kiểm kê (US15).
- Xuất định dạng PDF chuẩn biểu mẫu.
- Ký số tài liệu (hoặc ký server-side theo chứng thư cấu hình).
- Lưu bản phát hành bất biến để truy xuất và đối soát.

---

## 2. Phạm vi triển khai backend

Trong phạm vi US16 backend sẽ bao gồm:

- API tạo yêu cầu xuất báo cáo kiểm kê.
- API lấy trạng thái tiến trình tạo báo cáo.
- API tải báo cáo PDF đã ký số.
- API tra cứu lịch sử báo cáo đã phát hành.
- Lưu metadata báo cáo để audit trail.

Ngoài phạm vi (đề xuất tách phase sau):

- Dashboard phân tích chuyên sâu (thuộc US17).
- Ký số bằng thiết bị USB token phía client.
- Mẫu biểu đặc thù theo từng địa phương (custom template động).

---

## 3. Nguồn dữ liệu đầu vào

Nguồn dữ liệu chính để tổng hợp báo cáo:

- inventory_lots: số lượng tồn theo lô.
- materials: thông tin vật tư, đơn vị tính, phân loại.
- warehouses + storage_locations: phạm vi kiểm kê theo kho/vị trí.
- inventory_transactions: lịch sử biến động để đối soát khi cần.
- inventory_adjustments (US10): các chênh lệch đã điều chỉnh.
- inventory_valuation_summaries: tổng giá trị tồn kho theo vật tư.

Điều kiện đầu vào bắt buộc:

- Chỉ cho phép xuất báo cáo từ kỳ kiểm kê đã khóa/chốt dữ liệu.
- Có thông tin người duyệt/ban hành báo cáo.

---

## 4. Thiết kế API đề xuất

### 4.1 POST /inventory-audit-reports

Mục đích:

- Tạo yêu cầu sinh báo cáo kiểm kê.

Quyền:

- Manager.

Request (đề xuất):

- period_from, period_to
- warehouse_ids (optional, nếu xuất theo phạm vi kho)
- include_zero_balance (boolean)
- report_template_code (ví dụ: STATUTORY_V1)
- signer_profile_id (hồ sơ chữ ký số)
- note (optional)

Response:

- report_id
- status: PENDING | PROCESSING | READY | FAILED
- requested_by
- requested_at

### 4.2 GET /inventory-audit-reports

Mục đích:

- Tra cứu danh sách báo cáo đã tạo.

Filter:

- status, period_from, period_to, requested_by, created_date range

### 4.3 GET /inventory-audit-reports/:id

Mục đích:

- Xem chi tiết báo cáo và metadata ký số.

### 4.4 GET /inventory-audit-reports/:id/download

Mục đích:

- Tải file PDF đã ký số.

Rule:

- Chỉ cho tải khi status = READY.

---

## 5. Thiết kế dữ liệu

## 5.1 Collection mới: inventory_audit_reports

Trường đề xuất:

- report_id (UUID, unique)
- period_from, period_to
- scope_warehouse_ids: string[]
- report_template_code
- status: PENDING | PROCESSING | READY | FAILED
- summary_total_items
- summary_total_quantity
- summary_total_value
- file_storage_key (đường dẫn object storage)
- file_sha256 (checksum để kiểm chứng bất biến)
- pdf_version
- signed_at
- signature_provider
- signature_serial_number
- signature_valid_from, signature_valid_to
- requested_by
- approved_by
- failure_reason
- created_date, modified_date

Index đề xuất:

- report_id unique
- status + created_date
- requested_by + created_date
- period_from + period_to

## 5.2 Bảng dữ liệu tạm (nếu cần)

Nếu khối lượng dữ liệu lớn, dùng job pipeline và snapshot trung gian:

- inventory_audit_report_snapshots
- Chứa dữ liệu đã chuẩn hóa trước khi render PDF.

---

## 6. Quy trình nghiệp vụ backend

1. Manager gửi yêu cầu xuất báo cáo.
2. Hệ thống validate kỳ kiểm kê đã chốt.
3. Sinh snapshot dữ liệu kiểm kê tại thời điểm xuất.
4. Render PDF theo template pháp định.
5. Ký số PDF bằng cấu hình signer_profile_id.
6. Tính checksum SHA-256 cho file sau ký.
7. Lưu file vào object storage ở chế độ chỉ đọc.
8. Cập nhật metadata báo cáo sang READY.
9. Ghi audit log đầy đủ.

Khi lỗi:

- Chuyển status FAILED.
- Lưu failure_reason để hỗ trợ điều tra.

---

## 7. Bảo mật và tính bất biến

Yêu cầu bắt buộc:

- RBAC: chỉ Manager được tạo/tải báo cáo kiểm kê chính thức.
- Chỉ chấp nhận tải file đã ký số hợp lệ.
- Sau khi READY, không cho ghi đè cùng report_id.
- File lưu trữ với quyền chỉ đọc (WORM nếu hạ tầng hỗ trợ).
- Bắt buộc checksum để phát hiện thay đổi nội dung.

Khuyến nghị kỹ thuật:

- Ký số theo chuẩn PAdES cho PDF.
- Đóng dấu thời gian (timestamp authority) nếu có.

---

## 8. Kế hoạch triển khai theo phase

## Phase 1 - Contract API + Model dữ liệu

Task:

- Tạo module inventory-audit-report.
- Tạo DTO request/response và schema inventory_audit_reports.
- Tạo endpoint POST/GET list/GET detail.

Deliverable:

- API contract ổn định, lưu được metadata báo cáo.

## Phase 2 - Data aggregation + Snapshot

Task:

- Viết service tổng hợp dữ liệu kiểm kê theo kỳ và phạm vi kho.
- Chuẩn hóa dữ liệu đầu ra theo template pháp định.

Deliverable:

- Snapshot dữ liệu kiểm kê chính xác để render.

## Phase 3 - Render PDF + ký số

Task:

- Tạo renderer PDF theo template chuẩn.
- Tích hợp provider ký số server-side.
- Tính và lưu checksum SHA-256.

Deliverable:

- Sinh được file PDF đã ký số, không thể chỉnh sửa hợp lệ.

## Phase 4 - Download + Audit + Hardening

Task:

- Endpoint download bảo mật.
- Ghi log đầy đủ cho mọi thao tác tạo/tải.
- Cơ chế retry khi job render/ký số thất bại.

Deliverable:

- Luồng vận hành ổn định trong môi trường staging.

## Phase 5 - Test + UAT + handoff

Task:

- Unit test cho service tổng hợp dữ liệu.
- Integration test cho pipeline tạo báo cáo.
- E2E test cho RBAC, download, checksum, signature metadata.
- Handoff tài liệu cho FE và QA.

Deliverable:

- Bộ test xanh và checklist nghiệm thu đầy đủ.

---

## 9. Danh sách file backend dự kiến tạo/sửa

Tạo mới:

- src/inventory-audit-report/inventory-audit-report.module.ts
- src/inventory-audit-report/inventory-audit-report.controller.ts
- src/inventory-audit-report/inventory-audit-report.service.ts
- src/inventory-audit-report/inventory-audit-report.repository.ts
- src/inventory-audit-report/dto/create-inventory-audit-report.dto.ts
- src/inventory-audit-report/dto/query-inventory-audit-report.dto.ts
- src/schemas/inventory-audit-report.schema.ts
- src/inventory-audit-report/pdf/inventory-audit-report.renderer.ts
- src/inventory-audit-report/signature/signature.service.ts

Cập nhật:

- src/app.module.ts (đăng ký module mới)
- src/auth/roles mapping (nếu cần mở rộng scope quyền)

---

## 10. Tiêu chí nghiệm thu (Definition of Done)

Hoàn thành US16 khi:

- Manager tạo được báo cáo kiểm kê theo kỳ.
- Báo cáo PDF đúng biểu mẫu, có metadata chữ ký số.
- File tải xuống có checksum trùng metadata lưu DB.
- Không thể chỉnh sửa nội dung sau phát hành (xác minh bằng chữ ký + checksum).
- Có đầy đủ audit log tạo, ký, tải báo cáo.
- Test unit/integration/e2e đạt theo ngưỡng của dự án.

---

## 11. Rủi ro và phương án giảm thiểu

Rủi ro:

- Khác biệt template pháp định theo thời điểm ban hành.
- Tích hợp chữ ký số phụ thuộc hạ tầng chứng thư.
- Dữ liệu kiểm kê lớn có thể làm chậm render PDF.

Giảm thiểu:

- Version hóa template report.
- Chuẩn bị mock signer cho môi trường dev/test.
- Chuyển render sang job nền và cache snapshot.

---

## 12. Kế hoạch phối hợp FE/QA

Backend cung cấp cho FE:

- API contract và ví dụ response.
- Quy tắc trạng thái báo cáo.
- Cơ chế polling tiến trình hoặc websocket event.

Backend phối hợp QA:

- Bộ test case chữ ký số hợp lệ/không hợp lệ.
- Test case tải lại báo cáo cũ và đối chiếu checksum.
- Test case phân quyền chặt cho Manager.

---

Ngày cập nhật: 04/04/2026
Chủ sở hữu: Backend Team
Trạng thái: Draft để review nội bộ
