# [Manager][US10] - Kế hoạch phát triển backend điều chỉnh số lượng tồn kho

## 0) Cơ sở yêu cầu đã review lại từ 01_Documents

Nguồn chính:

- 01_Documents/04_Product Backlog.md (US10, nhóm Manager - Inventory Management)
- 01_Documents/Workflow.md (Action: Apply Inventory Adjustment)

US10 (P0):

- Quản lý cần điều chỉnh tồn kho để xử lý hỏng hóc, mất mát, chênh lệch kiểm kê.
- Acceptance Criteria:
  - Bắt buộc chọn hoặc nhập lý do (Reason Code) mới được lưu.
  - Hệ thống tự động tính toán lại tổng giá trị kho (Inventory Valuation).
  - Ghi nhận rõ loại giao dịch là Inventory Adjustment trong lịch sử.

## 1) Review hiện trạng backend liên quan

## 1.1 Thành phần đã có sẵn

- Module inventory transaction đã có transaction_type = Adjustment.
- Module inventory lot đã có quantity và luồng cập nhật số lượng.
- Cơ chế phân quyền theo role đã có ở guard/controller.
- Hạ tầng test service/repository đã sẵn để mở rộng.

## 1.2 Khoảng trống so với US10

- Chưa có API chuyên biệt cho nghiệp vụ điều chỉnh tồn kho của Manager.
- Chưa bắt buộc Reason Code cho Adjustment.
- Chưa có mô hình/tính toán Inventory Valuation ở backend.
- Chưa có chuẩn response/audit chuyên cho adjustment workflow.

## 2) Mục tiêu backend cho US10

Hoàn thành backend để Manager có thể:

- Tạo một phiếu điều chỉnh tồn kho có lý do bắt buộc.
- Tác động số lượng tồn kho một cách an toàn (không âm tồn ngoài quy định).
- Tự động ghi transaction loại Adjustment vào inventory history.
- Tự động cập nhật/tính lại tổng giá trị tồn kho sau điều chỉnh.

## 3) Thiết kế nghiệp vụ đề xuất

## 3.1 API đề xuất

1. POST /inventory-adjustments

- Role: Manager
- Input đề xuất:
  - lot_id
  - adjustment_quantity (âm hoặc dương, khác 0)
  - reason_code (enum hoặc free text theo policy)
  - reason_note (optional)
  - unit_cost_override (optional, dùng khi policy cho phép)
- Output:
  - adjustment_id
  - lot_before / lot_after
  - transaction_id (Adjustment)
  - valuation_before / valuation_after

2. GET /inventory-adjustments

- Role: Manager
- Filter: date range, lot_id, reason_code, performed_by
- Mục tiêu: phục vụ kiểm toán nội bộ và đối soát nhanh.

3. GET /inventory-adjustments/:id

- Role: Manager
- Trả chi tiết phiếu điều chỉnh + bản ghi transaction liên quan.

Ghi chú: Có thể triển khai Phase 1 chỉ với POST + GET detail, sau đó mở rộng list ở Phase 2.

## 3.2 Reason Code (bắt buộc)

Đề xuất danh mục reason_code ban đầu:

- DAMAGED
- LOST
- EXPIRED
- COUNT_CORRECTION
- SYSTEM_CORRECTION
- OTHER

Rule:

- reason_code bắt buộc.
- Nếu reason_code = OTHER thì reason_note bắt buộc (tối thiểu 10 ký tự).

## 3.3 Quy tắc cập nhật tồn kho

- adjustment_quantity phải khác 0.
- new_quantity = current_quantity + adjustment_quantity.
- Không cho phép new_quantity < 0 (trừ khi có policy override và audit riêng).
- Toàn bộ bước phải chạy trong transaction (Mongo session) để đảm bảo atomic:
  - đọc lot hiện tại
  - cập nhật quantity
  - ghi transaction Adjustment
  - ghi adjustment record
  - cập nhật valuation snapshot

## 3.4 Inventory Valuation (AC bắt buộc)

Hiện trạng chưa có trường cost chuẩn toàn hệ thống, nên đề xuất theo 2 bước:

- Bước ngắn hạn (đủ AC):
  - Lưu unit_cost_snapshot trên phiếu adjustment (bắt buộc từ material hoặc lot policy).
  - Tính total_value_delta = adjustment_quantity * unit_cost_snapshot.
  - Cập nhật inventory valuation summary theo material hoặc toàn kho.

- Bước trung hạn:
  - Chuẩn hóa nguồn cost (material master hoặc lot-level costing).
  - Định nghĩa rõ phương pháp định giá: Moving Average/FIFO/Standard Cost.

## 3.5 Audit và traceability

Mỗi adjustment cần lưu:

- ai thực hiện (performed_by)
- thời điểm
- số lượng trước/sau
- lý do
- transaction_id liên kết
- valuation delta

Mục tiêu: truy ngược đầy đủ phục vụ thanh tra/kiểm toán.

## 4) Thiết kế dữ liệu đề xuất

## 4.1 Collection mới: inventory_adjustments

Trường chính đề xuất:

- adjustment_id (UUID)
- lot_id
- material_id (denormalize để filter/report nhanh)
- adjustment_quantity
- quantity_before
- quantity_after
- reason_code
- reason_note
- unit_cost_snapshot
- valuation_delta
- performed_by
- approved_by (nếu tách bước duyệt)
- created_date, modified_date
- linked_transaction_id

Index đề xuất:

- adjustment_id unique
- lot_id + created_date
- material_id + created_date
- reason_code + created_date
- performed_by + created_date

## 4.2 Mở rộng inventory_transactions

Cho transaction_type = Adjustment, bổ sung metadata:

- adjustment_reason_code
- adjustment_id (reference mềm)

Mục tiêu: màn hình history nhìn vào transaction đã thấy rõ đây là Inventory Adjustment có lý do.

## 5) Kế hoạch triển khai theo phase

## Phase 1 - Contract + validation + RBAC

Task:

- Tạo DTO CreateInventoryAdjustmentDto, QueryInventoryAdjustmentDto.
- Tạo controller/service/repository cho inventory-adjustment.
- Bật role Manager cho endpoint POST adjustment.
- Validate reason_code bắt buộc, adjustment_quantity != 0.

Deliverable:

- API adjustment chạy được với validation rõ ràng.

## Phase 2 - Cập nhật tồn kho + ghi transaction Adjustment

Task:

- Triển khai luồng atomic cập nhật lot quantity.
- Ghi inventory transaction loại Adjustment liên kết adjustment_id.
- Chuẩn hóa thông điệp lỗi (400/404/409).

Deliverable:

- Điều chỉnh tồn kho thành công và có lịch sử giao dịch chuẩn.

## Phase 3 - Tính Inventory Valuation

Task:

- Tính valuation delta khi adjustment.
- Cập nhật snapshot tổng giá trị kho (theo policy ngắn hạn).
- Bổ sung endpoint trả valuation_before/valuation_after trong response detail.

Deliverable:

- Đáp ứng acceptance criteria về tự động tính lại tổng giá trị kho.

## Phase 4 - Query, reporting, và audit completeness

Task:

- Bổ sung API list/filter adjustment.
- Tối ưu index cho lọc theo thời gian/lý do/lot.
- Hoàn thiện mapping field cho kiểm toán.

Deliverable:

- Manager tra cứu adjustment nhanh và đủ thông tin kiểm toán.

## Phase 5 - Test + handoff

Task:

- Unit test:
  - reason_code bắt buộc
  - OTHER yêu cầu reason_note
  - không cho adjustment làm tồn âm
  - transaction + adjustment + valuation được ghi đồng bộ
- Integration/e2e test:
  - role Manager mới được điều chỉnh
  - response chứa linked transaction và valuation delta
- Viết tài liệu API handoff cho frontend.

Deliverable:

- Test pass, tài liệu rõ ràng để FE triển khai.

## 6) Danh sách file backend dự kiến thay đổi

Dự kiến tạo mới:

- src/inventory-adjustment/inventory-adjustment.controller.ts
- src/inventory-adjustment/inventory-adjustment.service.ts
- src/inventory-adjustment/inventory-adjustment.repository.ts
- src/inventory-adjustment/dto/create-inventory-adjustment.dto.ts
- src/inventory-adjustment/dto/query-inventory-adjustment.dto.ts
- src/schemas/inventory-adjustment.schema.ts

Dự kiến cập nhật:

- src/inventory-lot/inventory-lot.service.ts
- src/inventory-transaction/inventory-transaction.service.ts
- src/inventory-transaction/inventory-transaction.repository.ts
- src/inventory-transaction/dto/create-inventory-transaction.dto.ts (nếu thêm metadata adjustment)
- src/database/database.module.ts hoặc module wiring tương ứng
- test/*.spec.ts và test/*.e2e-spec.ts liên quan

## 7) Rủi ro và hướng giảm thiểu

- Rủi ro thiếu nguồn cost chuẩn để tính valuation chính xác:
  - Giảm thiểu: chốt policy cost tạm thời ngay từ Phase 1, lưu snapshot cost vào adjustment.

- Rủi ro race condition khi nhiều adjustment cùng lot:
  - Giảm thiểu: dùng transaction + optimistic check theo modified_date/version.

- Rủi ro sai lệch dữ liệu lịch sử:
  - Giảm thiểu: bắt buộc linked_transaction_id và audit field đầy đủ.

## 8) Definition of Done cho backend US10

US10 backend được xem là hoàn thành khi:

- Manager tạo được phiếu điều chỉnh với Reason Code bắt buộc.
- Tồn kho được cập nhật an toàn, không phát sinh âm tồn trái policy.
- Hệ thống ghi transaction loại Adjustment rõ ràng trong lịch sử.
- Inventory Valuation được tính/cập nhật tự động sau mỗi adjustment.
- Unit test + integration/e2e test pass.
- Có tài liệu API sẵn sàng handoff cho frontend.
