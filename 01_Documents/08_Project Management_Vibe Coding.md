# 08_Project Management - Vibe Coding

## 1. Mục tiêu file chính
File chính [08_Project Management.md](08_Project%20Management.md) mô tả kế hoạch quản lý dự án: ước lượng, timeline, milestones, phân công, rủi ro, chi phí và liên kết phối hợp nhóm.

Mục tiêu của file Vibe Coding này:
- Trình bày chi tiết cách nhóm dùng công cụ và prompt để tạo mới và cập nhật file quản lý dự án chính.
- Chứng minh kế hoạch dự án được xây dựng từ dữ liệu thực tế của nhóm (năng lực, thời gian, phạm vi), không chỉ từ mẫu chung.
- Thể hiện quy trình tương tác liên tục với agent để tinh chỉnh estimation, timeline và risk plan.

---

## 2. Phạm vi và nguyên tắc lập kế hoạch

Phạm vi:
- Tập trung vào kế hoạch 12 tuần cho phạm vi đồ án hiện tại.
- Bao gồm effort estimation, timeline, milestones, phân công, rủi ro, chi phí, kênh phối hợp nhóm.

Nguyên tắc:
- Mọi con số person-days, chi phí và timeline phải nhất quán với giả định nhân lực.
- Mỗi milestone phải có deliverable rõ và mapping ngược về timeline theo tuần.
- Mọi rủi ro phải có biện pháp giảm thiểu cụ thể, không mô tả chung chung.
- AI hỗ trợ tổng hợp và chuẩn hóa tài liệu; nhóm chịu trách nhiệm xác thực số liệu trước khi chốt.

---

## 3. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex, Claude sonnet 4.5)
	- Vai trò: dựng khung tài liệu project management, chuẩn hóa milestone/risk, tạo bảng mapping effort-timeline.
	- Cách dùng: prompt theo Giai đoạn, yêu cầu tách rõ phần chắc chắn và phần giả định.

- Jira
	- Vai trò: quản lý task thực thi theo sprint, role, trạng thái công việc.
	- Cách dùng: đối chiếu timeline trong tài liệu với board thực tế để tránh lệch tiến độ.

- Zalo, Jira, GitHub
	- Vai trò: bằng chứng cộng tác thật và quản lý thông tin liên nhóm.
	- Cách dùng: cập nhật link mời hoặc link dự án vào tài liệu chính để phục vụ kiểm tra.

- VS Code + Markdown Preview
	- Vai trò: biên tập tài liệu và rà soát tính nhất quán giữa các mục estimation, timeline, milestone, chi phí.

---

## 4. Prompt mẫu đã dùng

### Prompt 1 - Đọc bối cảnh trước khi lập kế hoạch
"Hãy đọc PRD, Product Backlog, Architecture và phạm vi release hiện tại. Tóm tắt các hạng mục công việc chính cần đưa vào kế hoạch 12 tuần."

### Prompt 2 - Lập khung kế hoạch 12 tuần
"Tạo tài liệu quản lý dự án 12 tuần cho IMS gồm: effort estimation, timeline, milestones, team roles, risk mitigation, cost estimation."

### Prompt 3 - Đồng bộ estimation theo hệ thống hiện tại
"Cập nhật module estimation và timeline theo hệ thống lot-centric hiện tại (material, lot/transaction, QC, batch, reporting, audit)."

### Prompt 4 - Chuẩn hóa giả định nhân lực
"Với nhóm 6 thành viên làm đồ án song song lịch học, hãy đề xuất giả định effort thực tế theo person-day/tuần và nêu ảnh hưởng tới tổng timeline."

### Prompt 5 - Mapping timeline với milestones
"Map lịch trình theo tuần với milestones M1-M6 và đảm bảo không mâu thuẫn giữa deliverables, phụ thuộc và thời điểm kết thúc."

### Prompt 6 - Kiểm tra nhất quán estimation và chi phí
"Đối chiếu tổng person-days, đơn giá/ngày, overhead và tổng chi phí. Chỉ ra chỗ lệch số và đề xuất chỉnh sửa."

### Prompt 7 - Thiết kế bảng vai trò và trách nhiệm
"Tạo bảng phân công theo vai trò PM, Backend, Frontend, QA, DevOps; kèm tỉ lệ tham gia theo giai đoạn và trách nhiệm chính."

### Prompt 8 - Xây risk register có hành động cụ thể
"Tạo risk register gồm: rủi ro, xác suất, tác động, dấu hiệu nhận biết sớm, kế hoạch giảm thiểu, người chịu trách nhiệm."

### Prompt 9 - Prompt cập nhật file chính bằng patch
"Đề xuất patch cập nhật file 08_Project Management.md theo đúng cấu trúc hiện có, ưu tiên giữ nội dung đúng và chỉ chỉnh phần mâu thuẫn hoặc thiếu dữ liệu."

### Prompt 10 - Prompt phản biện cuối
"Review tài liệu quản lý dự án như PM reviewer: chỉ ra timeline không khả thi, milestone trùng lặp, chi phí lệch giả định, hoặc rủi ro thiếu kế hoạch ứng phó."

---

## 5. Quy trình làm việc chi tiết với agent
1. Thu thập bối cảnh từ backlog, architecture, phạm vi release và năng lực nhóm.
2. Yêu cầu agent tạo nháp estimation theo module.
3. Nhóm tự đối chiếu estimation với khả năng thực thi thực tế.
4. Yêu cầu agent dựng timeline và milestone mapping.
5. Kiểm tra chéo timeline với phụ thuộc kỹ thuật giữa các module.
6. Yêu cầu agent tính chi phí và kiểm tra tính nhất quán số liệu.
7. Bổ sung risk register và kế hoạch giảm thiểu có trách nhiệm rõ ràng.
8. Cập nhật file chính và chốt phiên bản kế hoạch dùng cho sprint.

Điểm nhấn:
- AI giúp tăng tốc dựng tài liệu nhưng không thay thế bước xác thực của nhóm.
- Mọi số liệu phải kiểm được bằng công thức hoặc bằng chứng kế hoạch thực tế.

---

## 6. Mẫu vòng trao đổi liên tục với agent

Vòng 1:
- Người dùng: yêu cầu đọc phạm vi và xác định hạng mục công việc.
- Agent: trả về danh sách module và effort nháp.

Vòng 2:
- Người dùng: yêu cầu dựng timeline 12 tuần + milestone M1-M6.
- Agent: trả về lịch trình và deliverables theo tuần.

Vòng 3:
- Người dùng: yêu cầu kiểm tra chéo person-days và chi phí.
- Agent: trả về điểm lệch và đề xuất chỉnh.

Vòng 4:
- Người dùng: yêu cầu bổ sung risk register và phân công trách nhiệm.
- Agent: trả về bảng rủi ro chi tiết.

Vòng 5:
- Người dùng: yêu cầu patch cập nhật file chính và phản biện cuối.
- Agent: trả về bản sửa có thứ tự ưu tiên.

---

## 7. Bảng kiểm chứng trước khi cập nhật file chính

| Hạng mục | AI đề xuất | Nhóm kiểm chứng thủ công | Nguồn kiểm chứng |
| :-- | :-- | :-- | :-- |
| Effort estimation theo module | Có | Có | Backlog, module scope, năng lực nhóm |
| Giả định person-days | Có | Có | Spreadsheet và lịch học thực tế |
| Timeline 12 tuần | Có | Có | Kế hoạch sprint và phụ thuộc kỹ thuật |
| Milestones M1-M6 | Có | Có | Deliverables theo tuần |
| Cost estimation | Có | Có | Công thức chi phí + overhead |
| Risk mitigation | Có | Có | Risk register nội bộ |
| Link cộng tác | Có | Có | Zalo, Jira, GitHub thực tế |

Ý nghĩa:
- Tránh đưa kế hoạch đẹp trên giấy nhưng không triển khai được.

---

## 8. Cách tiếp cận của nhóm
1. Ước lượng effort theo module nghiệp vụ và vai trò.
2. Áp dụng giả định thời gian làm việc thực tế của nhóm sinh viên.
3. Chốt timeline theo mốc 12 tuần và mapping với milestones.
4. Điều chỉnh chi phí theo person-days thực thi.
5. Cập nhật link cộng tác nội bộ đúng công cụ đang dùng.
6. Định kỳ review lại kế hoạch theo cuối mỗi mốc milestone.

---

## 9. Checklist hoàn thiện file chính
- Ước lượng và chi phí nhất quán với giả định nhân lực.
- Timeline có thể triển khai, không lệch với milestones.
- Phân công vai trò phù hợp năng lực thành viên.
- Rủi ro có biện pháp giảm thiểu cụ thể.
- Link cộng tác chat, project, issues hợp lệ và còn truy cập được.
- Có ghi chú rõ phần giả định và phần đã kiểm chứng thực tế.

---

## 10. Minh chứng không phụ thuộc hoàn toàn vào AI
- Nhóm tự kiểm tra lại toàn bộ con số effort, chi phí và timeline trước khi chốt.
- Bảng risk và phân công được review nội bộ, không lấy nguyên văn từ output AI.
- Khi dữ liệu thực tế mâu thuẫn với gợi ý AI, nhóm ưu tiên điều chỉnh theo năng lực thật.
- Kế hoạch được cập nhật theo milestone thật đã chạy, không chỉ theo dự báo ban đầu.

## 11. Lưu ý cập nhật
Khi đổi giả định năng lực làm việc hoặc phạm vi release:
- Cập nhật đồng thời các mục tổng quan, giả định, timeline, milestones, chi phí.
- Chạy lại prompt kiểm tra nhất quán số liệu trước khi phát hành bản tài liệu mới.
- Ghi rõ phiên bản kế hoạch và thời điểm cập nhật để dễ truy vết.