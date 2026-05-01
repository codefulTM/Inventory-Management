# Bản Nháp Prototype Hệ Thống Quản Lý Kho

## 1. Giới thiệu
Tài liệu này mô tả bản nháp prototype cho hệ thống Quản lý kho, nhằm minh họa các chức năng chính và giao diện dự kiến.

## 2. Mục tiêu
- Minh họa các chức năng chính của hệ thống.
- Định hướng giao diện người dùng.
- Làm cơ sở để phát triển và lấy ý kiến phản hồi.

## 3. Chức năng chính
- Quản lý sản phẩm (thêm, sửa, xóa, tìm kiếm).
- Quản lý nhập kho, xuất kho.
- Quản lý tồn kho.
- Báo cáo, thống kê.
- Quản lý người dùng, phân quyền.

## 4. Prototype giao diện theo luồng quy trình nghiệp vụ chính

### 4.1 Luồng chính: Kiểm soát chất lượng đầu vào (QC Inbound) -> Tái kiểm định -> Truy xuất

Mục tiêu luồng: đảm bảo lô hàng đầu vào được kiểm định, phân loại đúng trạng thái (đạt/không đạt), và có thể truy xuất toàn bộ lịch sử xử lý.

#### Bước 1. Vào Dashboard QC để theo dõi tổng quan
- Người dùng vai trò Quality Control Technician mở bảng điều khiển QC.
- Màn hình hiển thị KPI chính: số lô chờ lấy mẫu, số lô đạt, số lô từ chối, tỷ lệ lỗi.

![Bước 1 - Dashboard QC](Images/QualityControlTechnician/DashboardScreen.png)

#### Bước 2. Mở màn hình Kiểm soát đầu vào và chọn lô cần kiểm định
- Điều hướng tới menu Kiểm soát đầu vào.
- Tìm kiếm hoặc lọc lô đang chờ, sau đó bấm Tiến hành kiểm định.

![Bước 2 - Danh sách lô chờ kiểm định](Images/QualityControlTechnician/InboundScreen.png)

#### Bước 3. Nhập kết quả kiểm nghiệm và quyết định trạng thái lô
- Trong popup kiểm định, nhập các chỉ số thực tế (độ ẩm, tinh khiết, cảm quan).
- Chọn quyết định trạng thái và nhãn hệ thống cho lô.

![Bước 3 - Popup kiểm định lô](Images/QualityControlTechnician/CheckBatch.png)

#### Bước 4. Xử lý trường hợp không đạt (Reject)
- Nếu lô không đạt, hệ thống yêu cầu nhập lý do từ chối và tải bằng chứng kiểm nghiệm.
- Đây là bước bắt buộc trước khi xác nhận cập nhật trạng thái.

![Bước 4 - Từ chối lô và nhập lý do](Images/QualityControlTechnician/RejectBatch.png)

#### Bước 5. Theo dõi cảnh báo chất lượng và thực hiện tái kiểm định
- Lô đến hạn tái kiểm hoặc có cảnh báo được hiển thị trong tab Quality Alert.
- Người dùng thực hiện re-test và đưa ra quyết định mới (gia hạn hoặc hủy bỏ).

![Bước 5a - Danh sách cảnh báo chất lượng](Images/QualityControlTechnician/QualityAlertScreen.png)

![Bước 5b - Kết quả tái kiểm định](Images/QualityControlTechnician/RetestScreen.png)

#### Bước 6. Truy xuất và báo cáo sau kiểm định
- Sau khi xử lý lô, người dùng truy cập Báo cáo & Truy vết để xem trạng thái, timeline xử lý và hiệu suất nhà cung cấp.
- Có thể mở chi tiết lỗi nhà cung cấp để phục vụ hành động khắc phục.

![Bước 6a - Truy xuất lô hàng](Images/QualityControlTechnician/Report%26TraceabilityScreen.png)

![Bước 6b - Timeline truy xuất lô](Images/QualityControlTechnician/TimelineTraceability.png)

![Bước 6c - Hiệu suất nhà cung cấp](Images/QualityControlTechnician/Efficiency.png)

![Bước 6d - Chi tiết lỗi nhà cung cấp](Images/QualityControlTechnician/ErrorDetail.png)

### 4.2 Luồng bổ sung: Kiểm định lô thành phẩm
- Màn hình danh sách lô thành phẩm chờ kiểm định.
- Popup quy trình kiểm định thành phẩm để nhập chỉ tiêu và phân loại nhãn.

![Luồng thành phẩm - Danh sách lô](Images/QualityControlTechnician/CheckProduct.png)

![Luồng thành phẩm - Popup quy trình](Images/QualityControlTechnician/CheckProductProcess.png)

## 5. Ghi chú
- Prototype chỉ mang tính chất tham khảo, có thể thay đổi trong quá trình phát triển.
