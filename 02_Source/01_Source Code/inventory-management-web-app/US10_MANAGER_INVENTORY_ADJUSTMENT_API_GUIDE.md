# [Manager][US10] API Guide - Điều chỉnh số lượng tồn kho (Frontend)

## 1) Mục tiêu

Tài liệu này mô tả contract tích hợp FE-BE cho nghiệp vụ US10 (Manager điều chỉnh tồn kho), bám theo API backend đã triển khai.

Phạm vi API:

- POST /inventory-adjustments
- GET /inventory-adjustments
- GET /inventory-adjustments/:id

## 2) Xác thực và phân quyền

- Bắt buộc Bearer token hợp lệ.
- Role được phép gọi API US10: Manager.
- Nếu role khác Manager: backend trả 403.

## 3) POST /inventory-adjustments

Mục đích: Tạo một phiếu điều chỉnh tồn kho, đồng thời ghi transaction Adjustment và cập nhật valuation.

### Request body

- lot_id: string (UUID của lot)
- adjustment_quantity: number (khác 0, âm hoặc dương)
- reason_code: enum
  - DAMAGED
  - LOST
  - EXPIRED
  - COUNT_CORRECTION
  - SYSTEM_CORRECTION
  - OTHER
- reason_note: string, optional
  - bắt buộc khi reason_code = OTHER (>= 10 ký tự)
- unit_cost_snapshot: number (>= 0)

### Response 201 (ví dụ)

```json
{
  "adjustment_id": "11111111-1111-4111-8111-111111111111",
  "lot_before": {
    "lot_id": "d9e2d622-06d0-4c77-a79d-509dbfa2b8a1",
    "quantity": 20,
    "unit_of_measure": "kg"
  },
  "lot_after": {
    "lot_id": "d9e2d622-06d0-4c77-a79d-509dbfa2b8a1",
    "quantity": 15,
    "unit_of_measure": "kg"
  },
  "transaction_id": "22222222-2222-4222-8222-222222222222",
  "valuation_before": 1000,
  "valuation_after": 950,
  "valuation_delta": -50,
  "material_id": "MAT-001",
  "reason_code": "DAMAGED",
  "reason_note": "Hư hỏng trong kho",
  "performed_by": "manager01",
  "created_date": "2026-04-04T09:00:00.000Z"
}
```

## 4) GET /inventory-adjustments

Mục đích: Lấy danh sách phiếu điều chỉnh phục vụ tra cứu và kiểm toán.

### Query params

- page: number, mặc định 1
- limit: number, mặc định 20, tối đa 100
- lot_id: string, optional
- material_id: string, optional
- performed_by: string, optional
- reason_code: enum, optional
- from: ISO date, optional
- to: ISO date, optional

### Response 200 (ví dụ)

```json
{
  "items": [
    {
      "adjustment_id": "11111111-1111-4111-8111-111111111111",
      "lot_id": "d9e2d622-06d0-4c77-a79d-509dbfa2b8a1",
      "material_id": "MAT-001",
      "adjustment_quantity": -5,
      "reason_code": "DAMAGED",
      "performed_by": "manager01",
      "valuation_delta": -50,
      "created_date": "2026-04-04T09:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

## 5) GET /inventory-adjustments/:id

Mục đích: Lấy chi tiết một phiếu điều chỉnh.

### Path params

- id: UUID adjustment_id

### Response 200

- Trả đầy đủ các trường của adjustment record, bao gồm:
  - quantity_before
  - quantity_after
  - linked_transaction_id
  - valuation_before / valuation_after / valuation_delta

## 6) Error mapping cho frontend

- 400 Bad Request:
  - adjustment_quantity = 0
  - reason_code không hợp lệ
  - reason_code = OTHER nhưng thiếu reason_note đủ điều kiện
  - unit_cost_snapshot < 0
- 403 Forbidden:
  - user không có quyền Manager
- 404 Not Found:
  - không tìm thấy lot hoặc adjustment_id
- 409 Conflict:
  - điều chỉnh làm quantity âm
- 500+:
  - lỗi hệ thống

Gợi ý thông điệp FE:

- 400: Dữ liệu điều chỉnh không hợp lệ, vui lòng kiểm tra lại.
- 403: Bạn không có quyền thực hiện điều chỉnh tồn kho.
- 404: Không tìm thấy dữ liệu cần điều chỉnh.
- 409: Điều chỉnh không hợp lệ vì làm âm tồn kho.
- 500+: Hệ thống đang bận, vui lòng thử lại sau.

## 7) Contract TypeScript đề xuất

```ts
export type InventoryAdjustmentReasonCode =
  | "DAMAGED"
  | "LOST"
  | "EXPIRED"
  | "COUNT_CORRECTION"
  | "SYSTEM_CORRECTION"
  | "OTHER";

export type CreateInventoryAdjustmentRequest = {
  lot_id: string;
  adjustment_quantity: number;
  reason_code: InventoryAdjustmentReasonCode;
  reason_note?: string;
  unit_cost_snapshot: number;
};

export type InventoryAdjustmentItem = {
  adjustment_id: string;
  lot_id: string;
  material_id: string;
  adjustment_quantity: number;
  quantity_before: number;
  quantity_after: number;
  reason_code: InventoryAdjustmentReasonCode;
  reason_note?: string;
  valuation_before: number;
  valuation_after: number;
  valuation_delta: number;
  performed_by: string;
  linked_transaction_id: string;
  created_date: string;
};
```

## 8) Gợi ý validate phía FE

- adjustment_quantity != 0
- reason_code bắt buộc
- nếu reason_code = OTHER thì reason_note bắt buộc và >= 10 ký tự
- unit_cost_snapshot >= 0

## 9) Trạng thái backend liên quan US10

- API create/list/detail đã có.
- Backend đã ghi transaction type = Adjustment và cập nhật valuation summary.
- Unit test service + e2e API cho US10 đã được bổ sung.
