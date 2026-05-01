# 04_Product Backlog - Vibe Coding

## 1. Mục tiêu của file này
File này mô tả chi tiết cách nhóm đã dùng công cụ và prompt để tạo, cập nhật, và nâng cao chất lượng cho file [01_Documents/04_Product Backlog.md](01_Documents/04_Product%20Backlog.md).

Mục tiêu trung tâm:
- Chứng minh quá trình tìm hiểu nghiệp vụ được thực hiện kỹ, có câu hỏi đào sâu và có xác nhận lại.
- Chứng minh nhóm có trao đổi liên tục với agent theo nhiều vòng, không chỉ prompt một lần.
- Chứng minh backlog được xây dựng theo chuỗi: đọc tài liệu trước, hỏi sâu What/Why, lập kế hoạch, triển khai theo kế hoạch, phản biện và chốt.

---

## 2. Bộ tài liệu bắt buộc agent đọc trước khi đề xuất backlog

Nhóm yêu cầu agent đọc trước các tài liệu nền tảng sau:
- 01_Documents/01_Product Requirements Document.md
- 01_Documents/02_Domain Model.md

Lý do:
- Tránh viết backlog theo suy đoán.
- Đảm bảo các role trong backlog (Manager, Operator, QC, IT Admin) đúng với hệ thống hiện tại.

---

## 3. Công cụ nhóm đã dùng và cách dùng thực tế

- GitHub Copilot Chat (GPT-5.3-Codex, Claude sonnet 4.5)
	- Vai trò: discovery nghiệp vụ, sinh nháp user story, đề xuất acceptance criteria, map story với module kỹ thuật.
	- Cách dùng: prompt theo Giai đoạn, có yêu cầu output có cấu trúc, có vòng phản biện.

- VS Code + Markdown
	- Vai trò: nơi soạn thảo và chỉnh sửa bản chính backlog.
	- Cách dùng: agent đề xuất patch, nhóm review thủ công, chấp nhận từng phần.

---

## 4. Phương pháp làm việc với agent theo vòng lặp liên tục

Nhóm sử dụng 6 Giai đoạn, lặp lại theo từng đợt cập nhật backlog:

1. Giai đoạn Đọc hiểu nền tảng
2. Giai đoạn Đào sâu nghiệp vụ bằng câu hỏi What/Why
3. Giai đoạn Đề xuất nháp backlog version 1
4. Giai đoạn Lập kế hoạch chỉnh sửa backlog
5. Giai đoạn Yêu cầu agent triển khai theo kế hoạch
6. Giai đoạn Phản biện, đối soát và khóa phiên bản

Nguyên tắc bắt buộc khi trao đổi:
- Mỗi Giai đoạn phải có output cụ thể, không chấp nhận câu trả lời mơ hồ.
- Mỗi câu trả lời của agent đều có câu hỏi ngược để đào sâu tại sao.
- Mỗi đề xuất thay đổi backlog đều phải có lý do nghiệp vụ, tác động module, và ảnh hưởng ưu tiên.

---

## 5. Thư viện prompt chính nhóm đã dùng

### 5.1 Prompt khởi động: bắt buộc đọc tài liệu trước

Prompt mẫu 1:
"Hãy đọc các tài liệu: PRD, Domain Model. Trước khi viết backlog, hãy tóm tắt theo 3 mục: What hệ thống làm gì, Why nghiệp vụ quan trọng, và các điểm còn mở cần xác nhận."

Prompt mẫu 2:
"Từ tài liệu đã đọc, hãy liệt kê 10 giả định để hiểu đúng hệ thống và đánh dấu giả định nào cần xác minh với nhóm. Không viết user story nếu chưa xong bước này."

Kết quả kỳ vọng:
- Agent trả về bản tóm tắt có cấu trúc.
- Có danh sách điểm mở để nhóm hỏi lại.

### 5.2 Prompt discovery What/Why để hiểu sâu nghiệp vụ

Prompt mẫu 3:
"Với từng luồng: Nhập kho, QC đầu vào, Sản xuất batch, Kiểm kê, Truy vết, hãy đặt câu hỏi theo cặp What/Why. Mỗi luồng tối thiểu 6 câu hỏi và giải thích tại sao câu hỏi đó quan trọng với rủi ro vận hành."

Prompt mẫu 4:
"Từ các câu trả lời trước đó, hãy xác định 5 rủi ro lớn nhất nếu backlog bỏ sót nghiệp vụ và đề xuất story bổ sung để giảm rủi ro."

Kết quả kỳ vọng:
- Có bộ câu hỏi đào sâu, không dừng ở mức tính năng.
- Có liên kết giữa câu hỏi và rủi ro nghiệp vụ.

### 5.3 Prompt tạo backlog nháp và chuẩn hóa

Prompt mẫu 5:
"Viết backlog theo template: Là <vai trò>, tôi muốn <hành động> để <giá trị>. Thêm ưu tiên P0/P1/P2, không trùng nghĩa giữa các story, và tách theo role: Manager, Operator, Quality Control, IT Admin."

Prompt mẫu 6:
"Với mỗi story, bổ sung acceptance criteria ngắn gọn ở dạng có thể kiểm thử. Nếu chưa đủ thông tin, ghi rõ cần xác nhận gì."

Kết quả kỳ vọng:
- Có bộ story có cấu trúc thống nhất.
- Có tiêu chí chấp nhận để dùng cho UAT.

### 5.4 Prompt lập kế hoạch để chỉnh sửa backlog

Prompt mẫu 7:
"Hãy lập kế hoạch cập nhật backlog theo 3 đợt: Đợt 1 chốt P0 end-to-end, Đợt 2 mở rộng P1, Đợt 3 tối ưu P2. Mỗi đợt cần nêu: mục tiêu, danh sách story, phụ thuộc, rủi ro, tiêu chí hoàn thành."

Prompt mẫu 8:
"Từ kế hoạch trên, hãy đề xuất thứ tự sửa file backlog để tôi có thể review theo từng chặng nhỏ, tránh sửa toàn bộ một lần."

Kết quả kỳ vọng:
- Có roadmap chỉnh sửa rõ ràng.
- Có thứ tự triển khai để dễ review.

### 5.5 Prompt yêu cầu agent triển khai theo kế hoạch

Prompt mẫu 9:
"Triển khai Đợt 1 theo kế hoạch đã chốt: cập nhật các story P0, giữ nguyên ID đã có, thêm acceptance criteria, và ghi rõ lý do mỗi thay đổi. Sau đó báo cáo phần đã làm và phần còn mở."

Prompt mẫu 10:
"Triển khai Đợt 2: bổ sung story P1 còn thiếu, map mỗi story với module kỹ thuật liên quan (material, inventory-lot, inventory-transaction, qc-test, production-batch, reports, auth)."

Prompt mẫu 11:
"Triển khai Đợt 3: tối ưu độ rõ ràng câu chữ, loại bỏ trùng nghĩa, và đề xuất gộp/tách story nếu cần."

Kết quả kỳ vọng:
- Agent sửa đúng theo kế hoạch, không lệch phạm vi.
- Sau mỗi đợt đều có báo cáo kết quả.

### 5.6 Prompt phản biện và củng cố chất lượng

Prompt mẫu 12:
"Review backlog hiện tại như một BA reviewer: chỉ ra story trùng nghĩa, criteria không đo được, dependency thiếu, hoặc role assignment chưa hợp lý."

Prompt mẫu 13:
"Hãy đặt thêm 10 câu hỏi Why để thách thức backlog hiện tại và đề xuất bản sửa cụ thể nếu câu trả lời không thuyết phục."

Prompt mẫu 14:
"Từ kết quả review, tạo danh sách patch để sửa ngay trong file backlog theo thứ tự ưu tiên cao đến thấp."

Kết quả kỳ vọng:
- Có vòng phản biện để nâng chất lượng.
- Có patch để sửa cụ thể, không chỉ nhận xét chung chung.

---

## 6. Mẫu trao đổi liên tục với agent (minh họa quy trình)

Vòng 1:
- Người dùng: Yêu cầu đọc tài liệu và tóm tắt What/Why.
- Agent: Trả về tóm tắt + điểm mở.
- Người dùng: Hỏi lại các điểm mở quan trọng.

Vòng 2:
- Người dùng: Yêu cầu bộ câu hỏi discovery What/Why.
- Agent: Trả về bộ câu hỏi + rủi ro.
- Người dùng: Chốt câu trả lời nghiệp vụ với team.

Vòng 3:
- Người dùng: Yêu cầu lập kế hoạch cập nhật backlog theo đợt.
- Agent: Trả về plan 3 đợt.
- Người dùng: Duyệt Đợt 1 để triển khai.

Vòng 4:
- Người dùng: Yêu cầu triển khai Đợt 1.
- Agent: Cập nhật backlog + báo cáo.
- Người dùng: Yêu cầu review phản biện và patch tiếp.

Vòng 5:
- Người dùng: Triển khai Đợt 2, Đợt 3 và khóa phiên bản.

Ý nghĩa của quy trình này:
- Chứng minh có trao đổi liên tục và phản biện hai chiều.
- Chứng minh backlog là kết quả nghiên cứu, không phải sinh tự động một lần.

---

## 7. Tiêu chí đánh giá chất lượng cho Product Backlog.md

- Độ phủ nghiệp vụ:
	- Story P0 đủ cho luồng end-to-end: nhập kho -> QC -> sản xuất -> tồn kho -> truy vết.

- Độ sâu nghiệp vụ:
	- Mỗi nhóm story có căn cứ What và Why, không chỉ mô tả thao tác.

- Độ khả thi triển khai:
	- Có acceptance criteria có thể test.
	- Có map module kỹ thuật để giao việc dev.

- Độ quản trị:
	- Có ưu tiên P0/P1/P2 rõ ràng.
	- Có logic phụ thuộc giữa các story.

- Độ minh bạch:
	- Có lịch sử prompt và vòng trao đổi để truy vết cách backlog được hình thành.


## 8. Lưu ý cập nhật các lần sau

Mỗi khi backlog đổi phạm vi hoặc đổi ưu tiên:
- Cập nhật lại prompt discovery What/Why cho phần nghiệp vụ bị ảnh hưởng.
- Chạy lại prompt lập kế hoạch trước khi sửa lớn.
- Triển khai sửa theo từng đợt để dễ review và dễ truy vết thay đổi.