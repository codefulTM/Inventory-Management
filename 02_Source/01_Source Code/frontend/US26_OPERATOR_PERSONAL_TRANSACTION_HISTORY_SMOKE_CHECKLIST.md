# [US26] Operator Personal Transaction History - Smoke Checklist

## 1) Scope

Smoke test cho luồng tra cứu lịch sử giao dịch cá nhân của Operator:

- Danh sách giao dịch cá nhân
- Tìm kiếm nhanh theo mã phiếu hoặc mã hàng
- Xem chi tiết giao dịch read-only
- Mapping lỗi 400/403/404

## 2) Preconditions

- Backend đang chạy và đã triển khai US26 (Phase 1-4).
- Frontend trỏ đúng API base URL.
- Có dữ liệu giao dịch của ít nhất 2 operator khác nhau.
- Có dữ liệu lot gắn material_id để test keyword material.

## 3) Case Group A - Danh sách cá nhân

1. Đăng nhập bằng Operator A.
2. Mở màn hình lịch sử giao dịch cá nhân US26.
3. Gọi API danh sách với page=1, limit=20.
4. Kỳ vọng:

- API 200.
- Danh sách chỉ chứa performed_by của Operator A.
- Không thấy giao dịch của Operator B.

## 4) Case Group B - Tìm kiếm keyword

1. Tìm theo mã phiếu (reference_number).
2. Kỳ vọng:

- API 200.
- Kết quả chứa đúng giao dịch có reference_number tương ứng.

3. Tìm theo mã hàng (material_id).
4. Kỳ vọng:

- API 200.
- Kết quả trả về nhanh và đúng tập giao dịch liên quan material_id.

5. Nhập keyword không tồn tại.
6. Kỳ vọng:

- API 200.
- items rỗng, total = 0.

## 5) Case Group C - Chi tiết read-only

1. Chọn 1 giao dịch thuộc Operator A và mở chi tiết.
2. Kỳ vọng:

- API 200.
- Hiển thị đầy đủ thông tin giao dịch.
- Không có nút chỉnh sửa/xóa.

3. Gọi detail với transaction_id không tồn tại.
4. Kỳ vọng:

- API 404.
- FE hiển thị thông báo không tìm thấy giao dịch.

5. Gọi detail transaction thuộc Operator B (bằng API test/devtools).
6. Kỳ vọng:

- API 403.
- FE hiển thị thông báo không có quyền truy cập.

## 6) Case Group D - Validation query

1. Truyền limit > 100 hoặc page <= 0.
2. Kỳ vọng:

- API 400.
- FE hiển thị thông báo dữ liệu lọc không hợp lệ.

3. Truyền transaction_type không hợp lệ.
4. Kỳ vọng:

- API 400.

## 7) UI/UX checks

1. Loading state:

- Có skeleton/spinner khi tải danh sách.

2. Empty state:

- Có thông điệp rõ ràng khi không có dữ liệu.

3. Error state:

- Có toast/banner tương ứng với từng nhóm lỗi.

4. Debounce keyword:

- Không spam request khi gõ nhanh.

## 8) Pass criteria

- Tất cả case Group A-B-C-D pass.
- Không có quyền sửa/xóa xuất hiện ở UI US26.
- Mapping lỗi 400/403/404 đúng thông điệp.
- Build frontend pass.

## 9) Execution record

- Frontend build: [ ] PASS / [ ] FAIL
- Smoke manual: [ ] PASS / [ ] FAIL
- Người test:
- Thời điểm test:
- Ghi chú:
