# [Manager][US16] Frontend Plan - Xuất báo cáo kiểm kê

## Cập nhật trạng thái triển khai (04/04/2026)

Trạng thái thực hiện hiện tại:

- FE-1 (Contract type + constants): DONE
- FE-2 (Service layer): DONE
- FE-3 (Màn hình tạo yêu cầu báo cáo): DONE
- FE-4 (Danh sách + bộ lọc + chi tiết): DONE
- FE-5 (Tải PDF + theo dõi trạng thái): DONE
- FE-6 (Hardening + test + handoff): PARTIAL

Ghi chú FE-6:

- Đã hoàn tất hardening phía UI: chống thao tác lặp, debounce filter requested_by, hạn chế đua request list/detail.
- Đã build frontend thành công sau khi tích hợp US16.
- Smoke manual end-to-end trên môi trường chạy thật vẫn cần xác nhận cuối từ QA/PO.

## 1) Mục tiêu

Triển khai giao diện frontend cho nghiệp vụ US16 để Manager có thể:

- Tạo yêu cầu xuất báo cáo kiểm kê theo kỳ.
- Theo dõi trạng thái xử lý báo cáo (PENDING/PROCESSING/READY/FAILED).
- Xem danh sách và chi tiết metadata phục vụ kiểm toán.
- Tải file PDF khi báo cáo đã sẵn sàng.

Kết quả mong đợi:

- Luồng tạo và tải báo cáo hoạt động ổn định theo đúng contract backend.
- Trạng thái xử lý hiển thị rõ ràng, có cơ chế polling tự động.
- Map lỗi nhất quán theo mã 400/403/404/5xx.

## 2) Cơ sở tích hợp đã có

Tài liệu backend đã sẵn:

- frontend/US16_MANAGER_EXPORT_INVENTORY_AUDIT_REPORT_API_GUIDE.md
- frontend/US16_MANAGER_EXPORT_INVENTORY_AUDIT_REPORT_SMOKE_CHECKLIST.md

API backend đã triển khai:

- POST /inventory-audit-reports
- GET /inventory-audit-reports
- GET /inventory-audit-reports/:id
- GET /inventory-audit-reports/:id/download

## 3) Hiện trạng frontend có thể tái sử dụng

Các thành phần có thể tận dụng:

- Router Manager đã có route /manager/reports.
- Sidebar Manager đã có menu Báo cáo.
- Service layer đã có apiClient và pattern ApiError.
- Pattern form/list/filter đã có ở các luồng US10, US24, US26.

Khoảng trống hiện tại:

- Chưa có type riêng cho Inventory Audit Report.
- Chưa có endpoint constants cho US16 trong API config.
- Chưa có service wrapper cho 4 endpoint US16.
- Trang Báo cáo Manager hiện đang là ComingSoon.

## 4) Thiết kế UX đề xuất

## 4.1 Route và điều hướng

Phương án khuyến nghị:

- Giữ route /manager/reports cho màn hình US16 để không tăng độ phức tạp menu.

Phương án mở rộng (nếu cần tách module báo cáo):

- /manager/reports/inventory-audit

## 4.2 Bố cục màn hình

Màn hình chia thành 3 khối chính:

- Khối A: Form tạo yêu cầu báo cáo
  - period_from
  - period_to
  - scope_warehouse_ids (tùy chọn)
  - include_zero_balance
  - report_template_code
  - signer_profile_id
  - note
  - approved_by
- Khối B: Bảng danh sách báo cáo
  - report_id
  - period_from/period_to
  - status
  - summary_total_items
  - summary_total_quantity
  - requested_by
  - created_date
- Khối C: Panel chi tiết báo cáo
  - file_sha256
  - signature_provider
  - signed_at
  - failure_reason
  - nút tải PDF khi status = READY

## 4.3 Trạng thái UX bắt buộc

- Loading:
  - Spinner khi submit tạo báo cáo.
  - Skeleton cho bảng danh sách và panel chi tiết.
- Empty:
  - Thông báo rõ khi chưa có báo cáo.
- Error:
  - Inline validation cho form.
  - Banner/toast khi gọi API thất bại.
- Success:
  - Toast tạo báo cáo thành công.
  - Tự động refresh danh sách và focus vào báo cáo mới.

## 5) Kế hoạch triển khai theo phase FE

## FE-1: Contract type và constants

Task:

- Tạo type InventoryAuditReportStatus.
- Tạo type CreateInventoryAuditReportRequest.
- Tạo type InventoryAuditReportItem, InventoryAuditReportListResponse.
- Bổ sung constants endpoint US16 vào API config.

Deliverable:

- src/types/inventoryAuditReport.ts
- src/config/api.config.ts (bổ sung INVENTORY_AUDIT_REPORTS)

## FE-2: Service layer

Task:

- Tạo InventoryAuditReportApiError.
- Tạo các hàm:
  - createInventoryAuditReport(payload)
  - fetchInventoryAuditReports(params)
  - fetchInventoryAuditReportDetail(reportId)
  - downloadInventoryAuditReport(reportId)
- Chuẩn hóa parse lỗi theo status code.

Deliverable:

- src/services/inventoryAuditReportService.ts

## FE-3: Form tạo yêu cầu báo cáo

Task:

- Tạo form với validate phía client:
  - period_from và period_to bắt buộc.
  - period_from <= period_to.
  - report_template_code tối đa 50 ký tự.
  - approved_by tối đa 50 ký tự.
  - note tối đa 500 ký tự.
- Submit POST API và hiển thị kết quả tạo report_id.

Deliverable:

- src/components/manager/inventory-audit-report/InventoryAuditReportCreateForm.tsx

## FE-4: Danh sách + bộ lọc + chi tiết

Task:

- Tạo bảng danh sách có phân trang.
- Tích hợp bộ lọc:
  - status
  - requested_by
  - from/to
- Click một dòng để mở panel chi tiết và gọi API detail.

Deliverable:

- src/components/manager/inventory-audit-report/InventoryAuditReportTable.tsx
- src/components/manager/inventory-audit-report/InventoryAuditReportDetailPanel.tsx

## FE-5: Tải PDF + theo dõi trạng thái

Task:

- Thêm nút tải PDF chỉ bật khi status = READY.
- Gọi endpoint download và xử lý file binary.
- Poll trạng thái định kỳ cho các báo cáo đang PENDING/PROCESSING.
- Dừng polling khi trạng thái chuyển READY hoặc FAILED.

Deliverable:

- Logic polling trong page/container US16.
- Luồng download hoàn chỉnh cho báo cáo READY.

## FE-6: Page + route wiring + hardening + handoff

Task:

- Thay nội dung ComingSoon của route /manager/reports bằng màn hình US16.
- Chặn bấm submit lặp khi request đang chạy.
- Debounce filter requested_by.
- Map lỗi backend:
  - 400: Tham số báo cáo không hợp lệ.
  - 403: Không có quyền Manager.
  - 404: Không tìm thấy báo cáo.
  - 5xx: Lỗi hệ thống.
- Hoàn tất smoke checklist và build frontend.

Deliverable:

- src/pages/manager/Reports.tsx (hoặc page mới và cập nhật router)
- frontend/US16_MANAGER_EXPORT_INVENTORY_AUDIT_REPORT_SMOKE_CHECKLIST.md (cập nhật execution record)

## 6) Quy tắc validate phía frontend

- period_from và period_to là ISO date hợp lệ.
- period_from không được lớn hơn period_to.
- page >= 1.
- 1 <= limit <= 100.
- report_id phải đúng định dạng UUID trước khi gọi detail/download.
- Các trường text optional phải trim trước khi gửi API.

## 7) Mapping lỗi backend sang UX

- 400: Dữ liệu yêu cầu báo cáo không hợp lệ, vui lòng kiểm tra lại.
- 403: Bạn không có quyền xuất báo cáo kiểm kê.
- 404: Không tìm thấy báo cáo kiểm kê.
- 500+: Hệ thống đang bận, vui lòng thử lại sau.

## 8) Test plan frontend

Positive:

- Tạo yêu cầu báo cáo hợp lệ thành công.
- Danh sách hiển thị đúng theo filter status.
- Mở chi tiết báo cáo thành công.
- Báo cáo READY tải PDF thành công.

Negative:

- period_from > period_to bị chặn ở client.
- User không phải Manager nhận 403.
- Tải báo cáo khi status chưa READY hiển thị thông điệp phù hợp.
- report_id không tồn tại hiển thị lỗi 404.

## 9) Definition of Done cho frontend US16

- Có giao diện đầy đủ create/list/detail/download cho US16.
- Tích hợp đúng 4 API theo contract backend.
- Có polling trạng thái cho báo cáo đang xử lý.
- Map lỗi đúng và nhất quán trải nghiệm người dùng.
- Frontend build pass, không phát sinh lỗi TypeScript mới.
- Smoke checklist cập nhật đầy đủ kết quả chạy.

## 10) Đề xuất thứ tự triển khai thực tế (2 ngày)

Ngày 1:

- FE-1, FE-2, FE-3

Ngày 2:

- FE-4, FE-5, FE-6
- Smoke test, fix nhỏ, handoff cho QA
