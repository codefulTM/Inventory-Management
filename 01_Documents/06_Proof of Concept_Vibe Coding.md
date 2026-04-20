# 06_Proof of Concept - Vibe Coding

## 1. Mục tiêu file chính
File chính [06_Proof of Concept.md](06_Proof%20of%20Concept.md) ghi nhận các PoC đã kiểm chứng: Authentication (Keycloak), AI Analysis, Barcode/QR.

Mục tiêu của file Vibe Coding này:
- Trình bày chi tiết cách nhóm dùng công cụ và prompt để tạo mới và cập nhật file PoC chính.
- Chứng minh quá trình PoC có giả thuyết, có cách kiểm chứng, có bằng chứng, và có kết luận Go/No-Go.
- Thể hiện cách làm có trao đổi liên tục với agent nhưng quyết định kỹ thuật vẫn do nhóm kiểm soát.

---

## 2. Phạm vi và nguyên tắc thực hiện PoC

Phạm vi:
- Tập trung vào các PoC có rủi ro kỹ thuật cao và ảnh hưởng trực tiếp tới quyết định thiết kế hệ thống.
- Tài liệu hóa đủ để nhóm khác có thể lặp lại thử nghiệm và kiểm chứng lại kết quả.

Nguyên tắc:
- PoC không nhằm hoàn thiện toàn bộ production, mà nhằm trả lời câu hỏi khả thi kỹ thuật.
- Mỗi PoC phải có tiêu chí đo được, không dùng đánh giá cảm tính.
- Kết quả chỉ được ghi vào file chính khi có bằng chứng kỹ thuật đi kèm.
- AI hỗ trợ tổng hợp và chuẩn hóa tài liệu; nhóm chịu trách nhiệm kiểm thử và xác nhận cuối cùng.

---

## 3. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex, Claude sonnet 4.5)
	- Vai trò: tạo khung PoC, đề xuất giả thuyết, checklist thực thi, và template tổng hợp kết quả.
	- Cách dùng: prompt theo Giai đoạn, có vòng phản biện, có yêu cầu nêu rõ điểm chưa chắc chắn.

- Docker Compose
	- Vai trò: dựng môi trường thử nghiệm nhanh cho Keycloak, MongoDB, backend, frontend.
	- Cách dùng: chạy theo kịch bản lặp lại để giảm sai khác giữa các lần PoC.

- Postman hoặc Insomnia
	- Vai trò: kiểm chứng endpoint auth và API nghiệp vụ trong từng kịch bản PoC.
	- Cách dùng: lưu request mẫu và response mẫu làm bằng chứng.

- Playwright hoặc Jest (khi cần)
	- Vai trò: xác nhận luồng end-to-end và kiểm tra hồi quy nhỏ sau thay đổi PoC.
	- Cách dùng: dùng cho các luồng quan trọng cần chứng minh tính lặp lại.

- Ảnh chụp màn hình, log runtime, response mẫu
	- Vai trò: bằng chứng kỹ thuật cho kết luận PoC.
	- Cách dùng: gắn vào phần kết quả để phục vụ truy vết quyết định.

- VS Code + Markdown Preview
	- Vai trò: biên tập tài liệu PoC và rà soát cấu trúc trước khi chốt file chính.

## 4. Prompt mẫu đã dùng
### Prompt 1 - Đọc bối cảnh trước khi lập PoC
"Hãy đọc PRD, Product Backlog, Architecture và workflow liên quan. Tóm tắt bài toán cần kiểm chứng trong PoC và chỉ ra rủi ro kỹ thuật lớn nhất nếu không làm PoC."

### Prompt 2 - Định nghĩa PoC theo giả thuyết
"Với tính năng Authentication qua Keycloak, hãy soạn PoC card gồm: giả thuyết, mục tiêu, phạm vi, non-goals, tiêu chí thành công đo được, rủi ro, tiêu chí Go/No-Go."

### Prompt 3 - Thiết kế kế hoạch thực thi có thể lặp lại
"Viết các bước thực thi PoC theo checklist từ chuẩn bị môi trường, cấu hình, chạy thử, ghi log, thu bằng chứng, tổng hợp kết quả, đến rollback khi lỗi."

### Prompt 4 - Bộ câu hỏi What và Why để đào sâu trước khi chạy thử
"Đặt tối thiểu 10 câu hỏi What/Why cho PoC này: kiểm chứng gì, tại sao quan trọng, và nếu thất bại thì ảnh hưởng kiến trúc ra sao."

### Prompt 5 - Prompt kiểm chứng PoC Authentication
"Tạo test matrix cho PoC Authentication gồm: login thành công, token verify, role-based access, refresh token, lỗi token hết hạn, logout, và lỗi khi Keycloak không phản hồi."

### Prompt 6 - Prompt kiểm chứng PoC AI Analysis
"Tạo checklist kiểm chứng PoC AI Analysis gồm: định dạng response, thời gian phản hồi, tỷ lệ lỗi từ API ngoài, fallback khi model timeout, và tính nhất quán output theo cùng input."

### Prompt 7 - Prompt kiểm chứng PoC Barcode và QR
"Tạo checklist kiểm chứng PoC Barcode/QR gồm: generate, lookup, tính duy nhất mã, khả năng hiển thị, khả năng copy hoặc export, và độ ổn định khi tạo liên tiếp nhiều mã."

### Prompt 8 - Prompt tổng hợp kết quả chuẩn hóa
"Tạo bảng kết quả PoC gồm: giả thuyết, cách kiểm chứng, dữ liệu đầu vào, kết quả thu được, bằng chứng, trạng thái đạt hoặc chưa đạt, quyết định Go hoặc No-Go, hành động tiếp theo."

### Prompt 9 - Prompt cập nhật file PoC chính
"Từ kết quả PoC đã xác nhận, hãy đề xuất patch cập nhật file 06_Proof of Concept.md theo đúng cấu trúc hiện có, không làm mất nội dung cũ, chỉ bổ sung phần còn thiếu."

### Prompt 10 - Prompt phản biện chất lượng tài liệu
"Review tài liệu PoC hiện tại như reviewer kỹ thuật: chỉ ra chỗ thiếu bằng chứng, tiêu chí chưa đo được, kết luận chưa đủ cơ sở, hoặc bước thực thi không thể lặp lại."

---

## 5. Quy trình làm việc chi tiết với agent

1. Chọn PoC cần làm theo mức rủi ro kỹ thuật và ảnh hưởng tới quyết định kiến trúc.
2. Yêu cầu agent đọc bối cảnh tài liệu trước khi đề xuất PoC.
3. Chốt giả thuyết và tiêu chí thành công đo được với nhóm.
4. Yêu cầu agent tạo checklist thực thi và danh sách bằng chứng cần thu thập.
5. Nhóm tự chạy thử trên môi trường nhỏ, ghi log và chụp kết quả.
6. Yêu cầu agent tổng hợp kết quả theo bảng chuẩn và gắn trạng thái Go hoặc No-Go.
7. Nhóm phản biện kết quả, sửa các điểm mơ hồ.
8. Cập nhật vào file PoC chính và lưu lịch sử thay đổi.

Điểm nhấn:
- AI không thay thế bước kiểm thử thực tế.
- Kết luận chỉ được chốt khi có bằng chứng kỹ thuật đủ mạnh.

---

## 6. Mẫu vòng trao đổi liên tục với agent

Vòng 1:
- Người dùng: yêu cầu đọc tài liệu liên quan và nêu rủi ro cần PoC.
- Agent: trả về bài toán và giả thuyết kiểm chứng.

Vòng 2:
- Người dùng: yêu cầu thiết kế checklist PoC và test matrix.
- Agent: trả về kế hoạch thực thi theo bước.

Vòng 3:
- Người dùng: chạy thử, gửi log và ảnh chụp cho agent tổng hợp.
- Agent: tổng hợp kết quả và đánh giá đạt hoặc chưa đạt.

Vòng 4:
- Người dùng: yêu cầu agent phản biện ngược kết quả để tìm lỗ hổng.
- Agent: nêu điểm thiếu bằng chứng và đề xuất kiểm chứng bổ sung.

Vòng 5:
- Người dùng: yêu cầu patch cập nhật file PoC chính.
- Agent: đề xuất cập nhật nội dung theo đúng format tài liệu.

---

## 7. Bảng công cụ theo từng PoC

| PoC | Công cụ chính | Công cụ kiểm chứng | Bằng chứng bắt buộc |
| :-- | :-- | :-- | :-- |
| Authentication với Keycloak | Docker Compose, Copilot | Postman hoặc Insomnia, log auth | access token mẫu, kết quả verify, ảnh login, log lỗi |
| AI Analysis cho QC | Copilot, API client | log request hoặc response, đo thời gian phản hồi | response mẫu đúng format, log lỗi timeout hoặc fallback |
| Barcode và QR Code | Backend và frontend local, Copilot | API test, kiểm tra hiển thị giao diện | mã mẫu sinh ra, kết quả tra cứu, ảnh giao diện |

---

## 8. Cách tiếp cận của nhóm
1. Chọn tính năng có rủi ro kỹ thuật cao để PoC trước.
2. Xác định tiêu chí thành công đo được.
3. Triển khai thử nghiệm phạm vi nhỏ nhưng có thể lặp lại.
4. Thu thập bằng chứng: log, ảnh màn hình, response mẫu.
5. Đánh giá Go hoặc No-Go trước khi đưa vào hệ thống chính.
6. Cập nhật tài liệu PoC chính ngay sau khi kết luận để tránh thất lạc thông tin.

---

## 9. Checklist hoàn thiện file chính
- Mỗi PoC có giả thuyết, mục tiêu, phạm vi, non-goals, công cụ, kết quả, kết luận.
- Có tiêu chí thành công rõ, đo được và gắn với dữ liệu thực tế.
- Có bằng chứng kỹ thuật đủ kiểm chứng: log, ảnh, response mẫu.
- Có bảng kết quả đạt hoặc chưa đạt và quyết định Go hoặc No-Go.
- Có ghi chú rủi ro, giới hạn và hành động tiếp theo.
- Có thể truy vết từ PoC về quyết định kiến trúc hoặc backlog liên quan.

---

## 10. Minh chứng không phụ thuộc hoàn toàn vào AI
- Agent chỉ tạo khung và đề xuất kế hoạch; nhóm tự chạy thử và xác minh kết quả.
- Mọi kết luận đều dựa trên bằng chứng runtime thay vì mô tả lý thuyết.
- Nhóm luôn có vòng phản biện lại output của agent trước khi cập nhật file chính.
- Khi dữ liệu thực tế mâu thuẫn với gợi ý AI, nhóm ưu tiên kết quả kiểm chứng thực nghiệm.

## 11. Lưu ý cập nhật
Khi có PoC mới (ví dụ observability, performance, security hardening):
- Thêm theo cùng format để giữ tính nhất quán.
- Dùng lại bộ prompt theo Giai đoạn để tiết kiệm thời gian nhưng vẫn đảm bảo chất lượng.
- Luôn cập nhật phần kết luận và hành động tiếp theo để phục vụ quyết định kỹ thuật ở sprint sau.