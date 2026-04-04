# Inventory Workflow API Contract v2

## 1) Phạm vi

Tài liệu này định nghĩa contract API mục tiêu cho luồng nghiệp vụ:

- Operator tạo phiếu nhập/xuất kho với ràng buộc dữ liệu chặt chẽ.
- Manager xác nhận/từ chối phiếu nhập/xuất.
- Manager điều chỉnh tồn kho trực tiếp tại màn hình tồn kho.

Mục tiêu của v2:

- Giảm nhập tay các trường dễ sai (`lot_id`, `material_id`).
- Tăng tính ràng buộc dữ liệu theo role và loại phiếu.
- Bảo toàn audit/transaction cho truy vết.

---

## 2) Quy ước chung

- Base URL: theo môi trường hiện hành.
- Authentication: JWT bearer token.
- Múi giờ: ISO-8601 UTC cho trường datetime.
- Mã lỗi chính:
  - 400: dữ liệu không hợp lệ.
  - 401: chưa xác thực.
  - 403: không đủ quyền.
  - 404: không tìm thấy tài nguyên.
  - 409: xung đột nghiệp vụ.
  - 422: lỗi ràng buộc ngữ nghĩa (nếu backend cần tách riêng).

Response lỗi chuẩn khuyến nghị:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": []
}
```

---

## 3) Contract options cho dropdown

## 3.1 GET /materials/options

Mục đích:

- Cấp dữ liệu dropdown "Mã vật tư" cho inbound.

Query params:

- `q` (optional): keyword tìm kiếm.
- `status` (optional): ví dụ `Active`.
- `page`, `limit` (optional).

Response 200:

```json
{
  "items": [
    {
      "material_id": "MAT-001",
      "material_name": "Paracetamol 500mg",
      "unit_of_measure": "kg",
      "part_number": "PN-001"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

## 3.2 GET /inventory-lots/options

Mục đích:

- Cấp dữ liệu dropdown "Mã lô" cho outbound và manager adjustment.

Query params:

- `q` (optional): keyword.
- `material_id` (optional): lọc theo vật tư.
- `status` (optional): ví dụ `Accepted`.
- `exclude_status` (optional): ví dụ `Rejected,Depleted`.
- `warehouse_id` (optional).
- `page`, `limit` (optional).

Response 200:

```json
{
  "items": [
    {
      "lot_id": "LOT-020",
      "material_id": "MAT-001",
      "material_name": "Paracetamol 500mg",
      "quantity": 120,
      "unit_of_measure": "kg",
      "status": "Accepted",
      "storage_location": "A-01"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

## 4) Contract tạo phiếu nhập/xuất (US24)

## 4.1 POST /import-export-orders

Role:

- Operator, Manager.

### 4.1.1 Request cho Inbound

Quy tắc:

- `order_type = Inbound`.
- Frontend không gửi `lot_id` hoặc gửi readonly theo lot reserved từ backend.
- `material_id` bắt buộc từ dropdown.

Request mẫu:

```json
{
  "order_type": "Inbound",
  "warehouse_id": "WH-01",
  "reason": "Nhập hàng từ nhà cung cấp",
  "reference_number": "PO-2026-041",
  "items": [
    {
      "material_id": "MAT-001",
      "quantity": 50,
      "unit_of_measure": "kg",
      "expected_location": "A-01"
    }
  ]
}
```

### 4.1.2 Request cho Outbound

Quy tắc:

- `order_type = Outbound`.
- `lot_id` bắt buộc từ dropdown dữ liệu có sẵn.
- `material_id` backend sẽ kiểm tra khớp lot.

Request mẫu:

```json
{
  "order_type": "Outbound",
  "warehouse_id": "WH-01",
  "reason": "Xuất cho sản xuất",
  "reference_number": "SO-2026-011",
  "items": [
    {
      "lot_id": "LOT-020",
      "material_id": "MAT-001",
      "quantity": 10,
      "unit_of_measure": "kg",
      "expected_location": "A-01"
    }
  ]
}
```

### 4.1.3 Response 201

- Với inbound, backend trả về item có `lot_id` đã reserved theo sequence.

```json
{
  "order_id": "ORD-UUID",
  "order_type": "Inbound",
  "status": "PendingConfirmation",
  "warehouse_id": "WH-01",
  "created_by": "operator01",
  "items": [
    {
      "material_id": "MAT-001",
      "lot_id": "LOT-020",
      "quantity": 50,
      "unit_of_measure": "kg",
      "expected_location": "A-01"
    }
  ],
  "attachments": [],
  "created_date": "2026-04-04T10:00:00.000Z",
  "modified_date": "2026-04-04T10:00:00.000Z"
}
```

---

## 5) Contract scan-to-fill thích ứng order type

## 5.1 POST /import-export-orders/scan/resolve

Request:

```json
{
  "scan_code": "LOT-020",
  "order_type": "Outbound"
}
```

Response 200 mẫu (Outbound, quét lot):

```json
{
  "scan_code": "LOT-020",
  "order_type": "Outbound",
  "resolved": true,
  "matched_by": "lot_id",
  "item": {
    "lot_id": "LOT-020",
    "material_id": "MAT-001",
    "material_name": "Paracetamol 500mg",
    "unit_of_measure": "kg",
    "expected_location": "A-01"
  },
  "lot": {
    "status": "Accepted",
    "quantity": 120,
    "manufacturer_lot": "MLOT-001"
  },
  "warnings": []
}
```

Response 200 mẫu (Inbound, quét material):

```json
{
  "scan_code": "MAT-001",
  "order_type": "Inbound",
  "resolved": true,
  "matched_by": "material_id",
  "item": {
    "material_id": "MAT-001",
    "material_name": "Paracetamol 500mg",
    "unit_of_measure": "kg",
    "expected_location": "A-01",
    "lot_id": "LOT-021"
  },
  "lot": null,
  "warnings": []
}
```

Quy tắc resolve:

- Inbound ưu tiên: `material_id`, `part_number`, sau đó lot nếu có.
- Outbound ưu tiên: `lot_id`, `manufacturer_lot`, sau đó material.

---

## 6) Contract xác nhận/từ chối phiếu (US12/US25)

## 6.1 POST /import-export-orders/:id/confirm

Role:

- Manager (hoặc role được ủy quyền theo policy).

Quy tắc:

- Inbound: lot chưa tồn tại thì tạo lot chính thức từ lot reserved.
- Outbound: lot bắt buộc tồn tại và đủ số lượng.
- Thành công: cập nhật tồn kho + sinh transaction.

## 6.2 POST /import-export-orders/:id/reject

Role:

- Manager.

Quy tắc:

- Bắt buộc lý do từ chối.
- Không thay đổi tồn kho vật lý.

---

## 7) Contract điều chỉnh tồn kho trực tiếp (Manager)

## 7.1 POST /inventory-adjustments

Role:

- Manager.

Request:

```json
{
  "lot_id": "LOT-020",
  "adjustment_quantity": -5,
  "reason_code": "DAMAGED",
  "reason_note": "Hư hỏng do bảo quản",
  "unit_cost_snapshot": 100
}
```

Quy tắc:

- `lot_id` chọn từ dropdown DB, không nhập tự do.
- Thực thi trực tiếp, không qua workflow chờ duyệt.
- Bắt buộc ghi nhận audit/transaction/before-after.

Response 201:

```json
{
  "adjustment_id": "ADJ-UUID",
  "transaction_id": "TRX-UUID",
  "material_id": "MAT-001",
  "lot_before": {
    "lot_id": "LOT-020",
    "quantity": 120,
    "unit_of_measure": "kg"
  },
  "lot_after": {
    "lot_id": "LOT-020",
    "quantity": 115,
    "unit_of_measure": "kg"
  },
  "valuation_before": 12000,
  "valuation_after": 11500,
  "valuation_delta": -500,
  "reason_code": "DAMAGED",
  "reason_note": "Hư hỏng do bảo quản",
  "performed_by": "manager01",
  "created_date": "2026-04-04T10:00:00.000Z"
}
```

---

## 8) Tương thích ngược và rollout

- Đề xuất hỗ trợ chế độ chuyển tiếp:
  - Cho phép nhận payload cũ trong thời gian ngắn.
  - Log warning khi client gửi field không còn khuyến nghị.
- Frontend rollout theo feature flag:
  - `inventoryWorkflowV2=true`.

---

## 9) Danh mục endpoint v2 tối thiểu cần có

- `GET /materials/options`
- `GET /inventory-lots/options`
- `POST /import-export-orders`
- `GET /import-export-orders`
- `GET /import-export-orders/:id`
- `PATCH /import-export-orders/:id`
- `POST /import-export-orders/:id/attachments`
- `POST /import-export-orders/scan/resolve`
- `POST /import-export-orders/:id/confirm`
- `POST /import-export-orders/:id/reject`
- `POST /inventory-adjustments`
