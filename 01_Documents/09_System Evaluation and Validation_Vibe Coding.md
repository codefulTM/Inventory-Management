# 09_System Evaluation and Validation - Vibe Coding

## 1. Mục tiêu file chính
File chính [09_System Evaluation and Validation.md](09_System%20Evaluation%20and%20Validation.md) trình bày cách kiểm thử hệ thống, kết quả kiểm thử, kết quả khảo sát và so sánh với hệ thống tương tự.

Mục tiêu của file Vibe Coding này:
- Trình bày chi tiết cách nhóm dùng công cụ và prompt để tạo mới và cập nhật tài liệu Evaluation và Validation chính.
- Chứng minh quy trình đánh giá có tiêu chí đo được, có bằng chứng test và có kết luận cải tiến.
- Thể hiện cách phối hợp với agent để chuẩn hóa tài liệu nhưng vẫn giữ kiểm chứng thực nghiệm từ nhóm.

---

## 2. Phạm vi và nguyên tắc đánh giá

Phạm vi:
- Đánh giá theo 4 lớp: unit, integration, API e2e, UI e2e.
- Bổ sung kết quả khảo sát nội bộ và so sánh với hệ thống tham chiếu thị trường.
- Ghi nhận kết quả theo phiên bản và chu kỳ regression hoặc UAT.

Nguyên tắc:
- Tiêu chí đánh giá phải đo được bằng số liệu hoặc bằng chứng test.
- Kết quả PASS/FAIL phải có nguồn dữ liệu rõ (report, log, pipeline).
- Kết luận cải tiến phải gắn với lỗi chính phát hiện được.
- AI hỗ trợ xây khung và chuẩn hóa trình bày; nhóm chịu trách nhiệm chạy test và xác minh dữ liệu.

---

## 3. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex, Claude sonnet 4.5)
	- Vai trò: xây dựng khung đánh giá, tạo bảng kết quả và checklist validation.
	- Cách dùng: prompt theo Giai đoạn, yêu cầu tách phần dữ liệu đã kiểm chứng và phần đề xuất.

- Jest và Supertest
	- Vai trò: unit test, integration test và API e2e backend (công cụ E2E đang vận hành chính thức).
	- Cách dùng: tổng hợp kết quả theo nhóm test để đưa vào bảng PASS/FAIL.

- UI smoke checklist/UAT nội bộ
	- Vai trò: kiểm thử lớp giao diện theo role trong giai đoạn chưa có UI automation chính thức.
	- Cách dùng: chạy checklist theo role và lưu screenshot/video lỗi làm bằng chứng.

- Playwright 
	- Vai trò: hướng mở rộng để tự động hóa UI E2E trong các vòng nâng cấp tiếp theo.
	- Cách dùng: chỉ đưa vào khi frontend có cấu hình test runner chính thức.

- Jenkins
	- Vai trò: chạy pipeline kiểm thử và lưu artifact phục vụ truy vết.
	- Cách dùng: dùng kết quả pipeline làm nguồn dữ liệu chính cho báo cáo validation.

- VS Code + Markdown Preview
	- Vai trò: biên tập tài liệu đánh giá và rà soát tính nhất quán giữa các bảng kết quả.

---

## 4. Prompt mẫu đã dùng

### Prompt 1 - Đọc bối cảnh trước khi viết tài liệu đánh giá
"Hãy đọc tài liệu yêu cầu, kiến trúc, coding standards và PoC để đề xuất khung evaluation & validation phù hợp cho phiên bản hiện tại."

### Prompt 2 - Soạn tài liệu kiểm thử tổng thể
"Viết tài liệu evaluation & validation cho IMS gồm: tiêu chí, công cụ, phương pháp thực thi, kết quả test, kết quả khảo sát, và kết luận cải tiến."

### Prompt 3 - Chọn công cụ phù hợp cho E2E
"Đối chiếu công cụ E2E đang chạy thực tế trong repo và CI. Nếu backend đang dùng Jest/Supertest, hãy ghi rõ hiện trạng; chỉ đề xuất Playwright như roadmap cho UI automation."

### Prompt 4 - Thiết kế test strategy theo lớp
"Tạo test strategy nhiều lớp gồm unit, integration, API e2e (Jest/Supertest), UI smoke checklist/UAT; nêu rõ mục tiêu, phạm vi và điều kiện chạy của từng lớp."

### Prompt 5 - Tạo bảng kết quả PASS/FAIL chuẩn hóa
"Tạo bảng kết quả test theo từng nhóm: số test case, pass, fail, tỷ lệ đạt, lỗi chính và hành động tiếp theo."

### Prompt 6 - Prompt tổng hợp lỗi trọng yếu
"Từ test report và log pipeline, tổng hợp top lỗi ảnh hưởng lớn nhất, phân loại severity, và đề xuất kế hoạch khắc phục."

### Prompt 7 - Prompt chuẩn hóa khảo sát người dùng
"Tạo mẫu khảo sát người dùng nội bộ theo role với thang điểm định lượng và câu hỏi mở; sau đó đề xuất cách tổng hợp kết quả vào tài liệu."

### Prompt 8 - Prompt so sánh thị trường
"Tạo bảng so sánh IMS với Zoho Inventory Free theo tiêu chí: triển khai, tùy biến nghiệp vụ, dữ liệu, chi phí, reporting, audit."

### Prompt 9 - Prompt cập nhật file chính bằng patch
"Đề xuất patch cập nhật file 09_System Evaluation and Validation.md theo cấu trúc hiện tại, chỉ bổ sung dữ liệu mới và tránh làm mất nội dung cũ."

### Prompt 10 - Prompt phản biện cuối
"Review tài liệu evaluation & validation như QA Lead: chỉ ra chỉ số thiếu bằng chứng, kết luận chưa đủ dữ liệu, hoặc so sánh thị trường thiếu khách quan."

---

## 5. Quy trình làm việc chi tiết với agent
1. Thu thập bối cảnh từ phiên bản hệ thống hiện tại và phạm vi test cần đánh giá.
2. Yêu cầu agent đề xuất khung evaluation & validation phù hợp.
3. Nhóm chạy test thực tế theo từng lớp và thu thập artifact.
4. Yêu cầu agent tổng hợp số liệu test thành bảng chuẩn.
5. Nhóm đối chiếu lại số liệu với report thực tế từ CI và local.
6. Yêu cầu agent hỗ trợ tổng hợp khảo sát người dùng theo role.
7. Yêu cầu agent tạo bảng so sánh với hệ thống tham chiếu.
8. Chốt kết luận cải tiến và cập nhật file chính.

Điểm nhấn:
- AI không thay thế bước chạy test thực tế.
- Kết luận chỉ được ghi khi có dữ liệu kiểm chứng đi kèm.

---

## 6. Mẫu vòng trao đổi liên tục với agent

Vòng 1:
- Người dùng: yêu cầu đọc bối cảnh và đề xuất tiêu chí đánh giá.
- Agent: trả về khung tiêu chí và phương pháp kiểm thử.

Vòng 2:
- Người dùng: yêu cầu test strategy theo lớp.
- Agent: trả về bộ kế hoạch test và dữ liệu cần thu.

Vòng 3:
- Người dùng: gửi kết quả từ test reports và pipeline.
- Agent: tổng hợp bảng PASS/FAIL và lỗi trọng yếu.

Vòng 4:
- Người dùng: yêu cầu phân tích khảo sát người dùng và so sánh thị trường.
- Agent: trả về bảng tổng hợp và kết luận nháp.

Vòng 5:
- Người dùng: yêu cầu phản biện cuối và patch cập nhật file chính.
- Agent: đề xuất sửa cụ thể theo ưu tiên.

---

## 7. Bảng kiểm chứng trước khi cập nhật file chính

| Hạng mục | AI đề xuất | Nhóm kiểm chứng thủ công | Nguồn kiểm chứng |
| :-- | :-- | :-- | :-- |
| Tiêu chí đánh giá | Có | Có | Scope release và user stories |
| Test strategy theo lớp | Có | Có | QA plan nội bộ |
| Kết quả PASS/FAIL | Có | Có | Jest, Supertest, Jenkins logs, UI smoke checklist |
| Lỗi chính và severity | Có | Có | Pipeline logs + defect list |
| Kết quả khảo sát | Có | Có | Form hoặc spreadsheet nội bộ |
| So sánh thị trường | Có | Có | Nguồn tài liệu tham chiếu công khai |
| Link video minh họa | Có | Có | Link YouTube của nhóm |

Ý nghĩa:
- Đảm bảo tài liệu đánh giá phản ánh đúng dữ liệu thực nghiệm.

---

## 8. Cách tiếp cận của nhóm
1. Xác định tiêu chí đánh giá có thể đo được.
2. Chạy E2E API chính thức bằng Jest/Supertest và theo dõi kết quả trên CI.
3. Tổng hợp kết quả test từ pipeline và test reports.
4. Chạy UI smoke checklist/UAT theo role và lưu bằng chứng.
5. Khảo sát người dùng nội bộ theo role và tổng hợp định lượng.
6. Đối chiếu với Zoho Inventory Free để làm rõ lợi thế và hạn chế.
7. Cập nhật tài liệu theo chu kỳ regression hoặc UAT.

---

## 9. Checklist hoàn thiện file chính
- Có phần hướng dẫn cài đặt hoặc đăng ký công cụ kiểm thử.
- Có quy trình thực thi test theo từng lớp.
- Có bảng kết quả test và phân tích lỗi chính.
- Có bảng khảo sát người dùng và nhận xét.
- Có bảng so sánh với Zoho và kết luận khách quan.
- Có đoạn riêng chứa link video YouTube minh họa.
- Có hành động cải tiến gắn với lỗi và chỉ số thực tế.

---

## 10. Minh chứng không phụ thuộc hoàn toàn vào AI
- Agent chỉ hỗ trợ khung và chuẩn hóa biểu diễn, không tạo dữ liệu test giả để kết luận.
- Tất cả số liệu PASS/FAIL đều lấy từ kết quả chạy test thực tế.
- Nhóm luôn có vòng kiểm chứng chéo trước khi cập nhật file chính.
- Khi kết quả thực nghiệm khác với gợi ý AI, nhóm ưu tiên dữ liệu từ pipeline và report.

## 11. Lưu ý cập nhật
Sau mỗi vòng regression hoặc UAT:
- Cập nhật lại số liệu PASS/FAIL, lỗi trọng yếu và trạng thái khắc phục.
- Cập nhật lại kết quả khảo sát người dùng nếu có thay đổi lớn về giao diện hoặc quy trình.
- Cập nhật phần kết luận cải tiến để tài liệu phản ánh phiên bản mới nhất.