# US11 — Tạo phiếu nhập/xuất kho điện tử

Phiên bản: 1.0
Ngày: 2026-04-18

## Tóm tắt

Kế hoạch thực hiện tính năng tạo phiếu nhập/xuất kho (US11). Mục tiêu: cho phép nhân viên/manager tạo phiếu điện tử, đính kèm chứng từ, lưu lịch sử và xuất/ in phiếu theo mẫu chuẩn. Quy trình approve (phê duyệt) có thể do US12 xử lý; ở đây phiếu mới sẽ có trạng thái mặc định "Chờ xác nhận".

## Tiêu chí chấp nhận (theo Product Backlog)

- Hỗ trợ đính kèm minh chứng (PDF, JPG, PNG) tối đa 5MB.
- Phiếu tạo mới tự động nhận trạng thái "Chờ xác nhận".
- In phiếu theo mẫu chuẩn của Bộ Tài chính hoặc quy định công ty.

## Phạm vi (In-scope / Out-of-scope)

- In-scope:
  - Tạo phiếu (IN / OUT) với dòng hàng (line items).
  - Upload và lưu trữ file đính kèm (PDF/JPG/PNG), giới hạn 5MB/file.
  - Lưu audit trail (ai tạo, sửa, thời gian).
  - View chi tiết phiếu, danh sách phiếu, và chế độ in/ xuất PDF theo template.
- Out-of-scope (làm riêng hoặc liên quan đến US12):
  - Quy trình phê duyệt/approve chi tiết (giao diện approve của Manager sẽ là US12).
  - Tích hợp chữ ký số nâng cao (nếu cần sẽ là task riêng).

## Giả định

- Hệ thống đã có authentication/authorization (Keycloak hoặc tương tự).
- Danh mục `material` và `warehouse` đã tồn tại; material phải ở trạng thái "Approved" để được chọn.
- Hạ tầng có thể lưu file: local filesystem cho PoC, MinIO/S3 cho production.

## Thiết kế dữ liệu (MongoDB / Mongoose — document model)

Thay vì ba bảng quan hệ, với MongoDB ta lưu một collection `warehouse_slips` chứa document cho mỗi phiếu. Document này sẽ nhúng mảng `lines` và mảng `attachments` (metadata). File nhị phân thì lưu bên ngoài (S3/MinIO/Filesystem/GridFS) và chỉ lưu metadata/URL trong document.

Ví dụ cấu trúc tài liệu `warehouse_slip`:

- `_id` (ObjectId): khóa MongoDB
- `slip_id` (String): UUID (optional, dễ dùng cho external refs)
- `slip_number` (String): Số phiếu (unique)
- `type` (String): "IN" | "OUT"
- `warehouse_id` (String): mã kho (tham chiếu collection `warehouses`)
- `status` (String): "PENDING" | "CONFIRMED" | "REJECTED"
- `reference_number` (String): tham chiếu ngoài (PO, hợp đồng)
- `total_quantity` (Number)
- `total_value` (Number)
- `created_by` (String)
- `notes` (String)
- `lines` (Array of subdocuments) — chi tiết mỗi dòng:
  - `line_id` (String, UUID)
  - `material_id` (String)
  - `sku` (String)
  - `lot_id` (String|null)
  - `quantity` (Number)
  - `unit` (String)
  - `unit_price` (Number)
  - `expiry_date` (Date|null)
  - `notes` (String|null)
- `attachments` (Array of subdocuments) — metadata file:
  - `file_id` (String, UUID)
  - `original_name` (String)
  - `mime_type` (String)
  - `size_bytes` (Number)
  - `url` (String) — signed URL or public URL
  - `storage_source` (String) — 's3'|'minio'|'local'|'gridfs'
  - `uploaded_by` (String)
  - `uploaded_at` (Date)

Ưu/nhược điểm:

- Nhúng `lines` thuận tiện để đọc phiếu đầy đủ chỉ với 1 document fetch (good read performance).
- Nhúng `attachments` metadata vẫn nhẹ; không lưu file binary trong document.
- Nếu mảng `lines` quá lớn (hàng trăm item) cân nhắc tách thành collection `warehouse_slip_lines` tham chiếu bằng `slip_id`.

Gợi ý Mongoose (NestJS) — ví dụ schemas (TypeScript, tóm tắt):

```ts
@Schema({ _id: false })
class SlipAttachment {
  @Prop({ default: uuidv4 }) file_id: string;
  @Prop() original_name: string;
  @Prop() mime_type: string;
  @Prop() size_bytes: number;
  @Prop() url: string;
  @Prop() storage_source: string;
  @Prop() uploaded_by?: string;
  @Prop({ default: () => new Date() }) uploaded_at?: Date;
}
const SlipAttachmentSchema = SchemaFactory.createForClass(SlipAttachment);

@Schema({ _id: false })
class WarehouseSlipLine {
  @Prop({ default: uuidv4 }) line_id: string;
  @Prop() material_id: string;
  @Prop() sku?: string;
  @Prop() lot_id?: string;
  @Prop({ required: true }) quantity: number;
  @Prop() unit?: string;
  @Prop() unit_price?: number;
  @Prop() expiry_date?: Date;
  @Prop() notes?: string;
}
const WarehouseSlipLineSchema = SchemaFactory.createForClass(WarehouseSlipLine);

@Schema({
  collection: "warehouse_slips",
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
})
export class WarehouseSlip {
  @Prop({ default: uuidv4 }) slip_id: string;
  @Prop({ unique: true, required: true }) slip_number: string;
  @Prop({ required: true, enum: ["IN", "OUT"] }) type: string;
  @Prop({ required: true }) warehouse_id: string;
  @Prop({ enum: ["PENDING", "CONFIRMED", "REJECTED"], default: "PENDING" })
  status: string;
  @Prop() reference_number?: string;
  @Prop({ default: 0 }) total_quantity?: number;
  @Prop({ default: 0 }) total_value?: number;
  @Prop() created_by?: string;
  @Prop() notes?: string;
  @Prop({ type: [WarehouseSlipLineSchema], default: [] })
  lines: WarehouseSlipLine[];
  @Prop({ type: [SlipAttachmentSchema], default: [] })
  attachments: SlipAttachment[];
}
export const WarehouseSlipSchema = SchemaFactory.createForClass(WarehouseSlip);
WarehouseSlipSchema.index({ slip_number: 1 }, { unique: true });
WarehouseSlipSchema.index({ warehouse_id: 1, status: 1 });
```

Lưu ý: file nhị phân không lưu trong document; dùng S3/MinIO/GridFS và lưu `url` + `file_id` trong `attachments`.

## API contract (gợi ý)

- `POST /api/warehouse/slips` — Tạo phiếu
  - Auth: bearer token
  - Body (multipart/form-data hoặc JSON + file upload endpoint):
    - `type`: "IN" hoặc "OUT"
    - `warehouse_id`, `reference_number`, `notes`
    - `lines`: [{material_id, sku, quantity, unit, lot_id?}]
    - files: attachments (PDF/JPG/PNG, <=5MB mỗi file)
  - Response: 201 Created + slip id, slip_number, status="PENDING"
- `GET /api/warehouse/slips/:id` — Lấy chi tiết phiếu
- `GET /api/warehouse/slips` — List + filters (status, date range, warehouse, created_by)
- `POST /api/warehouse/slips/:id/attachments` — Upload tệp sau khi tạo
- `GET /api/warehouse/slips/:id/print` — HTML/PDF view để in (server-side rendered)

## Frontend — UX / Screens

- Form tạo phiếu
  - Chọn `Type` (IN/OUT), Warehouse, Reference, Ghi chú
  - Thêm dòng: scan barcode hoặc nhập tay (material + qty + unit + lot nếu cần)
  - Upload tệp kéo-thả (preview thumbnail cho ảnh, tên + kích thước cho PDF)
  - Submit -> chuyển trạng thái sang "Chờ xác nhận"
- Page danh sách phiếu (filter/search)
- Page chi tiết phiếu (danh sách dòng, attachments, lịch sử)
- Print view: chuẩn HTML in-to-PDF theo template công ty

## File upload & storage

- Giới hạn: mỗi file <= 5MB; mime types: application/pdf, image/jpeg, image/png
- Storage options:
  - PoC: store on local disk under `/uploads/slips/{year}/{month}/` and store `storage_path`.
  - Prod: S3/MinIO with signed URLs; save object key + checksum.
- Ensure virus scan / content-type validation if cần bảo mật cao.

## Bảo mật & Quyền (Permissions)

- Create: `Operator` và `Manager` có quyền tạo phiếu.
- Approve/Confirm: chỉ `Manager` (US12 sẽ triển khai chức năng confirm).
- Xem: creator + Manager + roles with report permission.

## Validation rules

- Mỗi line: `quantity > 0` và `material` phải tồn tại và ở trạng thái Approved.
- Tổng số lượng/giá trị không âm.
- Attachment size & type checked server-side.

## Print / Export

- Cung cấp `GET /api/warehouse/slips/:id/print` trả về HTML chuẩn, client dùng browser print hoặc server chuyển HTML -> PDF (puppeteer / wkhtmltopdf).
- Template phải hiển thị logo, thông tin công ty, mã phiếu, danh sách dòng, chữ ký/ghi chú, và đính kèm hình ảnh (nếu cần hiển thị minh chứng).

## Kiểm thử (Testing)

- Unit tests cho service tạo phiếu, tính toán tổng và validation.
- Integration tests: upload file + create slip + fetch detail.
- E2E: UI flow tạo phiếu, attach file, xem chi tiết, in preview.

## Biến môi trường & cấu hình

- `ATTACHMENTS_MAX_SIZE_BYTES` (default 5242880)
- `ATTACHMENTS_ALLOWED_TYPES` (list)
- `STORAGE_PROVIDER` (local|minio|s3)
- `UPLOAD_PATH` hoặc S3 bucket/credentials

## Rủi ro & phụ thuộc

- Nếu hệ thống dùng DB NoSQL, migration model khác so với relational.
- Cần kiểm tra giới hạn lưu trữ file (disk/quota).
- Mẫu in theo quy định Bộ Tài chính có thể yêu cầu tích hợp chữ ký số (task riêng).

## Checklist triển khai (mapping với todo list)

1. Finalize scope & acceptance — HOÀN TẤT: xác nhận yêu cầu và acceptance criteria (đang tiến hành)
2. Design data model and schema
3. Design API contract and endpoints
4. Define DB migrations
5. Implement backend endpoints and services
6. Implement file upload and storage
7. Implement frontend form and UI
8. Implement print and export template
9. Add validation and permissions
10. Add unit and integration tests
11. Prepare QA test cases
12. Document API and user guide
13. Deploy feature and monitor

## Next steps

- Bắt đầu với bước 2: thiết kế schema (bản nháp); sau đó thực hiện API contract. Nếu bạn đồng ý, tôi sẽ bắt tay vào thiết kế schema và API contract và cập nhật lại todo list.
