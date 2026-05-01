# 03_Prototype - Vibe Coding

## 1. Mục tiêu file chính
File chính [03_Prototype.md](03_Prototype.md) mô tả prototype mức tài liệu cho IMS: mục tiêu, chức năng, wireframe và ghi chú phạm vi.

## 2. Công cụ nhóm sử dụng
- Figma Make: công cụ chính để tạo prototype UI theo prompt dài và đa vai trò.
- Figma (Design mode): tinh chỉnh lại layout, spacing, typography, màu sắc sau khi Figma Make sinh bản đầu.
- VS Code Markdown Preview: cập nhật và rà soát tài liệu mô tả prototype.
- GitHub Copilot Chat (GPT-5.3-Codex): hỗ trợ chuẩn hóa mô tả flow nghiệp vụ đưa vào tài liệu.

## 3. Prompt mẫu đã dùng
### Prompt chính dùng trong Figma Make
"Cho tôi Auth (Chỉ có login và register đơn giản) cho Inventory Management System. Hệ thống này làm cho hiệu thuốc nhé. Tiếng Việt. Tông màu chủ đạo là trắng và ít xanh dương. Sẽ có 4 role đăng nhập (setup nhanh username 1, 2, 3, 4 và pass demo).

Role 1 - Manager:
- Kiểm tra thông tin hàng hóa, bắt buộc có nút Xem chi tiết.
- Kiểm tra số lượng tồn kho theo mã hàng/kho/vị trí.
- Cập nhật thông tin hàng hóa và cập nhật số lượng tồn kho theo quy trình.
- Theo dõi báo cáo tổng hợp và xuất PDF/Excel.

Role 2 - Quality Control Technician:
- Đánh giá lô chờ nhập (Pending), nhập kết quả test, quyết định Approve/Reject/Hold.
- Xử lý hàng không đạt: nhập lý do bắt buộc, upload bằng chứng, khóa lô.
- Tái kiểm tra định kỳ, quarantine hàng loạt khi có sự cố.
- Truy xuất batch history và báo cáo hiệu suất nhà cung cấp.

Role 3 - Operator:
- Nhập kho, xuất kho, kiểm kê kho.
- Tra cứu lịch sử giao dịch, lọc theo thời gian và loại hàng.

Role 4 - IT Administrator:
- Theo dõi trạng thái hệ thống và chỉ số hiệu năng.
- Kiểm tra/xử lý lỗi qua log.
- Quản lý backup/restore và báo cáo vận hành hệ thống."

### Prompt tinh chỉnh vòng 2
"Giữ nguyên flow nghiệp vụ, tối giản UI, ưu tiên dễ thao tác. Trang dashboard mỗi role chỉ hiển thị các action chính theo quyền, thêm trạng thái cảnh báo rõ ràng và CTA nổi bật."

### Prompt tinh chỉnh vòng 3
"Chuẩn hóa toàn bộ text tiếng Việt, thống nhất button label, ưu tiên bảng dữ liệu có filter/search/export, và đảm bảo các màn hình có trạng thái empty/loading/error."

## 4. Cách tiếp cận của nhóm
1. Dùng một prompt tổng dài trong Figma Make để sinh bộ màn hình nền cho 4 role.
2. Chia vòng chỉnh sửa theo thứ tự: Auth -> Manager -> QC -> Operator -> IT Admin.
3. Ưu tiên chốt flow nghiệp vụ trước, sau đó mới tinh chỉnh UI chi tiết.
4. Đặt các ràng buộc bắt buộc ngay trong prompt (ví dụ: nút Xem chi tiết cho Manager).
5. Review chéo với PRD, Backlog và Architecture để tránh lệch nghiệp vụ.
6. Cuối cùng đồng bộ lại mô tả prototype vào file chính để phục vụ báo cáo.

## 5. Checklist hoàn thiện file chính
- Có mục tiêu và phạm vi prototype rõ ràng.
- Có màn hình Auth đơn giản (login/register demo).
- Có danh sách màn hình theo đủ 4 role.
- Có flow chính: inventory, QC, báo cáo, vận hành hệ thống.
- Có nút Xem chi tiết ở các màn hình quản lý hàng hóa (Manager).
- Có ghi chú phần mock/chưa hoàn thiện.
- Có liên kết hoặc ảnh wireframe minh họa.

## 6. Lưu ý cập nhật
Khi luồng nghiệp vụ thay đổi, cập nhật prompt nguồn trong Figma Make trước, sau đó regenerate màn hình và cập nhật lại tài liệu prototype để tránh lệch giữa thiết kế và hệ thống.