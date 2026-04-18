# [Manager][US10] Frontend Plan - Điều chỉnh số lượng tồn kho

## Cập nhật trạng thái triển khai (04/04/2026)

Trạng thái thực hiện thực tế:

- FE-1 (Contract type + constants): DONE
- FE-2 (Service layer): DONE
- FE-3 (Form tạo adjustment bằng react-hook-form): DONE
- FE-4 (List + filter + detail): DONE
- FE-5 (Page + route + menu wiring): DONE
- FE-6 (Hardening + handoff): PARTIAL

Ghi chú FE-6:

- Đã hoàn tất build frontend và map lỗi theo status code chính.
- Smoke manual end-to-end trên môi trường chạy thật vẫn cần người dùng xác nhận cuối.

## 1) Mục tiêu

Triển khai giao diện frontend cho nghiệp vụ US10 để Manager có thể tạo, tra cứu và xem chi tiết phiếu điều chỉnh tồn kho, bám đúng contract backend đã bàn giao.

Kết quả mong đợi:

- Manager tạo được phiếu điều chỉnh với Reason Code bắt buộc.
- Hiển thị rõ kết quả điều chỉnh: quantity trước/sau và valuation delta.
- Có màn hình list/detail phục vụ tra cứu và kiểm toán.
- UX rõ ràng cho loading/empty/error, map đúng mã lỗi 400/403/404/409.

## 2) Cơ sở tích hợp đã có

Tài liệu backend đã sẵn:

- frontend/US10_MANAGER_INVENTORY_ADJUSTMENT_API_GUIDE.md
- frontend/US10_MANAGER_INVENTORY_ADJUSTMENT_SMOKE_CHECKLIST.md

API backend đã triển khai:

- POST /inventory-adjustments
- GET /inventory-adjustments
- GET /inventory-adjustments/:id

## 3) Hiện trạng frontend có thể tái sử dụng

- Hệ thống route Manager đã có khung và guard role.
- Các màn hình Manager đã có pattern list + filter + detail (tham khảo luồng worklist và transaction manager).
- Service layer đã có apiClient + pattern ApiError class để map status code.

Khoảng trống hiện tại:

- Chưa có type riêng cho Inventory Adjustment.
- Chưa có service wrapper cho 3 endpoint US10.
- Chưa có page UI cho create/list/detail adjustment.
- Chưa có route/menu cho màn hình US10.

## 4) Thiết kế UX đề xuất

## 4.1 Route và vị trí điều hướng

Đề xuất route chính:

- /manager/inventory-adjustments

Đề xuất placement:

- Thêm menu con dưới nhóm quản lý tồn kho, hoặc
- Tích hợp tab mới trong màn /manager/stock (khuyến nghị nếu muốn giảm thay đổi menu).

## 4.2 Bố cục màn hình

Màn hình 2 cột:

- Cột trái: Form tạo adjustment
  - lot_id
  - adjustment_quantity
  - reason_code
  - reason_note (bắt buộc khi OTHER)
  - unit_cost_snapshot
- Cột phải: Bảng lịch sử adjustment + filter
  - by reason_code
  - by lot_id/material_id
  - by date range

Khi chọn một dòng ở bảng:

- Mở panel detail read-only hiển thị:
  - quantity_before, quantity_after
  - valuation_before, valuation_after, valuation_delta
  - linked_transaction_id

## 4.3 Trạng thái UX bắt buộc

- Loading:
  - Spinner khi submit form
  - Skeleton hoặc loading row cho bảng
- Empty:
  - Thông điệp rõ ràng khi chưa có phiếu
- Error:
  - Inline validation cho form
  - Toast/banner cho lỗi API
- Success:
  - Toast thành công + refresh list tự động

## 5) Kế hoạch triển khai theo phase FE

## FE-1: Contract type và constants

Task:

- Tạo type InventoryAdjustmentReasonCode.
- Tạo type CreateInventoryAdjustmentRequest, InventoryAdjustmentItem, InventoryAdjustmentListResponse.
- Thêm API endpoint constants cho inventory-adjustments.

Deliverable:

- src/types/inventoryAdjustment.ts
- src/config/api.config.ts (bổ sung endpoint)

## FE-2: Service layer

Task:

- Thêm InventoryAdjustmentApiError.
- Tạo hàm:
  - createInventoryAdjustment(payload)
  - fetchInventoryAdjustments(params)
  - fetchInventoryAdjustmentDetail(adjustmentId)
- Chuẩn hóa parse lỗi theo status code.

Deliverable:

- src/services/inventoryAdjustmentService.ts

## FE-3: Form tạo adjustment

Task:

- Xây component form với validate client:
  - adjustment_quantity != 0
  - unit_cost_snapshot >= 0
  - reason_code bắt buộc
  - reason_code = OTHER thì reason_note >= 10 ký tự
- Submit POST API và hiển thị response summary.

Deliverable:

- src/components/manager/inventory-adjustment/InventoryAdjustmentForm.tsx

## FE-4: List + filter + detail

Task:

- Xây bảng list adjustment có paging.
- Tích hợp filter reason_code, lot_id, material_id, from/to.
- Mở panel detail khi click 1 dòng và gọi API detail.

Deliverable:

- src/components/manager/inventory-adjustment/InventoryAdjustmentTable.tsx
- src/components/manager/inventory-adjustment/InventoryAdjustmentDetailDrawer.tsx

## FE-5: Page + routing + menu wiring

Task:

- Tạo page Manager cho US10, compose form + table + detail.
- Gắn route /manager/inventory-adjustments.
- Cập nhật menu điều hướng Manager.

Deliverable:

- src/pages/manager/InventoryAdjustmentManager.tsx
- src/router/index.tsx
- src/layouts/MainLayout.tsx

## FE-6: Hardening + handoff

Task:

- Chặn submit trùng khi đang gửi request.
- Debounce filter text (nếu có search theo text).
- Validate from <= to trước khi gọi list API.
- Map lỗi backend:
  - 400: dữ liệu không hợp lệ
  - 403: không có quyền
  - 404: không tìm thấy lot/adjustment
  - 409: điều chỉnh làm âm tồn
- Hoàn tất smoke checklist và build frontend.

Deliverable:

- frontend/US10_MANAGER_INVENTORY_ADJUSTMENT_SMOKE_CHECKLIST.md (điền execution record)

## 6) Quy tắc validate phía frontend

- adjustment_quantity phải là số và khác 0.
- unit_cost_snapshot phải là số và >= 0.
- reason_code bắt buộc.
- nếu reason_code = OTHER thì reason_note bắt buộc và >= 10 ký tự.
- Query list:
  - page >= 1
  - 1 <= limit <= 100
  - from <= to
- adjustmentId phải đúng UUID trước khi gọi detail.

## 7) Mapping lỗi backend sang UX

- 400: Dữ liệu điều chỉnh không hợp lệ, vui lòng kiểm tra lại.
- 403: Bạn không có quyền thực hiện điều chỉnh tồn kho.
- 404: Không tìm thấy dữ liệu cần điều chỉnh.
- 409: Điều chỉnh không hợp lệ vì làm âm tồn kho.
- 500+: Hệ thống đang bận, vui lòng thử lại sau.

## 8) Test plan frontend

Positive:

- Tạo adjustment hợp lệ (DAMAGED) thành công.
- Tạo adjustment reason OTHER kèm reason_note hợp lệ thành công.
- List hiển thị đúng dữ liệu và phân trang.
- Mở detail hiển thị đúng before/after và valuation.

Negative:

- adjustment_quantity = 0 bị chặn ở client.
- unit_cost_snapshot âm bị chặn ở client.
- reason OTHER thiếu note bị chặn ở client.
- API trả 409 hiển thị đúng thông điệp.
- API trả 403 khi role không phải Manager hiển thị đúng thông điệp.

## 9) Definition of Done cho frontend US10

- Có màn hình Manager điều chỉnh tồn kho với form + list + detail.
- Tích hợp đầy đủ 3 API US10.
- Map lỗi đúng theo backend contract.
- Build frontend pass, không phát sinh lỗi TypeScript mới.
- Smoke checklist pass và có execution record.

## 10) Đề xuất thứ tự triển khai thực tế (2 ngày)

Ngày 1:

- FE-1, FE-2, FE-3

Ngày 2:

- FE-4, FE-5, FE-6
- Smoke test + fix nhỏ + handoff
