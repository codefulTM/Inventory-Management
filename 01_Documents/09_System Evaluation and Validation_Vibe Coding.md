# 09_System Evaluation and Validation - Vibe Coding

## 1. Mục tiêu file chính
File chính [09_System Evaluation and Validation.md](09_System%20Evaluation%20and%20Validation.md) trình bày cách kiểm thử hệ thống, kết quả kiểm thử, kết quả khảo sát và so sánh với hệ thống tương tự.

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex): xây dựng khung đánh giá và bảng kết quả.
- Playwright: kiểm thử E2E UI cho luồng nghiệp vụ chính.
- Jest/Supertest: unit, integration, API e2e backend.
- Jenkins: chạy pipeline kiểm thử và lưu artifact.
- Spreadsheet/Form: tổng hợp kết quả khảo sát người dùng.

## 3. Prompt mẫu đã dùng
### Prompt 1 - Soạn tài liệu kiểm thử
"Viết tài liệu evaluation & validation cho IMS gồm: tiêu chí, công cụ, phương pháp thực thi, kết quả test, kết quả khảo sát, và kết luận cải tiến."

### Prompt 2 - Chọn công cụ phù hợp
"So sánh Selenium và Playwright với hệ thống React + NestJS hiện tại, đề xuất công cụ dễ triển khai hơn và nêu lý do kỹ thuật."

### Prompt 3 - So sánh thị trường
"Tạo bảng so sánh IMS với Zoho Inventory Free theo tiêu chí: triển khai, tùy biến nghiệp vụ, dữ liệu, chi phí, reporting, audit."

## 4. Cách tiếp cận của nhóm
1. Xác định tiêu chí đánh giá có thể đo được.
2. Chọn Playwright làm công cụ E2E chính để đồng bộ stack TypeScript.
3. Tổng hợp kết quả test từ pipeline + test reports.
4. Khảo sát người dùng nội bộ theo role và tổng hợp định lượng.
5. Đối chiếu với Zoho Inventory Free để làm rõ lợi thế/hạn chế.

## 5. Checklist hoàn thiện file chính
- Có phần hướng dẫn cài đặt/đăng ký công cụ kiểm thử.
- Có quy trình thực thi test theo từng lớp.
- Có bảng kết quả test và phân tích lỗi chính.
- Có bảng khảo sát người dùng và nhận xét.
- Có bảng so sánh với Zoho và kết luận khách quan.
- Có đoạn riêng chứa link video YouTube minh họa.

## 6. Lưu ý cập nhật
Sau mỗi vòng regression hoặc UAT, cập nhật lại số liệu PASS/FAIL, khảo sát và hành động cải tiến để đảm bảo tài liệu luôn phản ánh phiên bản mới nhất.