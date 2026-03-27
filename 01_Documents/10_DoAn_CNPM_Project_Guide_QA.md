# 10. Hướng Dẫn Trình Bày Đồ Án CNPM - Inventory Management

## 1. Mục tiêu tài liệu
Tài liệu này dùng để:
- Giải thích nhanh dự án cho buổi bảo vệ đồ án Công nghệ phần mềm.
- Trả lời các câu hỏi thường gặp về PRD, kiến trúc, triển khai, kiểm thử, bảo mật.
- Trình bày rõ cách nhóm sử dụng AI trong sản phẩm và trong quá trình phát triển.

## 2. PRD tóm tắt

### 2.1 Bài toán
Doanh nghiệp đang quản lý kho thủ công hoặc bán thủ công (giấy/Excel rời rạc), dẫn đến:
- Sai lệch tồn kho.
- Khó truy vết lô hàng.
- Mất thời gian kiểm kê và lập báo cáo.
- Rủi ro tuân thủ khi kiểm toán.

### 2.2 Người dùng mục tiêu
- Manager: theo dõi tồn kho, duyệt nghiệp vụ, báo cáo.
- Quality Control Technician: kiểm soát chất lượng lô, xử lý reject/quarantine.
- Operator: nhập/xuất/kê khai kiểm kê tại kho.
- IT Administrator: quản lý hệ thống, giám sát, backup/restore, phân quyền.

### 2.3 Mục tiêu nghiệp vụ
- Số hóa vòng đời vật tư: Material -> Inventory Lot -> Production Batch.
- Kiểm soát trạng thái lô: Quarantine, Accepted, Rejected, Depleted.
- Giảm sai sót nhập liệu và tăng khả năng truy vết.
- Cung cấp báo cáo phục vụ vận hành và kiểm toán.

### 2.4 Chức năng chính (Functional)
- Quản lý danh mục vật tư (Material master data).
- Quản lý lô kho (Inventory Lot), cảnh báo hết hạn/sắp hết hạn.
- Quản lý mẻ sản xuất (Production Batch) và thành phần lô sử dụng (Batch Component).
- Quản lý QC test và truy xuất kết quả.
- Quản lý template nhãn, in nhãn barcode/QR.
- Phân quyền và xác thực người dùng theo vai trò.

### 2.5 Yêu cầu phi chức năng (NFR)
- Khả năng mở rộng dữ liệu lớn.
- Mục tiêu uptime cao (99.9%).
- Có thể triển khai container hóa (Docker) và mở rộng hạ tầng (K8s).
- Bảo mật truy cập bằng JWT/Keycloak.

### 2.6 Phạm vi ngoài dự án (Out of Scope)
- CRM.
- Financial kế toán.
- Mobile app native.

## 3. Kiến trúc hệ thống

### 3.1 Tổng quan kiến trúc
- Frontend: React + TypeScript + Vite.
- Backend: NestJS (modular monolith), tách module theo domain nghiệp vụ.
- Database: MongoDB (Mongoose schema).
- Identity/Access: Keycloak + JWT (RS256/JWKS).
- AI: HuggingFace Inference để phân tích hiệu suất nhà cung cấp dựa trên dữ liệu QC.

### 3.2 Các module backend chính
Trong AppModule hiện có các module nghiệp vụ/chung:
- AuthModule, KeycloakModule, UserModule.
- MaterialModule.
- InventoryLotModule.
- ProductionBatchModule.
- QCTestModule.
- LabelTemplateModule.
- AiModule.

### 3.3 Luồng xử lý chính trong backend
- Controller: nhận request, parse/validate input.
- Service: xử lý business rules.
- Repository: truy cập dữ liệu MongoDB qua model.
- Schema: định nghĩa cấu trúc collection, index, enum, timestamp.

### 3.4 Bảo mật và phân quyền
- JwtAuthGuard + RolesGuard được đăng ký global guard.
- JWT được verify qua JWKS từ Keycloak.
- Route public có thể dùng decorator để bypass guard.

### 3.5 Vai trò của AI trong sản phẩm
Backend có endpoint phân tích nhà cung cấp:
- GET /ai/supplier-analysis
- GET /ai/supplier-analysis/:name

AI service dựng system prompt + user prompt từ dữ liệu QC thực tế (tổng lô, đạt, không đạt, quality rate) để trả về:
- Mức rủi ro nhà cung cấp.
- Nhận xét điểm mạnh/yếu.
- Khuyến nghị hành động.

## 4. Hệ thống chạy như thế nào

### 4.1 Luồng nghiệp vụ end-to-end mẫu
1. Tạo Material.
2. Nhập lô Inventory Lot cho material đó.
3. QC kiểm tra lô và cập nhật trạng thái (Accepted/Rejected/Quarantine).
4. Tạo Production Batch.
5. Gắn các Inventory Lot vào Batch Component để theo dõi nguyên liệu đầu vào.
6. Theo dõi báo cáo tồn kho, QC, và truy vết.

### 4.2 Luồng request ở mức kỹ thuật
1. Frontend gọi REST API (Bearer token).
2. Backend guard xác thực JWT + role.
3. Controller nhận request -> Service xử lý logic.
4. Repository query/update MongoDB.
5. Backend trả response DTO đã chuẩn hóa.
6. Frontend render theo role và route tương ứng.

### 4.3 Chạy local bằng Docker + Node (khuyến nghị cho demo)
Từ thư mục 02_Source/01_Source Code:

1. Tạo network dùng chung (chạy 1 lần):
```bash
docker network create inventory_network
```

2. Chạy MongoDB + mongo-express:
```bash
docker compose -f docker-compose-mongo.yml up -d
```
- Mongo host port: 27018
- Mongo Express: http://localhost:8081

3. Chạy Keycloak:
```bash
docker compose -f docker-compose-keycloak.yml up -d
```
- Keycloak: http://localhost:8090

4. Chạy backend:
```bash
cd backend
npm install
npm run start:dev
```
- Backend: http://localhost:3000

5. Chạy frontend:
```bash
cd ../frontend
npm install
npm run dev
```
- Frontend: http://localhost:5173

Lưu ý quan trọng:
- Nếu backend verify token qua Keycloak host 8090, cần cấu hình biến môi trường KEYCLOAK_SERVER_URL phù hợp môi trường chạy.
- Tránh xung đột cổng: 3000, 5173, 8081, 8090.

### 4.4 Kịch bản demo đề xuất khi bảo vệ
- Bước 1: Đăng nhập theo role Manager.
- Bước 2: Tạo Material mới.
- Bước 3: Tạo Inventory Lot cho material đó.
- Bước 4: Vào màn hình QC cập nhật kết quả kiểm tra lô.
- Bước 5: Tạo Production Batch và thêm batch components từ các lot hợp lệ.
- Bước 6: Mở báo cáo/traceability và chứng minh truy xuất nguồn gốc.

## 5. Bộ câu hỏi - trả lời gợi ý khi bảo vệ đồ án

### Q1. Tại sao nhóm chọn kiến trúc modular monolith thay vì microservices?
A1. Vì phạm vi đồ án cần tốc độ phát triển cao, dễ debug và deploy. Modular monolith vẫn tách domain rõ ràng, sau này có thể tách dần thành microservices khi tải tăng.

### Q2. Domain cốt lõi của hệ thống là gì?
A2. Material, InventoryLot, ProductionBatch, QCTest và LabelTemplate.

### Q3. Vì sao dùng MongoDB?
A3. Dữ liệu nghiệp vụ có tính linh hoạt theo document, phù hợp với schema evolving của đồ án. Mongoose giúp chuẩn hóa validate/index.

### Q4. Làm sao đảm bảo tính nhất quán dữ liệu nghiệp vụ?
A4. Áp business rule tại service layer (status transition, date/quantity validation) và ràng buộc schema/index ở persistence layer.

### Q5. Cơ chế xác thực và phân quyền là gì?
A5. JWT + Keycloak (OIDC). Backend dùng guard toàn cục để xác thực token và role cho các route protected.

### Q6. Cách xử lý truy vết lô hàng?
A6. Liên kết Material -> InventoryLot -> ProductionBatch/BatchComponent. Khi cần truy vết có thể xác định lot nào tham gia mẻ nào.

### Q7. Vì sao cần trạng thái lô (Quarantine/Accepted/Rejected/Depleted)?
A7. Để kiểm soát chất lượng và ngăn sử dụng nhầm lô chưa đạt hoặc hết khả dụng.

### Q8. Những NFR nào được ưu tiên trong đồ án?
A8. Khả năng vận hành ổn định, bảo mật truy cập, kiểm thử tự động, và khả năng mở rộng triển khai container.

### Q9. Nhóm đã kiểm thử như thế nào?
A9. Kiểm thử unit theo tầng (service/controller/repository/module/dto/schema), dùng Jest + ESLint + Prettier để kiểm soát chất lượng mã.

### Q10. Khi nào dùng test service, khi nào dùng test repository?
A10. Service test để verify business rules; repository test để verify query contract và paging/filter/sort với model mock.

### Q11. Có kiểm thử negative case không?
A11. Có, bao gồm dữ liệu invalid, status transition sai, thiếu tài nguyên, phân trang sai, dữ liệu ngày/quantity không hợp lệ.

### Q12. Nhóm đo chất lượng code như thế nào?
A12. Dùng lint strict, format chuẩn, và test suite xanh trước khi merge/push.

### Q13. Luồng CI/CD của nhóm định hướng ra sao?
A13. Tối thiểu gồm lint -> test -> build. Triển khai container có thể tích hợp vào pipeline tự động.

### Q14. Nếu số lượng dữ liệu tăng mạnh thì mở rộng thế nào?
A14. Tối ưu index, tách read-heavy endpoint, bổ sung caching và cân nhắc tách service theo domain khi cần.

### Q15. Kế hoạch backup/restore?
A15. Chạy MongoDB theo container, định kỳ backup volume/database dump, có kịch bản restore để kiểm tra tính sẵn sàng.

### Q16. Rủi ro bảo mật lớn nhất của hệ thống?
A16. Quản lý token và cấu hình môi trường sai. Cần bảo vệ secret, HTTPS ở production, harden CORS và policy truy cập.

### Q17. Điểm khó nhất về nghiệp vụ trong đồ án?
A17. Quản lý vòng đời lô và chuyển trạng thái hợp lệ giữa QC, kho, và sản xuất.

### Q18. Vai trò AI trong sản phẩm là gì?
A18. AI hỗ trợ phân tích chất lượng nhà cung cấp dựa trên dữ liệu QC, đưa ra risk ranking và khuyến nghị.

### Q19. Prompt AI trong sản phẩm được thiết kế như thế nào?
A19. Prompt gồm 2 lớp:
- System prompt: định vai trò chuyên gia chuỗi cung ứng/QC, quy định kiểu output.
- User prompt: bảng dữ liệu QC thực tế (total, approved, rejected, quality rate) và quy tắc chấm rủi ro.

### Q20. Cách kiểm soát AI hallucination?
A20. Buộc AI dựa trên dữ liệu đầu vào định lượng, giới hạn phạm vi câu trả lời, và giữ con người xác nhận quyết định cuối.

### Q21. Nhóm dùng AI trong quá trình phát triển như thế nào?
A21. Dùng AI để hỗ trợ phân tích yêu cầu, tạo test case, refactor test code, và review lint/type errors; không dùng AI để thay thế quyết định kiến trúc cuối cùng.

### Q22. Ví dụ prompt dùng AI để tạo test case?
A22.
```text
Bạn là senior QA + NestJS engineer. Hãy tạo test cases cho InventoryLotService theo các nhóm:
- happy path
- validation errors
- status transition errors
- pagination/filter/search
- edge cases về date/quantity
Yêu cầu output theo dạng checklist + expected result.
```

### Q23. Ví dụ prompt dùng AI để fix unit test?
A23.
```text
Dựa trên service implementation hiện tại, hãy sửa file *.spec.ts để:
1) không đổi production code
2) pass strict ESLint rules
3) không dùng any unsafe
4) giữ test rõ ràng theo arrange-act-assert
```

### Q24. Ví dụ prompt dùng AI để viết tài liệu bảo vệ?
A24.
```text
Hãy viết phần trình bày 7 phút cho đồ án Inventory Management gồm:
- bài toán
- kiến trúc
- demo flow
- kết quả kiểm thử
- hạn chế và hướng phát triển
Giữ phong cách ngắn gọn, dễ nói khi thuyết trình.
```

### Q25. Nguyên tắc an toàn khi dùng AI trong dự án?
A25.
- Không gửi secret/token/password lên prompt.
- Không copy output AI vào production nếu chưa review.
- Luôn đối chiếu với code thực tế và test chạy thật.
- Ghi nhận rõ phần nào do AI hỗ trợ để minh bạch học thuật.

## 6. Kết luận ngắn cho slide cuối
Inventory Management là hệ thống quản lý kho theo hướng domain-driven thực dụng: dữ liệu chuẩn hóa theo lô hàng, kiểm soát chất lượng rõ ràng, có khả năng truy vết và mở rộng. Đồ án thể hiện đầy đủ vòng đời kỹ thuật: phân tích yêu cầu, thiết kế kiến trúc, cài đặt, kiểm thử tự động, và áp dụng AI có kiểm soát để tăng năng suất phát triển.
