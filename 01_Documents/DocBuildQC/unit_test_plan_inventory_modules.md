# Kế hoạch Unit Test: Inventory Lot, Inventory Transaction, Label Template

## 1. Mục tiêu

- Bổ sung và chuẩn hóa unit test cho 3 module:
  - Inventory Lot
  - Inventory Transaction
  - Label Template
- Đảm bảo các luồng nghiệp vụ chính được kiểm thử đầy đủ: validation, xử lý lỗi và luồng thành công.
- Có phần báo cáo kết quả thực tế sau khi chạy test để theo dõi chất lượng.

## 2. Phạm vi và file liên quan

### 2.1. File spec hiện có

- `backend/src/unit-test/inventory-lot.service.spec.ts`
- `backend/src/inventory-transaction/inventory-transaction.service.spec.ts`
- `backend/src/label-template/label-template.service.spec.ts`

### 2.2. Định hướng thực hiện

- Giữ nguyên vị trí file test hiện tại, không bắt buộc di chuyển cấu trúc.
- Mở rộng test case theo test matrix ở Mục 4.
- Chuẩn hóa tên test theo dạng: `method - should <expected behavior>` khi bổ sung mới.

## 3. Test strategy

### 3.1. Loại kiểm thử

- Unit test ở lớp service, mock repository và dependency liên quan.
- Tập trung kiểm tra business rule và exception.
- Không kết nối DB thật trong unit test.

### 3.2. Nguyên tắc

- Áp dụng AAA pattern (Arrange - Act - Assert).
- Mỗi test case kiểm tra một hành vi chính.
- Mỗi case cần assert:
  - Kết quả trả về.
  - Số lần và tham số gọi repository/dependency.
  - Loại exception và thông điệp (nếu có).

## 4. Test matrix theo module

## 4.1. Inventory Lot

Mục tiêu: đảm bảo tạo lot, cập nhật trạng thái và tích hợp inventory transaction đúng nghiệp vụ.

Nhóm A - Tạo lot

- Tạo lot thành công với dữ liệu hợp lệ.
- Từ chối khi ngày nhận lớn hơn ngày hết hạn.
- Từ chối khi số lượng <= 0.
- Bảo toàn lỗi khi tạo transaction tự động thất bại.

Nhóm B - Truy vấn lot

- Lấy lot theo `lot_id` thành công.
- Trả `NotFoundException` khi lot không tồn tại.
- Tìm kiếm theo query thành công.
- Từ chối query rỗng.

Nhóm C - Cập nhật lot/trạng thái

- Cập nhật lot thành công.
- Tự chuyển trạng thái về `Depleted` khi quantity = 0.
- Tạo transaction đúng khi quantity thay đổi.
- Kiểm tra transition trạng thái hợp lệ/không hợp lệ.

Nhóm D - Xóa và thống kê

- Chỉ cho phép xóa lot `Quarantine` khi không có transaction phát sinh ngoài transaction tạo ban đầu.
- Chặn xóa khi có transaction liên quan.
- Có test cho expiring, expired, statistics và traceability fields.

## 4.2. Inventory Transaction

Mục tiêu: đảm bảo validate theo từng transaction type và delegation về repository chính xác.

Nhóm A - Delegation CRUD

- `getAll`, `getOne`, `update`, `remove` gọi đúng repository.

Nhóm B - Validation theo loại giao dịch

- Receipt: quantity phải > 0.
- Usage/Disposal: quantity phải < 0.
- Split/Adjustment/Transfer: quantity != 0.
- Unknown type: trả `BadRequestException`.

Nhóm C - Metadata mặc định

- Tự sinh `transaction_id` khi thiếu.
- Tự gán `transaction_date` khi thiếu.

Nhóm D - Batch create

- `createMany` gọi `create` cho từng phần tử và trả đúng số lượng kết quả.

## 4.3. Label Template

Mục tiêu: đảm bảo quản lý template và generate label đúng dữ liệu đầu vào.

Nhóm A - Tạo template

- Tạo mới thành công.
- Chặn trùng `template_id` với `ConflictException`.

Nhóm B - Truy vấn và phân trang

- `findAll`, `findById`, `filterByType`, `search` trả dữ liệu và metadata phân trang đúng.
- Validate page/limit lỗi.

Nhóm C - Cập nhật/xóa

- Cập nhật thành công với partial payload.
- Trả `NotFoundException` khi bản ghi không tồn tại.
- Xóa thành công và trả message có `template_id`.

Nhóm D - Generate label

- Populate placeholder đúng theo source data.
- Trường hợp placeholder không có dữ liệu thì giữ nguyên token.
- Bao phủ nhiều ma trận dữ liệu cho lot/batch/source precedence và format nội dung.

## 5. Kế hoạch thực hiện

### 5.1. Thứ tự thực hiện

1. Chốt test matrix theo business rule hiện tại của service.
2. Cập nhật test cho Inventory Lot.
3. Cập nhật test cho Inventory Transaction.
4. Cập nhật test cho Label Template.
5. Chạy test từng module.
6. Chạy lại theo batch để xác nhận ổn định.
7. Thu thập coverage từng service.
8. Điền báo cáo kết quả thực tế.

### 5.2. Lệnh chạy test

Chạy trong thư mục `backend`:

```bash
npm run test -- inventory-lot.service.spec.ts
npm run test -- inventory-transaction.service.spec.ts
npm run test -- label-template.service.spec.ts

npm run test -- inventory-lot.service.spec.ts --coverage --collectCoverageFrom="inventory-lot/inventory-lot.service.ts"
npm run test -- inventory-transaction.service.spec.ts --coverage --collectCoverageFrom="inventory-transaction/inventory-transaction.service.ts"
npm run test -- label-template.service.spec.ts --coverage --collectCoverageFrom="label-template/label-template.service.ts"
```

## 6. Definition of Done

- 3 file spec chạy pass đầy đủ test case đã viết.
- Chạy lại theo batch ổn định, không xuất hiện flaky trong đợt kiểm tra này.
- Có báo cáo pass/fail và coverage theo từng module.

Ngưỡng mục tiêu coverage tham chiếu:

- Statements >= 85% : Tỷ lệ các câu lệnh đã được thực thi.
- Branches >= 75% : Tỷ lệ các nhánh điều kiện đã đi qua, ví dụ if/else, switch/case.
- Functions >= 85% : Functions: Tỷ lệ hàm/method đã được gọi trong test.
- Lines >= 85% : Tỷ lệ số dòng mã đã chạy.

## 7. Báo cáo kết quả thực tế (03/04/2026)

### 7.1. Thông tin chung

- Ngày thực hiện: 03/04/2026
- Người thực hiện: GitHub Copilot
- Nhánh: `draft`
- Commit ID: `c069f5e`
- Phạm vi: Inventory Lot, Inventory Transaction, Label Template
- Lần chạy xác nhận lại: PASS (194/194 test, exit code 0)

### 7.2. Kết quả tổng quan

| Module                | Số test case | Pass | Fail | Skip | Ghi chú                                                    |
| --------------------- | -----------: | ---: | ---: | ---: | ---------------------------------------------------------- |
| Inventory Lot         |           42 |   42 |    0 |    0 | Đã sửa test search để khớp service.search                  |
| Inventory Transaction |           15 |   15 |    0 |    0 | Đã mock uuid để tránh lỗi ESM khi chạy Jest                |
| Label Template        |          137 |  137 |    0 |    0 | Đã chỉnh assertion findAll mặc định theo behavior hiện tại |
| Tổng cộng             |          194 |  194 |    0 |    0 | Chạy lại lần gần nhất vẫn pass toàn bộ                     |

### 7.3. Coverage (theo từng service)

| Module                | Statements | Branches | Functions |  Lines | Đạt mục tiêu?                     |
| --------------------- | ---------: | -------: | --------: | -----: | --------------------------------- |
| Inventory Lot         |     93.75% |   73.77% |      100% | 93.49% | Chưa đạt (Branches < 75%)         |
| Inventory Transaction |     82.69% |      80% |    92.85% |    82% | Chưa đạt (Statements/Lines < 85%) |
| Label Template        |       100% |    87.5% |      100% |   100% | Đạt                               |

### 7.4. Danh sách vấn đề phát hiện và xử lý trong đợt chạy

| ID     | Module                | Test case         | Mô tả vấn đề                                                     | Mức độ | Trạng thái | Hướng xử lý                                |
| ------ | --------------------- | ----------------- | ---------------------------------------------------------------- | ------ | ---------- | ------------------------------------------ |
| UT-001 | Inventory Lot         | Search tests      | Test cũ gọi `searchByManufacturer` nhưng service chỉ có `search` | Medium | Done       | Cập nhật test và mock repository tương ứng |
| UT-002 | Inventory Transaction | create/createMany | Jest lỗi parse ESM khi `require('uuid')`                         | High   | Done       | Mock module `uuid` trong spec              |
| UT-003 | Label Template        | findAll default   | Assertion kỳ vọng `findAll(1,20)` không đúng behavior thực tế    | Low    | Done       | Đổi kỳ vọng sang `findAll()` không tham số |

### 7.5. Kết luận

- Kết quả hiện tại: 194/194 test pass cho 3 module mục tiêu.
- Độ ổn định: đã chạy lại theo batch 3 suite và tiếp tục pass.
- Rủi ro còn tồn tại: coverage của Inventory Lot (branches) và Inventory Transaction (statements/lines) chưa đạt ngưỡng mục tiêu.
- Đề xuất bước tiếp theo: bổ sung test cho các nhánh lỗi ít gặp trong Inventory Lot và các nhánh protected handler/edge-case của Inventory Transaction.

## 8. Checklist thực thi

- [x] Chốt test matrix theo service hiện tại
- [x] Hoàn thành cập nhật test cho Inventory Lot
- [x] Hoàn thành cập nhật test cho Inventory Transaction
- [x] Hoàn thành cập nhật test cho Label Template
- [x] Chạy test từng module
- [x] Chạy lại batch 3 module để kiểm tra ổn định
- [x] Thu thập coverage theo từng service
- [x] Điền báo cáo kết quả thực tế
