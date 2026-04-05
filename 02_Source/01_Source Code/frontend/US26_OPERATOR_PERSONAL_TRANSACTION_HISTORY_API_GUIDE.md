# [Operator][US26] API Guide - Tra cứu lịch sử giao dịch cá nhân (Frontend)

## 1) Mục tiêu tài liệu

Tài liệu này là contract tích hợp FE-BE cho US26, tập trung vào 2 API read-only:

- GET /transactions/my-history
- GET /transactions/my-history/:id

Phạm vi nghiệp vụ:

- Operator chỉ xem giao dịch do chính mình thực hiện.
- Hỗ trợ tìm nhanh theo mã phiếu hoặc mã hàng.
- Không cho phép sửa/xóa dữ liệu đã chốt.

## 2) Điều kiện xác thực

- Bắt buộc Bearer token hợp lệ.
- Role được phép gọi API US26: Operator.
- Backend tự ép scope theo actor từ token, frontend không được gửi performed_by.

## 3) Endpoint summary

- GET /transactions/my-history
- GET /transactions/my-history/:id

Base URL hiện tại: /transactions

## 4) GET /transactions/my-history

Mục đích: Lấy danh sách giao dịch cá nhân theo actor đăng nhập.

### Query params

- page: number, mặc định 1
- limit: number, mặc định 20, tối đa 100
- from: ISO date (yyyy-mm-dd hoặc ISO datetime), optional
- to: ISO date (yyyy-mm-dd hoặc ISO datetime), optional
- transaction_type: Receipt | Usage | Split | Adjustment | Transfer | Disposal, optional
- keyword: string, tối đa 100 ký tự, optional

### Rule xử lý

- Backend luôn filter performed_by = actor từ token.
- Nếu có keyword, backend tìm theo:
  - transaction_id
  - reference_number
  - lot_id
  - material_id (qua lookup sang inventory_lots)

### Response 200 (ví dụ)

```json
{
  "items": [
    {
      "_id": "67f0a8e34f884cb889f7d0a1",
      "transaction_id": "3d8c3f6f-5c90-4aab-9d2d-8b8ad0f0a8c9",
      "lot_id": "LOT-001",
      "transaction_type": "Receipt",
      "quantity": 100,
      "unit_of_measure": "kg",
      "transaction_date": "2026-04-02T08:00:00.000Z",
      "reference_number": "REF-001",
      "performed_by": "operator01",
      "notes": "Đối soát cuối ca"
    }
  ],
  "total": 1
}
```

## 5) GET /transactions/my-history/:id

Mục đích: Xem chi tiết 1 giao dịch cá nhân.

### Path params

- id: UUID của transaction_id

### Rule xử lý

- Nếu giao dịch không tồn tại: 404.
- Nếu giao dịch tồn tại nhưng không thuộc actor: 403.
- Nếu thuộc actor: trả chi tiết giao dịch.

### Response 200 (ví dụ)

```json
{
  "_id": "67f0a8e34f884cb889f7d0a1",
  "transaction_id": "3d8c3f6f-5c90-4aab-9d2d-8b8ad0f0a8c9",
  "lot_id": "LOT-001",
  "transaction_type": "Receipt",
  "quantity": 100,
  "unit_of_measure": "kg",
  "transaction_date": "2026-04-02T08:00:00.000Z",
  "reference_number": "REF-001",
  "performed_by": "operator01",
  "notes": "Đối soát cuối ca"
}
```

## 6) Error mapping cho frontend

- 400 Bad Request:
  - Query param sai định dạng (page, limit, from, to, transaction_type, keyword)
- 403 Forbidden:
  - User không phải Operator
  - User truy cập giao dịch không thuộc quyền sở hữu
- 404 Not Found:
  - Không tồn tại transaction_id
- 500+:
  - Lỗi hệ thống

Gợi ý map thông điệp FE:

- 400: Dữ liệu lọc không hợp lệ, vui lòng kiểm tra lại.
- 403: Bạn không có quyền xem giao dịch này.
- 404: Không tìm thấy giao dịch.
- 500+: Hệ thống đang bận, vui lòng thử lại sau.

## 7) TypeScript contract đề xuất cho FE

```ts
export type MyHistoryQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  transaction_type?:
    | "Receipt"
    | "Usage"
    | "Split"
    | "Adjustment"
    | "Transfer"
    | "Disposal";
  keyword?: string;
};

export type MyHistoryItem = {
  _id?: string;
  transaction_id: string;
  lot_id: string;
  transaction_type: string;
  quantity: number;
  unit_of_measure: string;
  transaction_date: string;
  reference_number?: string;
  performed_by: string;
  notes?: string;
  material_id?: string;
};

export type MyHistoryListResponse = {
  items: MyHistoryItem[];
  total: number;
};
```

## 8) Gợi ý tích hợp service

- File khuyến nghị: src/services/inventoryTransactionService.ts
- Hàm mới:
  - fetchMyHistory(params: MyHistoryQuery)
  - fetchMyHistoryDetail(transactionId: string)

Pseudo-call:

```ts
apiClient.get("/transactions/my-history", { params });
apiClient.get(`/transactions/my-history/${transactionId}`);
```

## 9) Lưu ý thực tế khi hiển thị UI

- material_id có thể không xuất hiện ở mọi bản ghi trả về, UI cần fallback hiển thị lot_id.
- Nên debounce keyword 300ms để giảm số lần gọi API.
- Khi đổi filter/page cần reset selected detail để tránh hiển thị stale data.

## 10) Trạng thái kiểm chứng backend liên quan US26

Đã có kiểm thử backend cho contract này:

- Unit test service: pass
- Unit test repository: pass
- E2E test my-history: pass

Benchmark runtime với dữ liệu thật đã có script, hiện phụ thuộc quyền ghi Mongo ở môi trường chạy.
