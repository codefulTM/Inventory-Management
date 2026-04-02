# [US25] Operator + Manager Smoke Checklist

## 1) Scope

Smoke test nhanh cho 3 API moi:

- GET /import-export-orders/worklist
- POST /import-export-orders/:id/confirm
- POST /import-export-orders/:id/reject

Vai tro test:

- Operator (admin_operator)
- Manager (manager_inventory)

## 2) Preconditions

- Backend dang chay
- DB da seed bang database/mongo-init.js
- Co san 2 phieu demo pending:
  - REF-US25-001 (Inbound)
  - REF-US25-002 (Outbound)
- FE dang tro dung VITE_API_URL

## 3) Test Group A - Worklist

1. Dang nhap bang Operator, mo man hinh worklist.
2. Goi GET /import-export-orders/worklist?page=1&limit=20.
3. Ky vong:

- Tra ve status 200.
- Chi co item PendingConfirmation.
- Co thay REF-US25-001 va REF-US25-002.

4. Dang nhap bang Manager, goi lai endpoint worklist.
5. Ky vong:

- Status 200.
- Manager nhin thay pending list toan he thong.

## 4) Test Group B - Confirm flow

1. Chon REF-US25-001 tren role Operator.
2. Submit confirm voi confirmed_items hop le.
3. Ky vong:

- API 200.
- order.status = Confirmed.
- confirmed_by = admin_operator.
- confirmed_items co variance_quantity.

4. Goi lai confirm cho cung order.
5. Ky vong:

- API 409 (idempotency).

6. Kiem tra lich su transaction theo lot lien quan.
7. Ky vong:

- Co ban ghi moi transaction_type = Receipt.
- reference_number = order_id.

## 5) Test Group C - Reject flow

1. Chon REF-US25-002 tren role Operator.
2. Submit reject voi reason.
3. Ky vong:

- API 200.
- order.status = Rejected.
- confirm_note = reason.

4. Goi lai reject cho cung order.
5. Ky vong:

- API 409 (idempotency).

## 6) Negative Cases

1. Dung payload confirm sai (actual_quantity <= 0).
2. Ky vong: API 400.

3. Dung order_id khong ton tai.
4. Ky vong: API 404.

5. Dung role khong du quyen.
6. Ky vong: API 403.

7. Outbound confirm voi so luong vuot ton.
8. Ky vong: API 409.

## 7) Pass Criteria

- Tat ca case Group A/B/C pass.
- Cac ma loi 400/403/404/409 map dung toast tren FE.
- Build backend pass.
- Build frontend pass.
