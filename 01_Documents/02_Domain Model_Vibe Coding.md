# 02_Domain Model - Vibe Coding

## 1. Mục tiêu file chính
File chính [02_Domain Model.md](02_Domain Model.md) mô tả đầy đủ:
- Các thực thể nghiệp vụ cốt lõi của IMS.
- Quan hệ giữa thực thể (business relation và software relation).
- Vòng đời trạng thái quan trọng (state lifecycle).
- Quy tắc miền (domain rules), ràng buộc và validation.
- Ranh giới giữa phần đã triển khai và phần mở rộng tương lai.

Nguyên tắc quan trọng:
Domain Model không viết tách rời, mà được xây dựng dựa trên PRD để đảm bảo mỗi entity/rule đều phục vụ một yêu cầu nghiệp vụ đã được chốt.

Đầu ra mong muốn của Domain Model:
1. Team backend có bản đồ thực thể rõ để thiết kế schema/service.
2. Team frontend hiểu đúng dữ liệu nghiệp vụ cần hiển thị/xử lý.
3. Team QA có cơ sở thiết kế test theo rule và transition.
4. Tài liệu kiến trúc có thể bám chắc vào miền nghiệp vụ.

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex):
  - Trích xuất entity từ yêu cầu trong PRD.
  - Gợi ý relationship và state transition.
  - Chuẩn hóa mô tả domain rule theo ngôn ngữ nghiệp vụ.
  - Rà soát mâu thuẫn giữa PRD, Domain Model, Architecture.
- Đọc source schema/service trong backend:
  - Xác nhận field, enum, relation và business rules thực tế đang chạy.
  - Kiểm tra chênh lệch giữa tài liệu và implementation.
- Mermaid:
  - Vẽ sơ đồ quan hệ tổng quan giữa các thực thể.
  - Hỗ trợ thảo luận nhanh khi review.
- VS Code Markdown Preview:
  - Kiểm tra độ rõ ràng của heading, bảng, danh sách rule.
  - Kiểm tra luồng đọc từ trên xuống.

Nguyên tắc sử dụng công cụ:
1. PRD là nguồn đầu vào nghiệp vụ số 1.
2. Domain Model là cầu nối giữa PRD và kiến trúc kỹ thuật.

## 3. Prompt mẫu đã dùng
### 3.1 Pha xuất phát từ PRD
### Prompt 1 - Trích yêu cầu sang thực thể
"Dựa trên [01_Product Requirements Document.md](01_Product Requirements Document.md), trích các yêu cầu nghiệp vụ chính và đề xuất domain entities tương ứng cho từng yêu cầu."

### Prompt 2 - Tạo bảng trace PRD -> Domain
"Lập bảng mapping Requirement ID/nhóm yêu cầu trong PRD sang Entity, Value Object, Domain Rule và trạng thái nghiệp vụ liên quan."

### 3.2 Pha mô hình hóa thực thể
### Prompt 3 - Trích xuất thực thể miền
"Dựa trên IMS hiện tại, liệt kê toàn bộ domain entities quan trọng (Material, InventoryLot, InventoryTransaction, QCTest, ProductionBatch...) và vai trò của từng thực thể trong nghiệp vụ."

### Prompt 4 - Mô tả quan hệ
"Viết mapping quan hệ 1-N hoặc tự tham chiếu giữa các entity trong kho theo lô, kèm giải thích nghiệp vụ ngắn gọn."

### 3.3 Pha mô hình hóa quy tắc
### Prompt 5 - Quy tắc miền
"Tổng hợp các domain rules đang áp dụng trong code: vòng đời trạng thái lot, phiếu nhập/xuất pending -> confirmed, quy tắc adjustment, quy tắc production batch completion."

### Prompt 6 - Chuẩn hóa transition
"Viết state transition cho từng thực thể quan trọng theo dạng: current_state -> action -> next_state, kèm điều kiện hợp lệ."

### 3.4 Pha rà soát nhất quán
### Prompt 7 - So khớp 3 tài liệu
"Đối chiếu Domain Model với PRD và Architecture, chỉ ra điểm lệch thuật ngữ, lệch luồng, lệch trạng thái, và đề xuất chỉnh sửa ưu tiên."

### 3.5 Prompt kiểu phản biện tại sao
- "Tại sao entity này cần tồn tại riêng thay vì gộp vào entity khác?"
- "Tại sao rule này nằm ở domain thay vì chỉ kiểm tra ở UI?"
- "Tại sao trạng thái này là bắt buộc cho truy vết và kiểm toán?"
- "Nếu bỏ quan hệ này thì yêu cầu nào trong PRD không còn đáp ứng được?"

## 4. Cách tiếp cận của nhóm
1. Bắt đầu từ PRD:
	- Khoanh các yêu cầu P0/P1 liên quan dữ liệu và trạng thái.
2. Tạo bảng truy vết:
	- Requirement trong PRD -> Entity/Rule/Transition trong Domain Model.
3. Xác định thực thể đời sống thực trước, sau đó map sang schema phần mềm.
4. Ưu tiên domain cốt lõi phục vụ luồng end-to-end:
	- material -> lot -> transaction -> QC -> batch -> reporting.
5. Mô tả quan hệ bằng ngôn ngữ nghiệp vụ trước, rồi mới chốt bằng kỹ thuật.
6. Trích xuất rule từ service logic để tránh mô hình chỉ mang tính lý thuyết.
7. Rà soát chéo với PRD, Architecture, Backlog để thống nhất thuật ngữ.
8. Chốt version Domain Model theo sprint cùng rationale thay đổi.

### 4.1 Quy trình xây dựng từ PRD (gợi ý áp dụng thực tế)
1. Bước 1 - Từ PRD chọn luồng nghiệp vụ chính:
	- Ví dụ: nhập kho, QC, xuất kho, kiểm kê.
2. Bước 2 - Với mỗi luồng, xác định:
	- Actor chính.
	- Dữ liệu vào/ra.
	- Quy tắc nghiệp vụ không thể vi phạm.
3. Bước 3 - Suy ra domain object:
	- Entity nào chịu trách nhiệm dữ liệu cốt lõi.
	- Value object nào biểu diễn thuộc tính bất biến.
4. Bước 4 - Định nghĩa rule và transition:
	- Trạng thái nào hợp lệ, trạng thái nào bị cấm.
5. Bước 5 - Đối chiếu ngược lại PRD:
	- Mỗi yêu cầu trong PRD phải map được ít nhất 1 phần tử Domain Model.
6. Bước 6 - Đối chiếu code:
	- Kiểm tra schema/service hiện trạng có khớp mô hình không.

### 4.2 Mẫu hội thoại ra quyết định (rút gọn)
Bạn: "Tại sao cần tách InventoryTransaction khỏi InventoryLot?"
Copilot: "Vì lot là trạng thái tồn kho hiện thời, còn transaction là lịch sử biến động; tách ra giúp truy vết kiểm toán và rollback logic rõ ràng."

Bạn: "Rule này lấy từ đâu?"
Copilot: "Rule được dẫn xuất từ yêu cầu trong PRD và được xác nhận lại qua logic service hiện có."

Bạn: "Nếu không có trạng thái QC thì sao?"
Copilot: "Luồng kiểm soát chất lượng trong PRD sẽ không thể kiểm chứng, và kiến trúc phân quyền QC mất ý nghĩa nghiệp vụ."

## 5. Checklist hoàn thiện file chính
- Có danh sách thực thể cốt lõi và business key.
- Có mapping thực thể đời sống thực sang phần mềm.
- Có quan hệ domain ở mức đủ dùng cho thiết kế và kiểm thử.
- Có quy tắc miền quan trọng (state transition, validation, constraint).
- Có ghi chú rõ phần đã triển khai và phần mục tiêu mở rộng.

Checklist chi tiết trước khi chốt Domain Model:
1. Trace từ PRD:
	- Mỗi cụm yêu cầu chính trong PRD đã được ánh xạ sang entity/rule tương ứng.
2. Entity quality:
	- Có business key rõ ràng, không trùng vai trò giữa các entity.
3. Relationship quality:
	- Quan hệ được giải thích bằng nghiệp vụ, không chỉ bằng kỹ thuật.
4. Rule quality:
	- Rule có điều kiện áp dụng, hành vi mong đợi, và phản hồi khi vi phạm.
5. Transition quality:
	- Có trạng thái đầu-cuối và điều kiện chuyển rõ ràng.
6. Alignment quality:
	- Thuật ngữ thống nhất với PRD, Architecture, Backlog.

## 6. Lưu ý cập nhật
Khi backend thay đổi schema, enum trạng thái hoặc luồng nghiệp vụ, cập nhật Domain Model ngay để giữ vai trò tài liệu nguồn cho kiến trúc và kiểm thử.

Quy tắc cập nhật:
1. Nếu PRD thay đổi yêu cầu, cập nhật Domain Model trong cùng sprint.
2. Nếu Domain Model đổi entity/rule, kiểm tra ảnh hưởng đến Architecture và test plan.
3. Ghi chú version và lý do thay đổi ở cuối tài liệu.
4. Không cập nhật đơn lẻ một phần mà bỏ qua bước đối chiếu PRD.
