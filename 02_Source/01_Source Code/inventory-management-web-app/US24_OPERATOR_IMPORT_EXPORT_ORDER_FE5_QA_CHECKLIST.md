# [Operator][US24] FE-5 QA Checklist

## 1) Scope

Checklist test tay cho 3 luong chinh:

- Tao phieu nhap kho
- Tao phieu xuat kho
- Tra cuu lich su, xem chi tiet, sua phieu pending

## 2) Preconditions

- Frontend dang chay voi VITE_API_URL tro dung backend.
- Backend da nap module import-export-order.
- Tai khoan dang test co role Operator.
- Co du lieu vat tu/lot de test quet ma.

## 3) Test Case Group A - Tao phieu nhap kho

1. Mo trang /operator/stock-in.
2. Nhap warehouse_id, them it nhat 1 dong item hop le, submit.
3. Ky vong:

- Hien dialog tao phieu thanh cong.
- Co ma phieu, trang thai PendingConfirmation.

4. Thu quet ma hop le cho dong item.
5. Ky vong:

- Label "Ghi vao dong" cap nhat realtime material_id.

6. Thu chon 1 file > 5MB.
7. Ky vong:

- Hien loi dung noi dung gioi han 5MB.

8. Thu chon tiep file hop le (<5MB).
9. Ky vong:

- Loi file truoc do tu an.
- File vao danh sach cho tai.

## 4) Test Case Group B - Tao phieu xuat kho

1. Mo trang /operator/stock-out.
2. Tao phieu Outbound voi du lieu hop le.
3. Ky vong:

- Dialog thanh cong hien dung thong tin phieu.

4. Thu submit voi du lieu khong hop le (vd quantity <= 0, bo trong warehouse).
5. Ky vong:

- Form hien validate tai cho.
- Neu backend tra loi 400 thi thong bao loi phu hop.

## 5) Test Case Group C - Lich su va chinh sua

1. Mo trang /operator/history.
2. Ky vong:

- Bang hien du lieu va co phan trang.
- Luc loading hien skeleton rows.
- Neu khong co du lieu hien empty state.

3. Thu filter theo status/order_type/date.
4. Ky vong:

- Danh sach cap nhat dung bo loc.

5. Bam "Chi tiet" mot phieu bat ky.
6. Ky vong:

- Drawer mo, hien item va attachment.

7. Bam "Sua" voi phieu PendingConfirmation.
8. Chinh sua item/warehouse, bam luu.
9. Ky vong:

- Toast success hien sau khi cap nhat.
- Danh sach reload theo filter hien tai.

10. Thu bam "Sua" voi phieu khong pending.
11. Ky vong:

- Toast canh bao khong cho phep sua.

## 6) Error Mapping Validation

Kiem tra toast/UX theo ma loi backend:

- 400 -> "Du lieu khong hop le. Vui long kiem tra lai thong tin nhap."
- 403 -> "Ban khong co quyen thuc hien thao tac nay."
- 404 -> "Phieu khong ton tai hoac da bi xoa."
- 500+ -> "He thong dang ban, vui long thu lai."

## 7) Pass Criteria

- Tat ca case tren dat ky vong.
- Khong gap loi compile/lint phat sinh tu FE-5.
- UX thong bao loi/thanh cong thong nhat va de hieu.

## 8) Execution Result (2026-04-02)

Da thuc hien chay test ky thuat va kiem tra route backend lien quan US24:

- API reachability:
  - GET /import-export-orders => 401 (route ton tai, yeu cau auth)
  - POST /import-export-orders/scan/resolve => 401 (route ton tai, yeu cau auth)
- Backend e2e us24-import-export-order.e2e-spec.ts => PASS (5/5)
- Backend unit import-export-order.service.spec.ts => PASS (6/6)
- Frontend build (npm run build) => PASS

Trang thai theo nhom testcase:

- Group A (Tao phieu nhap kho): PARTIAL
  - PASS phan validate backend qua e2e (create pending, upload hop le, reject file > 5MB)
  - BLOCKED phan UI click-through can dang nhap Operator va thao tac tay tren browser
- Group B (Tao phieu xuat kho): PARTIAL
  - PASS phan create outbound qua e2e
  - BLOCKED phan UI toast/dialog can thao tac tay tren browser
- Group C (Lich su + chi tiet + sua): PARTIAL
  - PASS compile/build va API service flow
  - BLOCKED phan UI filter/paging/drawer/edit can session dang nhap Operator de xac minh truc quan

Tong ket:

- KET QUA KY THUAT: PASS
- KET QUA UAT UI THU CONG: CHUA CHAY DU (BLOCKED boi dieu kien dang nhap va thao tac browser)
