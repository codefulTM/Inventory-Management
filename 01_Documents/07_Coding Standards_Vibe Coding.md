# 07_Coding Standards - Vibe Coding

## 1. Mục tiêu file chính
File chính [07_Coding Standards.md](07_Coding%20Standards.md) định nghĩa chuẩn code phù hợp hiện trạng hệ thống IMS và roadmap nâng chuẩn.

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex): tổng hợp quy ước coding từ thực tế codebase.
- Tìm kiếm mã nguồn và cấu hình trong repo: kiểm tra ESLint/Prettier/Jest/tsconfig/scripts.
- VS Code Problems + terminal scripts: đối chiếu lint/test/build flow.
- Jenkinsfile: xác định quality gates đang áp dụng trong CI.

## 3. Prompt mẫu đã dùng
### Prompt 1 - Đánh giá tuân thủ
"Đối chiếu coding standard hiện tại với codebase IMS, liệt kê phần đang tuân thủ, chưa tuân thủ, và bằng chứng theo file cấu hình."

### Prompt 2 - Soạn chuẩn mới
"Viết lại coding standards theo nguyên tắc: phản ánh hiện trạng thực tế, tách rõ rule bắt buộc và roadmap, hạn chế mâu thuẫn với source hiện tại."

### Prompt 3 - Chốt checklist PR
"Tạo checklist trước merge cho dự án TypeScript microservices gồm lint, test, review, security notes và phạm vi tài liệu cần cập nhật."

## 4. Cách tiếp cận của nhóm
1. Khảo sát toàn bộ package chính và scripts thực tế.
2. Đối chiếu tiêu chuẩn cũ với mức triển khai thực tế.
3. Loại bỏ rule không còn phù hợp hoặc chưa khả thi ngay.
4. Chia nội dung thành 2 lớp: áp dụng ngay và roadmap.
5. Chốt tài liệu để team dùng trực tiếp trong PR workflow.

## 5. Checklist hoàn thiện file chính
- Chuẩn code bám đúng stack hiện tại (TypeScript/NestJS/React).
- Rule bảo mật tài liệu/secrets được nêu rõ.
- Quy trình trước merge có thể thực hiện được ngay.
- Có phần trạng thái hiện tại + roadmap nâng chuẩn.

## 6. Lưu ý cập nhật
Mỗi lần thay đổi toolchain (ESLint major, test framework, CI pipeline), cập nhật file chuẩn trong cùng release gần nhất.