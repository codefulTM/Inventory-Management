# 07_Coding Standards - Vibe Coding

## 1. Mục tiêu file chính
File chính [07_Coding Standards.md](07_Coding%20Standards.md) định nghĩa chuẩn code phù hợp hiện trạng hệ thống IMS và roadmap nâng chuẩn.

Mục tiêu của file Vibe Coding này:
- Trình bày chi tiết cách nhóm dùng công cụ và prompt để tạo mới và cập nhật file chuẩn code chính.
- Chứng minh coding standards được xây dựng từ hiện trạng thật của codebase, không phải bộ quy tắc lý thuyết chung.
- Thể hiện quy trình làm việc có tương tác liên tục với agent nhưng quyết định cuối cùng vẫn do nhóm xác thực.

---

## 2. Phạm vi và nguyên tắc xây dựng Coding Standards

Phạm vi:
- Tập trung vào chuẩn code cho stack chính hiện có của dự án và quy trình trước merge.
- Bám theo thực tế triển khai của các service đang chạy thay vì viết chuẩn vượt quá khả năng áp dụng ngay.

Nguyên tắc:
- Rule nào ghi trong chuẩn phải có khả năng thực thi trong workflow hiện tại.
- Tách rõ hai lớp: bắt buộc áp dụng ngay và roadmap nâng chuẩn.
- Mỗi cập nhật chuẩn phải có lý do, bằng chứng và tác động đến PR workflow.
- AI hỗ trợ tổng hợp và chuẩn hóa câu chữ; nhóm chịu trách nhiệm đối chiếu với source và CI.

---

## 3. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex, Claude sonnet 4.5)
	- Vai trò: tạo khung coding standards, đề xuất cấu trúc rule, sinh checklist review, chuẩn hóa ngôn ngữ tài liệu.
	- Cách dùng: prompt theo Giai đoạn, yêu cầu nêu rõ phần chắc chắn và phần cần xác minh thêm.

- Tìm kiếm mã nguồn và cấu hình trong repository
	- Vai trò: kiểm chứng ESLint, Prettier, Jest, tsconfig, scripts thực tế đang tồn tại.
	- Cách dùng: đối chiếu rule đề xuất với file cấu hình và script thật để tránh mâu thuẫn.

- VS Code Problems và terminal scripts
	- Vai trò: xác nhận luồng lint, test, build có thể chạy được ngay tại thời điểm cập nhật chuẩn.

- Jenkinsfile và pipeline hiện có
	- Vai trò: xác định quality gates thực tế trong CI để đưa vào checklist trước merge.

- Pull Request history và review comments
	- Vai trò: rút ra lỗi lặp lại, các điểm hay bị vi phạm để ưu tiên đưa thành rule bắt buộc.

---

## 4. Prompt mẫu đã dùng

### Prompt 1 - Đọc bối cảnh trước khi viết chuẩn
"Hãy đọc file Coding Standards hiện tại, cấu trúc source chính, scripts lint/test/build và Jenkinsfile. Tóm tắt những gì team đang làm được ngay và những gì chưa khả thi nếu ép áp dụng ngay."

### Prompt 2 - Đánh giá tuân thủ theo bằng chứng
"Đối chiếu coding standards hiện tại với codebase IMS, liệt kê phần đang tuân thủ, chưa tuân thủ, rủi ro nếu giữ nguyên, và bằng chứng theo file cấu hình hoặc script."

### Prompt 3 - Viết lại chuẩn theo trạng thái thực tế
"Viết lại coding standards theo nguyên tắc: phản ánh hiện trạng thực tế, tách rõ rule bắt buộc và roadmap, hạn chế mâu thuẫn với source hiện tại."

### Prompt 4 - Tách rule theo mức ưu tiên áp dụng
"Hãy phân nhóm rules thành: bắt buộc ngay, áp dụng theo module, và roadmap. Mỗi rule nêu lý do, điều kiện áp dụng, và cách kiểm chứng."

### Prompt 5 - Chuẩn hóa quy trình trước merge
"Tạo checklist trước merge cho dự án TypeScript microservices gồm lint, test, review, security notes và phạm vi tài liệu cần cập nhật."

### Prompt 6 - Prompt tập trung bảo mật trong code và docs
"Đề xuất mục coding standards về secrets, token, credentials và logging dữ liệu nhạy cảm; đánh dấu rule nào bắt buộc ngay trong môi trường học thuật và dev."

### Prompt 7 - Prompt kiểm tra tính khả thi trong CI
"Đối chiếu checklist trước merge với Jenkinsfile hiện tại. Chỉ ra mục nào đã có trong CI, mục nào mới ở mức khuyến nghị và cách đưa dần vào pipeline."

### Prompt 8 - Prompt tạo bảng tuân thủ
"Tạo bảng mapping giữa từng rule trong Coding Standards với bằng chứng cấu hình hoặc script thực tế trong repo. Nếu chưa có bằng chứng thì ghi rõ là roadmap."

### Prompt 9 - Prompt cập nhật file chính bằng patch
"Đề xuất patch cập nhật file 07_Coding Standards.md theo đúng cấu trúc đang dùng, ưu tiên giữ ổn định nội dung cũ và chỉ bổ sung phần thiếu hoặc mâu thuẫn."

### Prompt 10 - Prompt phản biện cuối
"Review lại tài liệu coding standards như Tech Lead: chỉ ra rule khó áp dụng, rule trùng nghĩa, rule thiếu điều kiện kiểm chứng, và đề xuất sửa trực tiếp."

---

## 5. Quy trình làm việc chi tiết với agent
1. Thu thập bối cảnh từ coding standards hiện tại, source config, scripts và CI.
2. Yêu cầu agent tạo bản đánh giá tuân thủ theo bằng chứng.
3. Nhóm tự xác minh lại các điểm quan trọng trong codebase.
4. Yêu cầu agent viết nháp chuẩn mới theo cấu trúc rõ ràng và có thể thực thi.
5. Chạy thử lint và test ở phạm vi thay đổi để kiểm tra tính khả thi.
6. Yêu cầu agent chốt checklist PR và phân loại bắt buộc hoặc roadmap.
7. Nhóm phản biện nội dung, loại bỏ rule quá lý thuyết hoặc không đo được.
8. Cập nhật file chính và ghi lại thay đổi cho vòng review kế tiếp.

Điểm nhấn:
- AI tăng tốc khâu tổng hợp, không thay thế bước xác minh kỹ thuật.
- Rule chỉ được chốt khi có đường kiểm chứng rõ trong code hoặc pipeline.

---

## 6. Mẫu vòng trao đổi liên tục với agent

Vòng 1:
- Người dùng: yêu cầu agent đọc tài liệu chuẩn cũ và trạng thái toolchain hiện tại.
- Agent: trả về tóm tắt hiện trạng và các điểm mâu thuẫn.

Vòng 2:
- Người dùng: yêu cầu bảng tuân thủ có bằng chứng.
- Agent: trả về bảng rule và nguồn kiểm chứng.

Vòng 3:
- Người dùng: yêu cầu soạn chuẩn mới theo hai lớp bắt buộc và roadmap.
- Agent: trả về bản nháp coding standards.

Vòng 4:
- Người dùng: yêu cầu checklist trước merge và liên kết với CI.
- Agent: trả về checklist áp dụng được ngay.

Vòng 5:
- Người dùng: yêu cầu phản biện cuối và patch cập nhật file chính.
- Agent: đề xuất sửa cụ thể theo thứ tự ưu tiên.

---

## 7. Bảng kiểm chứng trước khi cập nhật file chính

| Nhóm nội dung | AI đề xuất | Nhóm kiểm chứng thủ công | Nguồn kiểm chứng |
| :-- | :-- | :-- | :-- |
| Naming conventions | Có | Có | Source tree và naming hiện có |
| TypeScript rules | Có | Có | tsconfig, ESLint rules |
| Lint hoặc format workflow | Có | Có | scripts trong package |
| Test baseline | Có | Có | scripts test và kết quả chạy thực tế |
| Security notes | Có | Có | env usage, docs, review notes |
| PR checklist | Có | Có | quy trình review và Jenkinsfile |
| Roadmap nâng chuẩn | Có | Có | mức khả thi theo sprint |

Ý nghĩa:
- Tránh đưa rule không có căn cứ thực tế vào tài liệu chuẩn.
- Dễ bảo vệ quyết định vì mỗi rule đều có logic và bằng chứng kèm theo.

---

## 8. Cách tiếp cận của nhóm
1. Khảo sát toàn bộ package chính và scripts thực tế.
2. Đối chiếu tiêu chuẩn cũ với mức triển khai hiện tại.
3. Loại bỏ rule không còn phù hợp hoặc chưa khả thi ngay.
4. Chia nội dung thành hai lớp: áp dụng ngay và roadmap.
5. Chốt tài liệu để team dùng trực tiếp trong PR workflow.
6. Định kỳ review lại theo mốc release để cập nhật mức độ trưởng thành kỹ thuật.

---

## 9. Checklist hoàn thiện file chính
- Chuẩn code bám đúng stack hiện tại TypeScript, NestJS, React.
- Rule bảo mật cho code và tài liệu secrets được nêu rõ.
- Quy trình trước merge có thể thực hiện được ngay.
- Có phần trạng thái hiện tại và roadmap nâng chuẩn.
- Có mapping giữa rule và cách kiểm chứng.
- Có ghi chú phạm vi áp dụng để tránh hiểu nhầm khi review PR.

---

## 10. Minh chứng không phụ thuộc hoàn toàn vào AI
- Agent chỉ đề xuất cấu trúc và nội dung nháp; nhóm tự đối chiếu với repo.
- Rule quan trọng đều được kiểm tra qua scripts, config và CI thực tế.
- Kết luận cuối dựa trên khả năng vận hành ngay, không dựa trên gợi ý chung.
- Mỗi lần chỉnh chuẩn đều có vòng phản biện trước khi chốt file chính.

## 11. Lưu ý cập nhật
Mỗi lần thay đổi toolchain như ESLint major, test framework, CI pipeline:
- Cập nhật file chuẩn trong cùng release gần nhất.
- Chạy lại quy trình đánh giá tuân thủ để điều chỉnh checklist PR.
- Đánh dấu rõ rule mới ở trạng thái bắt buộc ngay hay roadmap.

