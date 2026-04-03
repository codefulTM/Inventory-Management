# Tổng hợp kiểm tra chức năng Re-test

Ngày kiểm tra: 2026-04-03
Phạm vi: Frontend QC Inventory + Backend qc-test

## Kết luận nhanh
Chức năng re-test đang hoạt động một phần:
- Luồng gọi API từ UI hoạt động.
- Unit test backend cho service đang PASS.
- Tuy nhiên còn lỗi nghiệp vụ/rủi ro quan trọng cần xử lý trước khi coi là hoàn chỉnh.

## Kết quả xác minh
- Đã chạy test: `npm test -- qc-test.service.spec.ts`
- Kết quả: PASS 19/19 test cases.
- Lưu ý: Bộ test hiện tại chưa bắt được một số sai lệch nghiệp vụ thực tế (mô tả bên dưới).

## Vấn đề phát hiện

### 1) Critical - Action không hợp lệ có thể bị xử lý như discard
Mức độ: Critical

Mô tả:
- Endpoint re-test nhận body kiểu inline object, không dùng DTO validator riêng cho action.
- Service xử lý theo nhánh `if (action === 'extend')` và toàn bộ trường hợp còn lại rơi vào `else` (discard/depleted).

Tác động:
- Nếu client gửi action sai hoặc payload lỗi, có nguy cơ chuyển lô sang Depleted ngoài ý muốn.

Bằng chứng:
- `02_Source/01_Source Code/backend/src/qc-test/qc-test.controller.ts` (route `POST lot/:lot_id/retest`)
- `02_Source/01_Source Code/backend/src/qc-test/qc-test.service.ts` (nhánh `if extend` + `else`)

Khuyến nghị:
- Tạo DTO riêng cho re-test với `@IsEnum(['extend','discard'])`.
- Nếu action không hợp lệ: trả `400 BadRequest`, không cho rơi vào nhánh discard.

### 2) High - Nhánh extend không cập nhật expiration_date theo tài liệu
Mức độ: High

Mô tả:
- Ở nhánh extend, code hiện chỉ update status sang Accepted.
- Không thấy cập nhật `expiration_date` bằng `new_expiry_date`.

Tác động:
- API có thể trả thành công nhưng HSD mới không được lưu vào DB.
- Sai lệch giữa hành vi triển khai và tài liệu API.

Bằng chứng:
- `02_Source/01_Source Code/backend/src/qc-test/qc-test.service.ts` (comment: chỉ update status)
- `02_Source/01_Source Code/backend/src/inventory-lot/inventory-lot.service.ts` (`updateStatus` chỉ xử lý status)
- `02_Source/01_Source Code/backend/src/inventory-lot/inventory-lot.repository.ts` (`findOneAndUpdate({ lot_id }, { status }, ...)`)
- `01_Documents/DocBuildQC/api_qctest_doc.md` (yêu cầu cập nhật `InventoryLot.expiration_date = new_expiry_date`)

Khuyến nghị:
- Trong nhánh extend, gọi `inventoryLotService.update(...)` để set cả:
  - `expiration_date = new_expiry_date`
  - `status = Accepted`
- Hoặc tạo API/service method chuyên biệt `updateStatusAndExpiry` để tránh sai sót.

### 3) Medium - Audit performed_by đang hardcode ở frontend
Mức độ: Medium

Mô tả:
- Frontend gửi `performed_by: 'qc_user'` cố định.

Tác động:
- Mất tính chính xác truy vết thao tác theo user thực tế.

Bằng chứng:
- `02_Source/01_Source Code/frontend/src/pages/qc/InventoryQC.tsx`

Khuyến nghị:
- Lấy user hiện tại từ auth context/session/token rồi truyền vào payload.
- Backend ưu tiên dùng user từ JWT thay vì tin hoàn toàn dữ liệu từ client.

### 4) Medium - Test hiện tại tạo cảm giác an toàn giả cho nhánh extend
Mức độ: Medium

Mô tả:
- Test case có tên kiểm tra update expiration_date nhưng chỉ mock dữ liệu trả về có expiration_date.
- Assertion thực tế mới chỉ kiểm tra `updateStatus(..., 'Accepted')`.

Tác động:
- Dễ PASS test dù DB không cập nhật HSD thật.

Bằng chứng:
- `02_Source/01_Source Code/backend/src/qc-test/qc-test.service.spec.ts`

Khuyến nghị:
- Bổ sung assertion xác nhận hàm update có nhận `expiration_date` mới.
- Viết thêm integration test để kiểm tra giá trị HSD sau API call.

### 5) Medium - Validate new_expiry_date ở backend còn yếu
Mức độ: Medium

Mô tả:
- Backend chỉ kiểm tra có truyền `new_expiry_date` hay không.
- Chưa validate chặt định dạng/logic ngày (ví dụ ngày quá khứ).

Tác động:
- Có thể ghi nhận ngày không hợp lệ nếu request bị can thiệp ngoài UI.

Bằng chứng:
- `02_Source/01_Source Code/backend/src/qc-test/qc-test.service.ts`
- Frontend có `min=today` nhưng không đủ vì có thể bypass client.

Khuyến nghị:
- Thêm validator cho `new_expiry_date` (ISO date hợp lệ, > hiện tại).
- Trả `400` với thông điệp rõ ràng khi ngày không đạt điều kiện.

## Ưu tiên xử lý đề xuất
1. Chặn action invalid bằng DTO + validation (Critical).
2. Sửa nhánh extend để cập nhật expiration_date thật sự (High).
3. Nâng test để bắt đúng behavior update HSD (Medium).
4. Chuẩn hóa audit `performed_by` theo user đăng nhập (Medium).
5. Tăng validate ngày ở backend (Medium).

## Trạng thái hiện tại
- Chưa khuyến nghị release chức năng re-test khi chưa xử lý xong mục 1 và 2.
