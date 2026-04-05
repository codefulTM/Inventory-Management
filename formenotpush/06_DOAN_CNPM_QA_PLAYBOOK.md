# Đồ Án CNPM Q&A Playbook (AIDLC)

Generated date: 2026-04-01
Ngữ cảnh: Inventory Management
Phạm vi: Môn Đồ án Công nghệ phần mềm - Trường Đại học Khoa học Tự Nhiên

## 1. Mục đích tài liệu

Tài liệu này dùng để:
- Tổng hợp câu hỏi và trả lời thường gặp khi làm và bảo vệ đồ án CNPM.
- Hệ thống hóa kỹ thuật, cách làm, và tiêu chí đánh giá theo hướng học thuật.
- Cung cấp quy trình chuẩn có thể áp dụng cho các dự án cùng phạm vi môn học.

## 2. Tóm tắt đề tài mẫu

Đề tài Inventory Management giải quyết bài toán quản lý vật tư/lô/mẻ sản xuất theo vai trò.
Giá trị chính:
- Theo dõi xuyên suốt vòng đời dữ liệu: Material -> Inventory Lot -> QC -> Production Batch -> Transaction -> Report.
- Truy vết lô và kiểm soát trạng thái chất lượng.
- Chuẩn hóa nghiệp vụ và hỗ trợ kiểm thử, bảo mật, triển khai.

## 3. Bộ câu hỏi và trả lời cốt lõi (học thuật + thực chiến)

### Nhóm A - Business và Requirements

Q1. Bài toán thực tế của đề tài là gì?
A1. Thay thế quy trình kho thủ công bằng hệ thống số hóa để giảm sai lệch tồn kho, tăng truy vết, rút ngắn thời gian kiểm kê và báo cáo.

Q2. Người dùng mục tiêu gồm những ai?
A2. Manager, Operator, QC Technician, IT Administrator; mỗi vai trò có quyền hạn và workflow riêng.

Q3. Vì sao cần phân tách functional và non-functional requirements?
A3. Functional mô tả hệ thống làm gì; non-functional mô tả hệ thống phải đạt chất lượng gì (hiệu năng, bảo mật, mở rộng, độ sẵn sàng).

Q4. Làm sao chứng minh phạm vi đề tài không quá rộng?
A4. Định nghĩa rõ in-scope/out-of-scope ngay từ đầu và bám product backlog có ưu tiên P0/P1/P2.

### Nhóm B - Phân tích và thiết kế hệ thống

Q5. Vì sao chọn kiến trúc modular monolith?
A5. Phù hợp quy mô đồ án: phát triển nhanh, debug dễ, chi phí vận hành thấp; vẫn tách domain rõ nên có thể chuyển dần sang microservices khi cần.

Q6. Vì sao chọn MongoDB?
A6. Dữ liệu nghiệp vụ dạng document, thay đổi linh hoạt theo tiến độ đồ án; kết hợp schema validation/index để đảm bảo chất lượng dữ liệu.

Q7. Thiết kế domain model như thế nào để tránh rối?
A7. Bắt đầu từ thực thể lõi và quan hệ nghiệp vụ thực tế (material, lot, transaction, batch, qc), sau đó gắn quy tắc trạng thái và dữ liệu audit cho từng thực thể.

Q8. Có nên thiết kế API trước khi code không?
A8. Nên. Thiết kế API contract sớm giúp frontend/backend làm song song và giảm xung đột tích hợp.

### Nhóm C - Kỹ thuật triển khai

Q9. Kỹ thuật backend quan trọng nhất là gì?
A9. Tách lớp Controller -> Service -> Repository, DTO validation chặt, business rule ở service, và guard phân quyền ở tầng vào.

Q10. Kỹ thuật frontend quan trọng nhất là gì?
A10. Thiết kế UI theo role, tách service gọi API, chuẩn hóa xử lý loading/error, và tránh nhồi logic nghiệp vụ quá sâu trong component.

Q11. Làm sao xử lý đồng bộ trạng thái nghiệp vụ?
A11. Quy định state transition hợp lệ (ví dụ lot status), chặn chuyển trạng thái sai ở backend và viết test cho negative cases.

Q12. Kỹ thuật đảm bảo truy vết (traceability)?
A12. Lưu quan hệ dữ liệu xuyên chuỗi nghiệp vụ + metadata người thao tác/thời gian/lý do thay đổi.

Q13. Có cần event-driven trong đồ án không?
A13. Không bắt buộc; dùng khi cần tách xử lý bất đồng bộ hoặc mô phỏng kiến trúc mở rộng. Nếu dùng, cần tài liệu rõ event contract.

### Nhóm D - Bảo mật và chất lượng

Q14. Cơ chế authN/authZ nên trình bày thế nào?
A14. Nêu rõ IdP (Keycloak), JWT verification, role guards, route public/protected, và luồng token từ frontend đến backend.

Q15. Những lỗi bảo mật sinh viên hay gặp?
A15. Lộ secret trong repo, CORS cấu hình rộng, thiếu rate-limit, thiếu kiểm soát input, và dùng localStorage token mà không có chiến lược XSS mitigation.

Q16. Cần kiểm thử những gì để đủ điểm phần kỹ thuật?
A16. Unit test cho service/repository, integration test cho workflow quan trọng, negative test cho validation và quyền truy cập, lint/format/type checks trong pipeline.

Q17. Làm sao giải thích "chất lượng phần mềm" ngắn gọn?
A17. Chất lượng = đúng nghiệp vụ + ổn định + an toàn + dễ bảo trì; đo bằng test pass rate, bug leakage, tốc độ phản hồi, độ rõ ràng cấu trúc mã.

### Nhóm E - Dev process và teamwork

Q18. Quy trình làm đồ án nên theo mô hình nào?
A18. Có thể dùng mô hình lặp (iterative/incremental) theo sprint ngắn, mỗi sprint có mục tiêu rõ, demo được, và có retrospective.

Q19. Vai trò trưởng nhóm cần làm gì?
A19. Quản lý scope, ưu tiên backlog, phân công theo năng lực, giữ chuẩn code review, và theo dõi rủi ro tiến độ.

Q20. Cách chia task hiệu quả?
A20. Chia theo vertical slice (feature hoàn chỉnh từ UI -> API -> DB -> test), tránh chia kiểu mỗi người một tầng gây bottleneck tích hợp.

Q21. Làm sao giảm xung đột git khi nhiều người làm cùng lúc?
A21. Branch theo feature, pull/rebase thường xuyên, PR nhỏ và review sớm, thống nhất naming/convention từ đầu.

### Nhóm F - Trình bày và bảo vệ

Q22. Khung trình bày 7-10 phút nên như thế nào?
A22.
1) Bài toán và mục tiêu
2) Kiến trúc và quyết định kỹ thuật
3) Demo end-to-end workflow
4) Kiểm thử và kết quả
5) Hạn chế và roadmap

Q23. Hội đồng thường hỏi sâu điểm gì?
A23. Lý do chọn công nghệ, xử lý edge cases, bảo mật, tính nhất quán dữ liệu, cách đo hiệu quả, và khả năng mở rộng.

Q24. Nếu bị hỏi "vì sao không làm microservices" trả lời sao?
A24. Trả lời theo trade-off: phạm vi môn học ưu tiên tiến độ/chất lượng chức năng lõi; modular monolith là bước phù hợp, vẫn có đường nâng cấp sau này.

Q25. Nếu demo lỗi trực tiếp thì xử lý thế nào?
A25. Bình tĩnh chuyển sang fallback scenario đã chuẩn bị, giải thích nguyên nhân kỹ thuật và chỉ ra cách khắc phục có kiểm chứng.

## 4. Các kỹ thuật/cách làm nên áp dụng trong Đồ án CNPM

### 4.1 Kỹ thuật phân tích
- Context diagram + use case theo role.
- Domain model rõ thực thể/quan hệ/ràng buộc.
- User story với acceptance criteria kiểm thử được.

### 4.2 Kỹ thuật thiết kế
- Module hóa theo domain, không theo kỹ thuật thuần.
- API-first cho endpoint quan trọng.
- Chuẩn hóa naming, error response, và DTO contracts.

### 4.3 Kỹ thuật lập trình
- Backend: service-centric business rules, validation ở biên.
- Frontend: phân lớp component và service, quản lý trạng thái rõ ràng.
- Logging có cấu trúc, không log secret.

### 4.4 Kỹ thuật kiểm thử
- Unit test theo hành vi nghiệp vụ.
- Integration test cho chuỗi nghiệp vụ chính.
- Regression checklist trước khi demo/bảo vệ.

### 4.5 Kỹ thuật làm việc nhóm
- Definition of Done rõ (code + test + docs + review).
- Review checklist cố định cho PR.
- Mỗi sprint đều có demo nội bộ và retrospective.

## 5. Quy trình làm một dự án trong phạm vi môn học (đề xuất)

### Giai đoạn 1 - Inception (Tuần 1-2)
1. Chọn bài toán và mục tiêu đo được.
2. Thu thập yêu cầu và chuẩn hóa scope.
3. Dựng domain model và kiến trúc sơ bộ.
4. Chốt backlog phiên bản MVP.

Deliverables:
- PRD/Requirements
- Domain model
- Architecture draft
- Sprint plan đầu tiên

### Giai đoạn 2 - Construction vòng lặp (Tuần 3-10)
Lặp theo sprint 1-2 tuần:
1. Planning: chọn user stories.
2. Design: API + data + UI flow.
3. Implement: UI/API/DB.
4. Test: unit/integration/regression.
5. Review: demo + retro + cập nhật backlog.

Deliverables mỗi sprint:
- Increment chạy được
- Test evidence
- Tech notes/decision log

### Giai đoạn 3 - Stabilization & Defense (Tuần 11-12)
1. Hardening bảo mật và cấu hình.
2. Chốt tài liệu trình bày + script demo.
3. Dry-run bảo vệ nhiều lần.
4. Đóng gói release cuối.

Deliverables cuối:
- Build/deploy guide
- Test report
- Slide + demo script
- Q&A defense playbook

## 6. Checklist tự đánh giá trước khi nộp đồ án

Business:
- Mục tiêu và phạm vi rõ
- Luồng nghiệp vụ chính chạy end-to-end

Technical:
- Kiến trúc hợp lý với scope
- Quy tắc dữ liệu/trạng thái nhất quán
- API và UI tích hợp ổn định

Quality:
- Có unit test và ít nhất một số integration test
- Lint/type/build sạch
- Không còn lỗi blocker trong demo path

Security:
- Không lộ secret
- Route protected đúng role
- Input validation đầy đủ cho endpoint chính

Presentation:
- Demo script có fallback
- Trả lời được trade-off kỹ thuật
- Nêu được hạn chế và roadmap thực tế

## 7. Khuyến nghị cho nhóm sinh viên

1. Ưu tiên chạy được luồng nghiệp vụ chính trước rồi mới tối ưu.
2. Tránh làm quá rộng tính năng ngoài phạm vi học phần.
3. Mọi quyết định kỹ thuật cần có lý do và bằng chứng (code/test/demo).
4. Tách rõ "đã làm" và "định hướng" trong báo cáo để minh bạch học thuật.
5. Dùng AI như trợ lý kỹ thuật có kiểm chứng, không thay thế tư duy thiết kế của nhóm.

## 8. Gợi ý sử dụng tài liệu này

- Dùng phần Q&A để luyện bảo vệ theo vai trò trong nhóm.
- Dùng phần quy trình để lập kế hoạch học kỳ cho đề tài mới.
- Dùng checklist để tự rà soát trước các mốc demo/submit.
