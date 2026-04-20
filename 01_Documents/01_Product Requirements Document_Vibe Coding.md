# 01_Product Requirements Document - Vibe Coding

## 1. Mục tiêu file chính
File chính [01_Product Requirements Document.md](01_Product Requirements Document.md) mô tả đầy đủ:
- Bối cảnh nghiệp vụ và pain points thực tế của IMS.
- Mục tiêu theo vai trò (Manager, Operator, Quality Control, IT Admin).
- Luồng nghiệp vụ end-to-end theo hệ thống đang chạy.
- Functional requirements, non-functional requirements, acceptance criteria.
- Phạm vi MVP và phần mở rộng theo roadmap.

Đầu ra mong muốn của PRD:
1. Team dev hiểu đúng bài toán trước khi code.
2. Team QA có tiêu chí test rõ ràng.
3. Team PM có cơ sở để quản lý scope, timeline, cost.
4. Tài liệu nhất quán với Domain Model, Architecture, Backlog.

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex):
  - Pha khám phá bài toán.
  - Pha dựng khung mục lục PRD.
  - Pha chuẩn hóa yêu cầu theo role và theo priority.
  - Pha rà soát mâu thuẫn với code/tài liệu kỹ thuật.
- VS Code Markdown Preview:
  - Kiểm tra format heading/bảng/list.
  - Kiểm tra tính dễ đọc trước khi chốt.
- Jira/GitHub Issues:
  - Đối chiếu từng yêu cầu trong PRD với backlog thực thi.
  - Gắn trace từ yêu cầu sang task/user story.

Nguyên tắc khi dùng công cụ:
1. AI dùng để tăng tốc phân tích và cấu trúc, không thay thế quyết định nghiệp vụ.

## 3. Prompt mẫu đã dùng
### 3.1 Pha khám phá bài toán
### Prompt 1 - IMS là gì theo ngữ cảnh dự án
"Giải thích IMS là gì trong bối cảnh quản lý kho theo lô, pain points vận hành hiện tại, và giá trị cốt lõi hệ thống cần mang lại cho từng vai trò."

### Prompt 2 - Ví dụ nghiệp vụ thực tế
"Cho 3 ví dụ luồng nghiệp vụ thực tế (nhập kho, QC decision, xuất kho) và chỉ ra điểm nào thường gây sai lệch nếu quản lý bằng Excel rời rạc."

### 3.2 Pha so sánh phương án
### Prompt 3 - So sánh build vs buy
"So sánh hệ thống tự phát triển và SaaS quản lý kho (ví dụ Zoho) theo: tùy biến nghiệp vụ, kiểm soát dữ liệu, thời gian triển khai, chi phí vận hành, rủi ro phụ thuộc nền tảng."

### Prompt 4 - Câu hỏi phản biện tại sao
"Nếu chọn phương án tự phát triển, giải thích vì sao đáng làm dù tốn công hơn; nếu chọn SaaS, giải thích vì sao phù hợp cho MVP."

### 3.3 Pha chốt phạm vi
### Prompt 5 - Chốt MVP theo role
"Đề xuất phạm vi MVP cho IMS theo 4 role Manager, Operator, Quality Control, IT Admin. Mỗi role có: mục tiêu, thao tác chính, dữ liệu đầu vào/đầu ra, tiêu chí thành công."

### Prompt 6 - Chuyển thành yêu cầu đo được
"Viết lại yêu cầu functional và non-functional theo dạng có thể kiểm thử được, tránh mô tả chung chung."

### 3.4 Pha rà soát nhất quán
### Prompt 7 - So khớp tài liệu
"Đối chiếu PRD với Domain Model, Architecture, Product Backlog; liệt kê điểm lệch thuật ngữ, lệch luồng, lệch phạm vi, và cách sửa đề xuất."

### 3.5 Prompt kiểu bạn hay hỏi tại sao
- "Tại sao requirement này là P0 chứ không phải P1?"
- "Nếu bỏ requirement này thì luồng end-to-end có bị gãy không?"
- "Yêu cầu này mang lại giá trị cho role nào, đo bằng chỉ số gì?"
- "Có yêu cầu nào tương đương rẻ hơn/đơn giản hơn không?"

## 4. Cách tiếp cận của nhóm
1. Thu thập ngữ cảnh:
	- Pain points thực tế.
	- Phạm vi nghiệp vụ bắt buộc cho demo.
2. Dùng prompt để dựng phiên bản PRD v0.
3. Chạy vòng phản biện "tại sao":
	- Mỗi yêu cầu phải trả lời được 3 câu hỏi:
	  1) Giải quyết vấn đề nào?
	  2) Không có thì ảnh hưởng gì?
	  3) Đo thành công bằng gì?
4. Chốt MVP (P0) trước:
	- Chỉ giữ yêu cầu tạo được luồng end-to-end hoàn chỉnh.
5. Phân tầng yêu cầu:
	- P0: bắt buộc cho vận hành/demonstration.
	- P1: cải thiện chất lượng vận hành.
	- P2: nâng cao/trải nghiệm.
6. Rà soát chéo tài liệu:
	- PRD vs Domain Model.
	- PRD vs Architecture.
	- PRD vs Backlog.
7. Review nhóm và khóa phiên bản PRD theo sprint.
8. Khi có thay đổi lớn, mở phiên bản PRD mới kèm rationale.

### 4.1 Mẫu hội thoại ra quyết định (rút gọn)
Bạn: "Tại sao cần quản lý theo lot mà không chỉ product?"
Copilot: "Vì QC, hạn dùng và truy vết kiểm toán đều theo lot; product-level không đủ cho thu hồi hoặc cách ly lô lỗi."

Bạn: "Nếu đưa tính năng này vào MVP thì đánh đổi gì?"
Copilot: "Tăng effort sprint nhưng giảm rủi ro demo thất bại vì thiếu luồng end-to-end."

Bạn: "Tôi chọn phương án nào?"
Copilot: "Nếu ưu tiên tốc độ demo: chọn scope tối thiểu P0. Nếu ưu tiên độ hoàn chỉnh: thêm P1 có kiểm soát timeline."

## 5. Checklist hoàn thiện file chính
- Có bối cảnh nghiệp vụ và pain points rõ ràng.
- Có mục tiêu theo từng role và luồng end-to-end.
- Có tiêu chí chấp nhận (functional + non-functional) đo lường được.
- Có phạm vi MVP và ghi chú mở rộng.
- Nội dung nhất quán với hệ thống đang chạy trong source hiện tại.

Checklist chi tiết trước khi chốt PRD:
1. Functional requirements:
	- Mỗi yêu cầu có actor, trigger, outcome.
	- Có điều kiện biên và lỗi chính.
2. Non-functional requirements:
	- Có metric hoặc ngưỡng đo cụ thể.
3. Traceability:
	- Mỗi nhóm yêu cầu map được sang module/backlog.
4. Scope:
	- Đánh dấu rõ in-scope, out-of-scope, phase sau.
5. Ngôn ngữ:
	- Thuật ngữ thống nhất với Domain Model và Architecture.

## 6. Lưu ý cập nhật
Khi có thay đổi lớn ở kiến trúc, luồng nghiệp vụ hoặc phạm vi release, cập nhật PRD ngay trong cùng sprint để đảm bảo tài liệu phản ánh đúng phiên bản hệ thống.

Quy tắc cập nhật:
1. Ghi rõ lý do thay đổi (business/technical/compliance).
2. Ghi rõ tác động đến backlog và kế hoạch test.
3. Gắn version note ở cuối tài liệu PRD.
4. Không chỉnh cục bộ một mục mà bỏ qua kiểm tra chéo với tài liệu liên quan.