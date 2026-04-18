# [Operator][US24] - Kế hoạch triển khai tạo phiếu nhập/xuất kho điện tử (Backend)

## 1) Cơ sở yêu cầu đã đọc từ 01_Documents

- 01_Documents/04_Product Backlog.md:
  - US24 (P0): Operator tạo phiếu nhập/xuất kho điện tử.
  - Acceptance Criteria:
    - Hỗ trợ Scan-to-fill (quét mã vạch để tự động điền thông tin).
    - Hỗ trợ chụp/đính kèm chứng từ (hóa đơn, phiếu giao hàng).
    - Số lượng phải > 0, trạng thái mặc định là "Chờ xác nhận".
- 01_Documents/01_Business Cases.md:
  - Luồng Operator receiving, dispatch, ad-hoc receipt, chứng từ giấy khi offline.
- 01_Documents/Workflow.md:
  - Mỗi biến động tồn kho phải track được qua Inventory Transaction.
- 01_Documents/02_Domain Model.md:
  - InventoryLot + InventoryTransaction là trực truy vết.
- 01_Documents/UserInterface.md:
  - Màn hình Import/Export/Handling Incoming Goods/Warehouse Dispatch/Create Order cho Operator.

## 1.1) Quyết định đã chốt

- Tên miền nghiệp vụ: import-export-order
- Nơi lưu chứng từ: Local disk (POC)
- Nguồn barcode chuẩn: Tự chọn cho phù hợp (ưu tiên giải theo lot trước, rồi đến material)

## 2) Hiện trạng backend (codebase hiện tại)

- Đã có module transaction: src/inventory-transaction
  - Route hiện tại: /transactions
  - Role hiện tại: Manager + QC Technician (chưa cho Operator tạo)
  - Chưa có khái niệm "Phiếu nhập/xuất" tách biệt với transaction
- Đã có module lot: src/inventory-lot
  - Tạo lot thì tự động sinh Receipt transaction ngay
- Chưa có:
  - Module upload file/chụp chứng từ (multipart)
  - Endpoint scan-to-fill cho barcode
  - Trạng thái "Chờ xác nhận" dành riêng cho phiếu nhập/xuất

## 3) Mục tiêu kỹ thuật cho US24

Hoàn thành backend cho phép Operator tạo phiếu nhập/xuất kho điện tử ở trạng thái Chờ xác nhận, có scan-to-fill, có đính kèm chứng từ, và có validate số lượng > 0.

Lưu ý phạm vi:

- US24 chỉ dùng ở bước tạo phiếu (pending).
- Nghiệp vụ xác nhận cập nhật tồn kho realtime để dành cho US25/US12.

## 4) Thiết kế đề xuất

## 4.1 Mô hình dữ liệu mới

Tạo module mới: import-export-order

Schema đề xuất: src/schemas/import-export-order.schema.ts

- order_id: string (uuid)
- order_type: enum [Inbound, Outbound]
- status: enum [PendingConfirmation, Confirmed, Rejected]
  - mặc định: PendingConfirmation
- warehouse_id: string (hoặc storage_location chính)
- reason: string (lý do nhập/xuất)
- reference_number: string (số phiếu/số đơn)
- created_by: string
- created_date, modified_date
- items: array
  - material_id: string
  - lot_id: string? (có thể chưa có khi inbound mới)
  - quantity: number (>0)
  - unit_of_measure: string
  - expected_location: string?
- attachments: array
  - file_id: string
  - original_name: string
  - mime_type: string
  - size_bytes: number
  - url: string
  - source: enum [camera, upload]
  - uploaded_by: string
  - uploaded_at: date

Chỉ mục index:

- order_id unique
- status + created_date
- created_by + created_date
- order_type + status

## 4.2 API đề xuất

Base route: /import-export-orders

- POST /import-export-orders
  - Operator tạo phiếu inbound/outbound
  - Xác thực:
    - items không rỗng
    - từng item.quantity > 0
    - status auto = PendingConfirmation
- GET /import-export-orders
  - Lọc theo status, type, created_by, date range
  - Mặc định Operator chỉ thấy phiếu của mình
- GET /import-export-orders/:id
  - Xem chi tiết phiếu
- PATCH /import-export-orders/:id
  - Cho sửa khi status = PendingConfirmation
- POST /import-export-orders/:id/attachments
  - Upload ảnh/PDF chứng từ
  - Giới hạn <= 5MB/file
  - MIME cho phép: image/jpeg, image/png, application/pdf
- POST /import-export-orders/scan/resolve
  - Input: scan_code
  - Resolve theo ưu tiên:
    - inventory_lots.lot_id
    - inventory_lots.manufacturer_lot
    - materials.material_id
    - materials.part_number
  - Output: dữ liệu để auto-fill item form

## 4.3 Quy tắc nghiệp vụ cần khóa chặt

- Tạo phiếu inbound/outbound KHÔNG cập nhật tồn kho ngay.
- Chỉ tạo InventoryTransaction khi phiếu được xác nhận ở US25/US12.
- Outbound:
  - Có thể cảnh báo nếu lot đang Rejected/Depleted.
  - Hard check tồn kho sẽ đặt ở bước confirm (US25), không block bước tạo phiếu US24.

## 5) Kế hoạch implement theo phase

## Phase 1 - Đặt nền dữ liệu + module

Mục tiêu: Có module import-export-order có CRUD cơ bản và validate US24.

Trạng thái: DONE

Task:

- Tạo folder: src/import-export-order
- Tạo files:
  - import-export-order.module.ts
  - import-export-order.controller.ts
  - import-export-order.service.ts
  - import-export-order.repository.ts
  - dto/create-import-export-order.dto.ts
  - dto/update-import-export-order.dto.ts
  - dto/query-import-export-order.dto.ts
- Tạo schema: src/schemas/import-export-order.schema.ts
- Đăng ký module vào src/app.module.ts

Kết quả mong đợi:

- POST tạo phiếu thành công với status = PendingConfirmation.
- quantity <= 0 bị reject 400.

## Phase 2 - Role và bảo mật

Mục tiêu: dùng role theo US24.

Trạng thái: DONE

Task:

- Gán @Roles(UserRole.OPERATOR, UserRole.MANAGER) cho create.
- GET list:
  - Operator: chỉ dữ liệu của chính mình (created_by)
  - Manager: xem toàn bộ
- Ghi log action tạo/sửa phiếu để phục vụ trace.

Kết quả đã thực hiện:

- Đã gán role Operator/Manager cho create, list, detail, update của import-export-order.
- Đã áp quy tắc giới hạn dữ liệu theo created_by cho Operator ở list/detail/update.
- Đã thêm log action khi tạo và cập nhật phiếu tại service.

Kết quả mong đợi:

- Operator không xem/ghi đè của người khác nếu không có quyền.

## Phase 3 - Chứng từ đính kèm (camera/upload)

Mục tiêu: đáp ứng tiêu chí chứng từ.

Trạng thái: DONE

Task:

- Thêm upload endpoint vào import-export-order.controller.ts
- Cấu hình Multer (disk storage ban đầu): uploads/import-export-orders
- Validate type + size <= 5MB
- Lưu metadata vào attachments trong order

Kết quả đã thực hiện:

- Đã thêm endpoint POST /import-export-orders/:id/attachments.
- Đã cấu hình Multer lưu local disk tại uploads/import-export-orders.
- Đã validate MIME: image/jpeg, image/png, application/pdf; giới hạn kích thước 5MB/file.
- Đã lưu metadata attachment vào attachments của phiếu.
- Đã giới hạn chỉ cho phép đính kèm khi phiếu còn PendingConfirmation và người dùng có quyền truy cập phiếu.

Kết quả mong đợi:

- Có thể đính kèm ảnh/PDF vào phiếu pending.
- File không hợp lệ trả lời rõ ràng.

## Phase 4 - Scan-to-fill

Mục tiêu: đáp ứng tiêu chí quét mã vạch.

Trạng thái: DONE

Task:

- Tạo endpoint resolve scan code.
- Truy vấn lot/material để trả về payload auto-fill.
- Chuẩn hóa response gồm: material_id, lot_id, material_name, uom, gợi ý location.

Kết quả đã thực hiện:

- Đã thêm endpoint POST /import-export-orders/scan/resolve.
- Đã resolve barcode theo thứ tự ưu tiên đã chốt:
  - inventory_lots.lot_id
  - inventory_lots.manufacturer_lot
  - materials.material_id
  - materials.part_number
- Đã chuẩn hóa payload auto-fill gồm material_id, lot_id, material_name, unit_of_measure, expected_location.
- Đã bổ sung thông tin lot snapshot (status, quantity, manufacturer_lot) và warnings nếu lot đang Rejected/Depleted.
- Trường hợp không tìm thấy trả về resolved=false để frontend xử lý luồng quét liên tục.

Kết quả mong đợi:

- Frontend gọi 1 endpoint là lấy đủ thông tin điền form.

## Phase 5 - Test và quality gate

Mục tiêu: đảm bảo không vi phạm logic hiện có.

Trạng thái: DONE (có ghi nhận baseline regression ngoài phạm vi US24)

Unit tests:

- import-export-order.service.spec.ts
  - create pending success
  - quantity <= 0 fail
  - non-pending attach fail (rule US24)
  - scan resolve success/fail

E2E tests:

- test/us24-import-export-order.e2e-spec.ts
  - Operator tạo phiếu inbound pending
  - Operator tạo phiếu outbound pending
  - upload chứng từ hợp lệ
  - upload chứng từ > 5MB bị từ chối
  - role access control

Regression cần check:

- src/inventory-lot/inventory-lot.service.ts (auto Receipt khi tạo lot)
- src/inventory-transaction/inventory-transaction.service.ts (không bị thay đổi trái phạm vi US24)

Kết quả đã thực hiện:

- Đã thêm unit test mới: src/import-export-order/import-export-order.service.spec.ts.
- Đã thêm e2e test mới: test/us24-import-export-order.e2e-spec.ts.
- Đã chạy pass:
  - npm test -- src/import-export-order/import-export-order.service.spec.ts --runInBand
  - npm run test:e2e -- --testPathPatterns=us24-import-export-order.e2e-spec.ts --runInBand
- Regression check hiện trạng:
  - src/inventory-transaction/inventory-transaction.service.spec.ts: FAIL do lỗi cấu hình Jest với uuid (ESM), không liên quan logic US24.
  - src/unit-test/inventory-lot.service.spec.ts: FAIL 2 test searchByManufacturer do method không tồn tại trong service hiện tại, không liên quan thay đổi US24.

## 6) Danh sách file dự kiến thay đổi

Tạo mới:

- src/import-export-order/\*
- src/schemas/import-export-order.schema.ts
- test/us24-import-export-order.e2e-spec.ts

Cập nhật:

- src/app.module.ts
- src/schemas/index (nếu project đang có export tập trung)
- src/auth/guards hoặc service để bổ sung policy list theo created_by

## 7) Milestone thực thi đề xuất

- M1 (0.5 ngày): Schema + DTO + repository
- M2 (0.5 ngày): Service + controller CRUD + RBAC
- M3 (0.5 ngày): Upload attachments + validate
- M4 (0.5 ngày): Scan resolve endpoint
- M5 (0.5 ngày): Unit/E2E tests + fix regression

Tổng: ~2.5 ngày dev

## 8) Rủi ro và điểm cần chốt trước khi code

- Đã chốt tên miền nghiệp vụ: import-export-order.
- Đã chốt nơi lưu file chứng từ: Local disk (POC).
- Đã chốt nguồn barcode chuẩn: tự chọn cho phù hợp (ưu tiên giải theo lot trước, rồi đến material).

## 9) Definition of Done cho US24

US24 được xem là xong khi:

- Operator tạo được phiếu nhập hoặc phiếu xuất.
- Phiếu mặc định PendingConfirmation.
- Mỗi item quantity > 0 (enforced server-side).
- Có endpoint scan-to-fill hoạt động.
- Có endpoint đính kèm chứng từ (ảnh/PDF, <=5MB).
- Có test unit + e2e pass cho luồng US24.
- Không làm ảnh hưởng luồng transaction tồn kho hiện tại (ngoài phạm vi US24).
