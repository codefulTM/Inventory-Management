# [Manager][US16] API Guide - Xuất báo cáo kiểm kê (Frontend)

## 1) Mục tiêu

Tài liệu này mô tả contract tích hợp FE-BE cho nghiệp vụ US16 (Manager xuất báo cáo kiểm kê), bám theo backend đã triển khai phase 1-4.

Phạm vi API:

- POST /inventory-audit-reports
- GET /inventory-audit-reports
- GET /inventory-audit-reports/:id
- GET /inventory-audit-reports/:id/download

## 2) Xác thực và phân quyền

- Bắt buộc Bearer token hợp lệ.
- Role được phép gọi API US16: Manager.
- Nếu role khác Manager: backend trả 403.

## 3) Vòng đời trạng thái báo cáo

- PENDING: vừa tạo yêu cầu.
- PROCESSING: đang tổng hợp dữ liệu, render PDF, ký số.
- READY: đã sẵn sàng tải file.
- FAILED: thất bại trong pipeline tạo báo cáo.

Gợi ý FE:

- Poll GET detail/list định kỳ khi status còn PENDING/PROCESSING.
- Khi READY thì bật nút tải file.
- Khi FAILED thì hiển thị failure_reason.

## 4) POST /inventory-audit-reports

Mục đích: Tạo yêu cầu sinh báo cáo kiểm kê.

### Request body

- period_from: ISO date string (bắt buộc)
- period_to: ISO date string (bắt buộc)
- scope_warehouse_ids: string[] (optional)
- include_zero_balance: boolean (optional, default false)
- report_template_code: string (optional, default STATUTORY_V1)
- signer_profile_id: string (optional)
- note: string (optional)
- approved_by: string (optional)

### Response 201 (ví dụ)

```json
{
  "report_id": "11111111-1111-4111-8111-111111111111",
  "status": "READY",
  "requested_by": "kc-e2e",
  "requested_at": "2026-04-04T10:00:00.000Z"
}
```

## 5) GET /inventory-audit-reports

Mục đích: Lấy danh sách báo cáo kiểm kê.

### Query params

- page: number, mặc định 1
- limit: number, mặc định 20, tối đa 100
- status: PENDING | PROCESSING | READY | FAILED
- requested_by: string
- from: ISO date
- to: ISO date

### Response 200 (ví dụ)

```json
{
  "items": [
    {
      "report_id": "11111111-1111-4111-8111-111111111111",
      "period_from": "2026-04-01T00:00:00.000Z",
      "period_to": "2026-04-30T00:00:00.000Z",
      "status": "READY",
      "summary_total_items": 120,
      "summary_total_quantity": 95000,
      "summary_total_value": 95000,
      "requested_by": "kc-e2e",
      "created_date": "2026-04-04T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

## 6) GET /inventory-audit-reports/:id

Mục đích: Lấy chi tiết báo cáo kiểm kê.

### Path params

- id: UUID report_id

### Response 200 (ví dụ)

```json
{
  "report_id": "11111111-1111-4111-8111-111111111111",
  "status": "READY",
  "report_template_code": "STATUTORY_V1",
  "file_storage_key": "11111111-1111-4111-8111-111111111111.pdf",
  "file_sha256": "abc123...",
  "file_size_bytes": 102400,
  "signature_provider": "RSA_SHA256",
  "signed_at": "2026-04-04T10:01:00.000Z",
  "failure_reason": null
}
```

## 7) GET /inventory-audit-reports/:id/download

Mục đích: Tải PDF báo cáo đã phát hành.

Điều kiện:

- status phải là READY.

### Response

- Content-Type: application/pdf
- Content-Disposition: attachment; filename="{report_id}.pdf"
- Body: binary PDF

## 8) Error mapping cho frontend

- 400 Bad Request:
  - period_from > period_to
  - period_from/period_to không hợp lệ
  - tải báo cáo khi status chưa READY
- 403 Forbidden:
  - user không có quyền Manager
- 404 Not Found:
  - report_id không tồn tại
  - report thiếu file_storage_key
- 500+:
  - lỗi hệ thống

Gợi ý thông điệp FE:

- 400: Tham số báo cáo không hợp lệ hoặc báo cáo chưa sẵn sàng tải.
- 403: Bạn không có quyền xuất báo cáo kiểm kê.
- 404: Không tìm thấy báo cáo kiểm kê.
- 500+: Hệ thống đang bận, vui lòng thử lại sau.

## 9) TypeScript contract đề xuất cho FE

```ts
export type InventoryAuditReportStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

export type CreateInventoryAuditReportRequest = {
  period_from: string;
  period_to: string;
  scope_warehouse_ids?: string[];
  include_zero_balance?: boolean;
  report_template_code?: string;
  signer_profile_id?: string;
  note?: string;
  approved_by?: string;
};

export type InventoryAuditReportItem = {
  report_id: string;
  period_from: string;
  period_to: string;
  status: InventoryAuditReportStatus;
  summary_total_items?: number;
  summary_total_quantity?: number;
  summary_total_value?: number;
  file_sha256?: string;
  signature_provider?: string;
  signed_at?: string;
  failure_reason?: string | null;
  requested_by: string;
  created_date?: string;
};
```

## 10) Trạng thái backend liên quan US16

- API create/list/detail/download đã có.
- Backend đã có pipeline snapshot -> PDF -> signature -> lưu file -> metadata.
- Unit test service + e2e API cho US16 đã bổ sung.
