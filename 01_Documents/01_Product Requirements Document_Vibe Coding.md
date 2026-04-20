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

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex, Claude Sonnet 4.5):
  - Giai đoạn khám phá bài toán.
  - Giai đoạn dựng khung mục lục PRD.
  - Giai đoạn chuẩn hóa yêu cầu theo role và theo priority.
  - Giai đoạn rà soát mâu thuẫn với code/tài liệu kỹ thuật.
- VS Code Markdown Preview:
  - Kiểm tra format heading/bảng/list.
  - Kiểm tra tính dễ đọc trước khi chốt.

Nguyên tắc khi dùng công cụ:
1. AI dùng để tăng tốc phân tích và cấu trúc, không thay thế quyết định nghiệp vụ.

## 3. Prompt mẫu đã dùng
### 3.1 Giai đoạn khám phá bài toán
### Prompt 1 - IMS là gì theo ngữ cảnh dự án
"Giải thích IMS là gì trong bối cảnh quản lý kho theo lô, pain points vận hành hiện tại, và giá trị cốt lõi hệ thống cần mang lại cho từng vai trò."

### Prompt 2 - Ví dụ nghiệp vụ thực tế
"Cho 3 ví dụ luồng nghiệp vụ thực tế (nhập kho, QC decision, xuất kho) và chỉ ra điểm nào thường gây sai lệch nếu quản lý bằng Excel rời rạc."

- Trong IMS, đơn vị truy vết tối thiểu là gì (product hay lot), và vì sao bắt buộc phải theo lot?
- Khi một lô bị QC reject, quy trình cách ly, dán nhãn và chặn xuất kho cần chạy theo thứ tự nào?
- Điểm bàn giao dữ liệu giữa Operator -> QC -> Manager ở từng bước là gì để tránh sai lệch trạng thái lô?
- Những trường dữ liệu nào là bắt buộc khi ghi nhận inventory transaction để phục vụ audit về sau?
- Các lỗi thường gặp khi nhập liệu thủ công bằng Excel với lot/expiry/QC là gì, và mức ảnh hưởng đến tồn kho ra sao?
- Nếu xảy ra thu hồi lô, hệ thống cần truy vết ngược và truy vết xuôi đến mức chi tiết nào?
- KPI nào phản ánh đúng chất lượng vận hành kho theo vai trò (Manager, Operator, QC, IT Admin)?
- Điều kiện nào xác định luồng end-to-end đã đủ cho MVP (nhập kho -> QC -> xuất kho -> báo cáo)?

### 3.2 Giai đoạn so sánh phương án
### Prompt 3 - So sánh build vs buy
"So sánh hệ thống tự phát triển và SaaS quản lý kho (ví dụ Zoho) theo: tùy biến nghiệp vụ, kiểm soát dữ liệu, thời gian triển khai, chi phí vận hành, rủi ro phụ thuộc nền tảng."

### Prompt 4 - Câu hỏi phản biện tại sao
"Nếu chọn phương án tự phát triển, giải thích vì sao đáng làm dù tốn công hơn; nếu chọn SaaS, giải thích vì sao phù hợp cho MVP."

- Nếu dùng SaaS, mức tùy biến cho quy trình lot-centric + QC decision + quarantine có đủ không, hay phải làm workaround?
- SaaS có hỗ trợ đầy đủ audit trail theo chuẩn kiểm toán nội bộ của nhóm không (ai làm gì, khi nào, trên lô nào)?
- Khả năng tích hợp với kiến trúc hiện tại (Keycloak, API Gateway, reporting pipeline) ở mức nào?
- Chi phí thật sự sau 12 tháng gồm license, tích hợp, training, migration dữ liệu và vận hành là bao nhiêu?
- Rủi ro vendor lock-in ảnh hưởng thế nào đến việc mở rộng module hoặc đổi kiến trúc sau này?
- Nếu chọn tự phát triển, những phần nào bắt buộc làm ngay để không vỡ timeline 12 tuần?
- Với dữ liệu QC nhạy cảm, phương án nào giúp kiểm soát tốt hơn về bảo mật và quyền truy cập theo role?
- Phương án nào hỗ trợ tốt hơn cho mục tiêu học thuật của đồ án: hiểu sâu hệ thống hay triển khai nhanh để demo?

### 3.3 Giai đoạn chốt phạm vi
### Prompt 5 - Chốt MVP theo role
"Đề xuất phạm vi MVP cho IMS theo 4 role Manager, Operator, Quality Control, IT Admin. Mỗi role có: mục tiêu, thao tác chính, dữ liệu đầu vào/đầu ra, tiêu chí thành công."

### Prompt 6 - Chuyển thành yêu cầu đo được
"Viết lại yêu cầu functional và non-functional theo dạng có thể kiểm thử được, tránh mô tả chung chung."

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
6. Review nhóm và khóa phiên bản PRD theo sprint.
7. Khi có thay đổi lớn, mở phiên bản PRD mới kèm rationale.

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
	- Đánh dấu rõ in-scope, out-of-scope, Giai đoạn sau.

## 6. Lưu ý cập nhật
Khi có thay đổi lớn ở kiến trúc, luồng nghiệp vụ hoặc phạm vi release, cập nhật PRD ngay trong cùng sprint để đảm bảo tài liệu phản ánh đúng phiên bản hệ thống.

Quy tắc cập nhật:
1. Ghi rõ lý do thay đổi (business/technical/compliance).
2. Ghi rõ tác động đến backlog và kế hoạch test.
3. Gắn version note ở cuối tài liệu PRD.
4. Không chỉnh cục bộ một mục mà bỏ qua kiểm tra chéo với tài liệu liên quan.