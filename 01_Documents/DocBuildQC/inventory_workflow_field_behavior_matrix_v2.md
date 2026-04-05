# Field Behavior Matrix v2 (Operator + Manager)

## 1) Mục tiêu

Ma trận này định nghĩa hành vi từng trường dữ liệu theo role, màn hình, và loại thao tác để backend/frontend triển khai đồng bộ.

---

## 2) Operator - Tạo phiếu nhập kho (Inbound)

| Trường            | UI Type       | Bắt buộc                | Nguồn dữ liệu            | Editable            | Hành vi                             |
| :---------------- | :------------ | :---------------------- | :----------------------- | :------------------ | :---------------------------------- |
| order_type        | Hidden/Fixed  | Có                      | System                   | Không               | Luôn là Inbound                     |
| warehouse_id      | Dropdown/Text | Có                      | DB/config                | Có                  | Chọn kho làm việc                   |
| material_id       | Dropdown      | Có                      | `GET /materials/options` | Có                  | Chỉ chọn từ danh sách vật tư hợp lệ |
| lot_id            | Text readonly | Có (ở payload response) | Sinh tự động             | Không               | Auto-fill theo sequence LOT-xxx     |
| quantity          | Number        | Có                      | User input               | Có                  | > 0                                 |
| unit_of_measure   | Auto/Readonly | Có                      | Theo material            | Không (khuyến nghị) | Tự điền theo vật tư                 |
| expected_location | Text/Dropdown | Không                   | User/Rule                | Có                  | Gợi ý vị trí lưu kho                |
| reason            | Textarea      | Không                   | User input               | Có                  | Lý do nhập                          |
| reference_number  | Text          | Không                   | User input               | Có                  | Mã tham chiếu chứng từ              |

Quy tắc bổ sung:

- Không cho nhập tay lot_id.
- Nếu thêm dòng item mới, mỗi dòng được cấp lot sequence riêng.

---

## 3) Operator - Tạo phiếu xuất kho (Outbound)

| Trường            | UI Type       | Bắt buộc | Nguồn dữ liệu                 | Editable | Hành vi                             |
| :---------------- | :------------ | :------- | :---------------------------- | :------- | :---------------------------------- |
| order_type        | Hidden/Fixed  | Có       | System                        | Không    | Luôn là Outbound                    |
| warehouse_id      | Dropdown/Text | Có       | DB/config                     | Có       | Chọn kho làm việc                   |
| lot_id            | Dropdown      | Có       | `GET /inventory-lots/options` | Có       | Chỉ chọn lot hợp lệ để xuất         |
| material_id       | Text readonly | Có       | Theo lot đã chọn              | Không    | Auto-fill theo lot                  |
| quantity          | Number        | Có       | User input                    | Có       | > 0, kiểm tra đủ tồn ở bước confirm |
| unit_of_measure   | Auto/Readonly | Có       | Theo lot                      | Không    | Tự điền theo lot                    |
| expected_location | Text/Dropdown | Không    | Theo lot/User                 | Có       | Gợi ý vị trí lấy hàng               |
| reason            | Textarea      | Không    | User input                    | Có       | Lý do xuất                          |
| reference_number  | Text          | Không    | User input                    | Có       | Mã tham chiếu                       |

Quy tắc bổ sung:

- Đổi lot sẽ cập nhật material + UOM tương ứng.
- Không cho sửa material thủ công khi lot đã chọn.

---

## 4) Scan-to-fill theo order type

| Order Type | Input scan        | Ưu tiên resolve                           | Field được điền                                                 | Field bị khóa                 |
| :--------- | :---------------- | :---------------------------------------- | :-------------------------------------------------------------- | :---------------------------- |
| Inbound    | material/part/lot | material_id -> part_number -> lot_id      | material_id, unit_of_measure, expected_location, lot_id dự kiến | lot_id không nhập tay         |
| Outbound   | lot/material      | lot_id -> manufacturer_lot -> material_id | lot_id, material_id, unit_of_measure, expected_location         | material_id readonly theo lot |

Hành vi khi resolve thất bại:

- Không xóa dữ liệu dòng hiện tại.
- Hiển thị thông báo lỗi/nghi ngờ để người dùng chọn lại dropdown.

---

## 5) Manager - /manager/in-out (xác nhận/từ chối)

| Trường                          | UI Type  | Bắt buộc       | Editable | Hành vi                                |
| :------------------------------ | :------- | :------------- | :------- | :------------------------------------- |
| confirmed_items.actual_quantity | Number   | Có             | Có       | Nhập blind count để xác nhận           |
| confirm_note                    | Textarea | Không          | Có       | Ghi chú xác nhận                       |
| reject_reason                   | Textarea | Có khi từ chối | Có       | Bắt buộc khi reject                    |
| order status                    | Badge    | Có             | Không    | Chuyển Confirmed/Rejected sau thao tác |

---

## 6) Manager - /manager/stock (điều chỉnh tồn kho trực tiếp)

| Trường              | UI Type       | Bắt buộc     | Nguồn dữ liệu                 | Editable | Hành vi                             |
| :------------------ | :------------ | :----------- | :---------------------------- | :------- | :---------------------------------- |
| lot_id              | Dropdown      | Có           | `GET /inventory-lots/options` | Có       | Chọn từ lot hiện có, không nhập tay |
| adjustment_quantity | Number        | Có           | User input                    | Có       | Khác 0                              |
| reason_code         | Dropdown      | Có           | Enum hệ thống                 | Có       | Bắt buộc chọn                       |
| reason_note         | Textarea      | Có điều kiện | User input                    | Có       | Bắt buộc nếu reason_code = OTHER    |
| unit_cost_snapshot  | Number        | Có           | User input/system             | Có       | >= 0                                |
| material_id         | Text readonly | Có           | Auto theo lot                 | Không    | Hiển thị để đối soát                |

Kết quả sau submit:

- Thực thi thay đổi tồn kho ngay.
- Tự sinh bản ghi adjustment + transaction + audit.
- Hiển thị before/after quantity và valuation delta.

---

## 7) Chuẩn hóa tiếng Việt cho label/input

| Khóa nghiệp vụ      | Nhãn chuẩn          |
| :------------------ | :------------------ |
| material_id         | Mã vật tư           |
| lot_id              | Mã lô               |
| quantity            | Số lượng            |
| unit_of_measure     | Đơn vị tính         |
| expected_location   | Vị trí kỳ vọng      |
| warehouse_id        | Kho                 |
| reason              | Lý do               |
| reference_number    | Mã tham chiếu       |
| adjustment_quantity | Số lượng điều chỉnh |
| reason_code         | Mã lý do            |
| reason_note         | Ghi chú lý do       |
| unit_cost_snapshot  | Đơn giá tham chiếu  |

Khuyến nghị:

- Không trộn label Việt-Anh trong cùng form.
- Thông báo lỗi và thành công dùng tiếng Việt có dấu thống nhất.

---

## 8) Validation matrix tối thiểu

| Rule                           | Inbound                           | Outbound      | Adjustment    |
| :----------------------------- | :-------------------------------- | :------------ | :------------ |
| quantity > 0                   | Có                                | Có            | N/A           |
| adjustment_quantity != 0       | N/A                               | N/A           | Có            |
| unit_cost_snapshot >= 0        | N/A                               | N/A           | Có            |
| material_id phải tồn tại       | Có                                | Auto theo lot | Auto theo lot |
| lot_id phải tồn tại trong DB   | Không bắt buộc khi tạo (reserved) | Có            | Có            |
| reason_note bắt buộc khi OTHER | N/A                               | N/A           | Có            |

---

## 9) Kết quả mong đợi của Phase 1

- Backend và frontend thống nhất contract v2 trước khi code.
- Tránh phát sinh thay đổi ngược ở Phase 2/3/4.
- Giảm rủi ro sai nghiệp vụ do nhập tay trường khóa.
