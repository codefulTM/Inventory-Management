# 06_Proof of Concept - Vibe Coding

## 1. Mục tiêu file chính
File chính [06_Proof of Concept.md](06_Proof%20of%20Concept.md) ghi nhận các PoC đã kiểm chứng: Authentication (Keycloak), AI Analysis, Barcode/QR.

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex): lên khung PoC, checklist kiểm chứng, template kết quả.
- Docker Compose: dựng môi trường nhanh cho Keycloak, MongoDB, service backend/frontend.
- Postman/Insomnia: kiểm thử endpoint auth và API nghiệp vụ.
- Playwright/Jest (khi cần): xác nhận luồng chạy end-to-end hoặc regression nhỏ.
- Ảnh/chụp màn hình + log: lưu bằng chứng PoC.

## 3. Prompt mẫu đã dùng
### Prompt 1 - Định nghĩa PoC
"Với tính năng authentication qua Keycloak, hãy soạn khung PoC gồm: mục tiêu, phạm vi, công nghệ, tiêu chí thành công, rủi ro và kết luận."

### Prompt 2 - Viết bước thực thi
"Viết các bước triển khai PoC theo dạng checklist từ cài đặt môi trường, cấu hình, chạy thử, ghi nhận kết quả đến rollback khi lỗi."

### Prompt 3 - Tổng hợp kết quả
"Tạo bảng kết quả PoC gồm: giả thuyết, cách kiểm chứng, kết quả thu được, trạng thái đạt/chưa đạt, hành động tiếp theo."

## 4. Cách tiếp cận của nhóm
1. Chọn tính năng có rủi ro kỹ thuật cao để PoC trước.
2. Xác định tiêu chí thành công đo được (ví dụ login thành công, token verify, barcode generate, AI response đúng format).
3. Triển khai thử nghiệm phạm vi nhỏ nhưng có thể lặp lại.
4. Thu thập bằng chứng: log, ảnh màn hình, response mẫu.
5. Quyết định Go/No-Go cho việc đưa vào hệ thống chính.

## 5. Checklist hoàn thiện file chính
- Mỗi PoC có mục tiêu, phạm vi, công cụ, kết quả, kết luận.
- Có tiêu chí thành công rõ và đo được.
- Có bằng chứng kỹ thuật (ảnh/log/response).
- Có ghi chú rủi ro, giới hạn và việc cần làm tiếp.

## 6. Lưu ý cập nhật
Khi có PoC mới (ví dụ observability, performance, security hardening), thêm vào file này theo cùng format để phục vụ truy vết quyết định kỹ thuật.