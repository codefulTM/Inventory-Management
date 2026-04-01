# Phân tích và Kế hoạch lập trình module Inventory Transaction

## Mục tiêu

Xây dựng module `Inventory Transaction` trong backend NestJS để quản lý các giao dịch tồn kho (nhập, xuất, điều chỉnh, chuyển kho). Module bao gồm schema, DTOs, repository, service, controller, validation, business rules (kiểm tra tồn trước khi xuất), audit trail, event publishing và tests.

## Các bước thực hiện

1. **Thiết kế schema và DTO** (Đã xong)
   - Vị trí: tạo Mongoose schema `inventory-transaction.schema.ts` dưới `backend/src/schemas`.
   - Thiết kế hướng theo Domain Model (lot-centric): mỗi transaction liên kết tới một `InventoryLot` (lot_id) và có `transaction_type` rõ ràng.
   - Trường chính (gợi ý tên/kiểu):
     - `transaction_id` (string, UUID v4)
     - `lot_id` (string, UUID)
     - `transaction_type` (enum: `Receipt`, `Usage`, `Split`, `Adjustment`, `Transfer`, `Disposal`)
       - Giải thích các enum:
         - `Receipt`: nhập hàng vào kho(tăng số lượng)
         - `Usage`: sử dụng vật tư(giảm số lượng)
         - `Split`: chia lot thành nhiều lot nhỏ hơn.
         - `Adjustment`: điều chỉnh tồn kho (vd. do kiểm kê, hư hỏng).
         - `Transfer`: chuyển kho giữa locations.
         - `Disposal`: loại bỏ hàng (hư hỏng, hết hạn).
     - `quantity` (decimal)
     - `unit_of_measure` (string)
     - `transaction_date` (Date)
     - `reference_number` (string, nullable)
     - `performed_by` (string)
     - `notes` (string, nullable)
     - `created_date` / `modified_date` (Date)

   - Indexes đề xuất:
     - `lot_id` (compound with `transaction_date`) — tối ưu lịch sử theo lot.
     - `transaction_date` — truy vấn theo khoảng thời gian.
     - `transaction_type` — lọc theo loại giao dịch.

   - DTOs (ở `backend/src/inventory-transaction/dto`):
     - `create-inventory-transaction.dto.ts`:
       - properties: `lot_id`, `transaction_type`, `quantity`, `unit_of_measure`, `transaction_date` (optional), `reference_number` (optional), `performed_by`, `notes` (optional).
     - `update-inventory-transaction.dto.ts`:
       - properties allowed: tất cả các trường của transaction ngoại trừ `transaction_id`, `created_date`, `modified_date` (những trường không nên thay đổi qua patch). Đây là cấu hình ban đầu để đơn giản; service có thể tiếp tục hạn chế thêm theo nhu cầu audit.
   - Validation decorators:
     - `@IsUUID()` cho `lot_id`, `performed_by` nếu dùng UUIDs.
     - `@IsEnum(TransactionType)` cho `transaction_type`.
     - `@IsNumber()` cho `quantity` (Domain Model cho phép signed values — cho phép âm cho `Usage`/`Disposal`).
     - `@IsNotEmpty()` cho `lot_id`, `transaction_type`, `quantity`, `unit_of_measure`, `performed_by`.
     - `@IsOptional()` cho `reference_number`, `notes`.
     - Dùng `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` ở controller để enforce DTO shapes.

2. **Repository** (Đã xong)
   - Tạo `inventory-transaction.repository.ts` với các phương thức chính: `findAll`, `findOne`, `findByMaterial`, `findByDateRange`, `create`, `update`, `remove`, `createMany`.
   - Hỗ trợ truy vấn phân trang, filter theo `material_id`, `transaction_type`, `performed_date` range.

3. **Service** (Đã xong)
   - Tạo `inventory-transaction.service.ts` với các phương thức chính:
     - `create(transactionDto)` – entry point xử lý biến đổi dữ liệu chung rồi gọi hàm riêng theo loại.
     - `getAll(filters, paging)` / `getOne(id)` / `update(id, dto)` / `remove(id)` (xóa cứng).
     - Các helper private/`protected` để xử lý mỗi loại transaction:
       - `handleReceipt(dto)` – tăng quantity lot được chỉ định.
       - `handleUsage(dto)` – kiểm tra tồn kho đủ (theo policy FIFO/FEFO) và giảm số lượng;
         nếu `lot_id` không có, chọn lot(s) tự động.
       - `handleSplit(dto)` – trừ `quantity` từ lot gốc, khởi tạo lot mới(s) với số lượng tương ứng, trả về cả transaction `Split` và record lot mới.
       - `handleAdjustment(dto)` – áp dụng +/- quantity, lưu `reason` vào audit, không thay đổi logic khác.
       - `handleTransfer(dto)` – có thể gọi `handleUsage` cho nguồn và `handleReceipt` cho đích hoặc tạo transaction `Transfer` duy nhất và để listener cập nhật cả hai lot.
       - `handleDisposal(dto)` – tương tự `Usage` nhưng gắn thêm flag disposal và logic báo cáo hủy.

   - Kiểm tra và áp dụng business rules trước khi commit:
     - không cho stock âm sau `Usage`/`Disposal`;
     - với `Receipt` và `Transfer` in-bound: update lot tồn theo đơn vị;
     - với `Split` phải tạo lot con và giữ quan hệ parent/child (được lưu trên `InventoryLot.parent_lot_id` theo domain model).
   - Publish sự kiện (event-bus) sau khi transaction thành công để cập nhật `InventoryLot`/Material stock, logs, search index.
   - Consume sự kiện: Cập nhật transaction khi có thay đổi từ `InventoryLot`. Trước đó cần tạo các Handler để lắng nghe sự kiện từ `InventoryLot` (vd. `LotUpdated`) để đồng bộ thông tin nếu cần thiết. Sau đó đăng ký handler này trong `Dispatcher`. Trước mắt tạo handler cho loại event Adjustment trước.
   - Nhúng repository và các repository liên quan (`InventoryLotRepository`, `MaterialRepository`) bằng DI.

4. **Controller**
   - `inventory-transaction.controller.ts` với route:
     - `GET /transactions` — list (filter, paging)
     - `GET /transactions/:id` — detail
     - `POST /transactions` — tạo transaction đơn
     - `POST /transactions/bulk` — tạo nhiều transaction (import/scan)
     - `PATCH /transactions/:id` — cập nhật (chỉ cho sửa metadata/reason, không thay đổi lịch sử quan trọng trừ khi có audit)
     - `DELETE /transactions/:id` — xóa bản ghi (hard delete); cẩn trọng nếu đã ảnh hưởng stock.
   - Áp dụng `ValidationPipe`, `AuthGuard`, và `RolesGuard` nếu cần.

5. **Module**
   - Tạo `inventory-transaction.module.ts`, import schema, provider cho repository, service, controller.
   - Đăng ký vào `app.module.ts` nếu cần hoặc lazy-load theo feature module pattern.

6. **Validation & Business Rules** (Cần xem kĩ lại sau)
   - Sử dụng `ValidationPipe` để validate DTOs.
   - Thực hiện kiểm tra stock trong service trước khi commit `OUTBOUND`. Nếu không đủ, trả lỗi rõ ràng (`409 Conflict` hoặc domain error).
   - Đảm bảo atomicity: dùng transaction session của Mongo / two-phase update khi cần (ví dụ rollback khi cập nhật lot thất bại).

7. **Testing**
   - Unit tests cho `inventory-transaction.service.spec.ts`.
   - E2E tests trong `test/app.e2e-spec.ts` hoặc thêm file e2e riêng để cover create->affect-lot workflow.

8. **Frontend tích hợp**
   - Cập nhật/tạo `inventoryTransactionService.ts` ở frontend để gọi API mới.
   - Xây dựng các màn hình cần quan tâm, sử dụng Tailwind CSS cho UI:
     - Manager:
       - Import/Export Management Screen
       - Create Import Screen
       - Create Export Screen
     - Operator:
       - Import Screen
       - Handling Incoming Goods
       - Create a Purchase Order
       - Export Screen
       - Warehouse Dispatch
9. **Seed / Migrations**
   - Nếu cần seed data hoặc migration (ví dụ khi thêm new fields), thêm script vào `database/mongo-init.js` hoặc migration script riêng.

10. **Observability & Auditing**

- Ghi audit trail cho mọi thay đổi quan trọng (performed_by, reason, related_document).
- Publish events to `event-bus` (Kafka) để các service khác (search index, analytics) cập nhật.
- Thêm structured logging khi transaction fail/rollback.
