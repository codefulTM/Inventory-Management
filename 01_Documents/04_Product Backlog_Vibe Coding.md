# 04_Product Backlog - Vibe Coding

## 1. Mục tiêu file chính
File chính [04_Product Backlog.md](04_Product%20Backlog.md) quản lý user stories theo vai trò, mức ưu tiên và phạm vi release.

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex): chuẩn hóa user story theo template, đề xuất acceptance criteria.
- Jira Board: quản lý backlog thực thi và trạng thái ticket.
- VS Code + Markdown: biên tập backlog bản tài liệu nộp.
- Spreadsheet (Google Sheets/Excel): kiểm tra ưu tiên P0/P1/P2 và năng lực sprint.

## 3. Prompt mẫu đã dùng
### Prompt 1 - Chuẩn hóa user story
"Viết lại danh sách user story theo format: Là <vai trò>, tôi muốn <hành động> để <giá trị>; thêm mức ưu tiên P0/P1/P2."

### Prompt 2 - Tách theo vai trò
"Phân nhóm backlog theo Manager, Operator, Quality Control, IT Administrator; đảm bảo không trùng nghiệp vụ giữa các nhóm."

### Prompt 3 - Mapping kỹ thuật
"Mapping từng user story quan trọng với module kỹ thuật tương ứng: material, inventory-lot, inventory-transaction, qc-test, production-batch, reports, auth."

## 4. Cách tiếp cận của nhóm
1. Thu thập user story từ PRD và domain model.
2. Gắn ưu tiên theo tiêu chí: giá trị nghiệp vụ, độ rủi ro, phụ thuộc kỹ thuật.
3. Chia nhóm theo vai trò người dùng để dễ kiểm thử UAT.
4. Review lại với kiến trúc hiện tại để loại bỏ story không còn phù hợp.
5. Chốt phạm vi MVP (ưu tiên P0) trước khi lên kế hoạch sprint.

## 5. Checklist hoàn thiện file chính
- Mỗi story có ID, vai trò, mục tiêu, ưu tiên.
- Không trùng nghĩa giữa các story.
- Có thể truy vết từ story sang module kỹ thuật.
- Story P0 đủ để chạy end-to-end.
- Backlog phản ánh đúng hệ thống hiện tại (lot-centric + QC-centric).

## 6. Lưu ý cập nhật
Mỗi khi đổi phạm vi sprint hoặc kiến trúc module, cập nhật backlog và giữ lịch sử thay đổi ưu tiên để phục vụ phần quản lý dự án.