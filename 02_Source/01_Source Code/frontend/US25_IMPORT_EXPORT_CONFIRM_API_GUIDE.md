# [Operator][US25] Import/Export Confirm API Guide (Frontend)

## 1) Scope

Tai lieu nay la contract FE-BE cho US25:

- Danh sach cong viec pending confirmation (worklist)
- Xac nhan phieu nhap/xuat thuc te
- Tu choi phieu khi so lieu khong khop

Base URL: /import-export-orders

Auth:

- Bat buoc Bearer token
- Role duoc phep: Operator, Manager

## 2) Endpoint Summary

- GET /import-export-orders/worklist
- POST /import-export-orders/:id/confirm
- POST /import-export-orders/:id/reject

## 3) GET /import-export-orders/worklist

Muc dich: Lay danh sach phieu PendingConfirmation.

Query params:

- page: number, mac dinh 1
- limit: number, mac dinh 20
- order_type: Inbound | Outbound (optional)
- from: ISO date (optional)
- to: ISO date (optional)

Role behavior:

- Operator: chi thay phieu do chinh minh tao
- Manager: thay toan bo phieu pending

Response 200:

```json
{
  "items": [
    {
      "order_id": "7b4e7a2b-3f83-4b14-8e2b-000000000007",
      "order_type": "Inbound",
      "status": "PendingConfirmation",
      "warehouse_id": "WH-HCM-01",
      "created_by": "admin_operator",
      "items": [
        {
          "material_id": "MAT-003",
          "lot_id": "LOT-004",
          "quantity": 30,
          "unit_of_measure": "tablet"
        }
      ],
      "created_date": "2026-04-02T07:00:00.000Z",
      "modified_date": "2026-04-02T07:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

## 4) POST /import-export-orders/:id/confirm

Muc dich: Xac nhan thuc te, cap nhat ton kho realtime, tao inventory_transactions.

Path params:

- id: UUID order_id

Request body:

```json
{
  "confirmed_items": [
    {
      "material_id": "MAT-003",
      "lot_id": "LOT-004",
      "expected_quantity": 30,
      "actual_quantity": 29,
      "unit_of_measure": "tablet"
    }
  ],
  "confirm_note": "Da kiem dem tai kho"
}
```

Validation quan trong:

- confirmed_items khong duoc rong
- actual_quantity > 0
- confirmed_items phai match day du voi items goc tren phieu
- chi xu ly duoc khi status = PendingConfirmation

Response 200 (status da chuyen Confirmed):

```json
{
  "order_id": "7b4e7a2b-3f83-4b14-8e2b-000000000007",
  "status": "Confirmed",
  "confirmed_by": "admin_operator",
  "confirmed_at": "2026-04-02T08:00:00.000Z",
  "confirm_note": "Da kiem dem tai kho",
  "confirmed_items": [
    {
      "material_id": "MAT-003",
      "lot_id": "LOT-004",
      "expected_quantity": 30,
      "actual_quantity": 29,
      "variance_quantity": -1,
      "unit_of_measure": "tablet"
    }
  ]
}
```

## 5) POST /import-export-orders/:id/reject

Muc dich: Tu choi phieu, khong cap nhat ton kho.

Request body:

```json
{
  "reason": "Khong khop lot thuc te"
}
```

Response 200:

```json
{
  "order_id": "7b4e7a2b-3f83-4b14-8e2b-000000000008",
  "status": "Rejected",
  "confirmed_by": "admin_operator",
  "confirmed_at": "2026-04-02T08:05:00.000Z",
  "confirm_note": "Khong khop lot thuc te"
}
```

## 6) Error Mapping (de map toast FE)

- 400 Bad Request:
  - Payload sai format
  - confirmed_items khong match order items
  - lot/material/unit khong hop le
- 403 Forbidden:
  - Khong duoc phep xu ly phieu cua user khac
- 404 Not Found:
  - Khong tim thay order_id
- 409 Conflict:
  - Order da duoc xu ly truoc do
  - Outbound khong du ton kho
- 500+:
  - Loi he thong

Goi y mapping message FE:

- 400 -> Du lieu khong hop le, vui long kiem tra lai
- 403 -> Ban khong co quyen thuc hien thao tac nay
- 404 -> Phieu khong ton tai
- 409 -> Phieu da duoc xu ly hoac ton kho khong du
- 500+ -> He thong dang ban, vui long thu lai

## 7) TypeScript Types (de FE su dung)

```ts
export type WorklistQuery = {
  page?: number;
  limit?: number;
  order_type?: "Inbound" | "Outbound";
  from?: string;
  to?: string;
};

export type ConfirmItemPayload = {
  material_id: string;
  lot_id?: string;
  expected_quantity: number;
  actual_quantity: number;
  unit_of_measure: string;
};

export type ConfirmOrderPayload = {
  confirmed_items: ConfirmItemPayload[];
  confirm_note?: string;
};

export type RejectOrderPayload = {
  reason: string;
};
```
