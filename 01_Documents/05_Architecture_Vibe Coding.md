# 05_Architecture - Vibe Coding

## 1. Mục tiêu file chính
File chính [05_Architecture.md](05_Architecture.md) mô tả kiến trúc IMS theo nhiều góc nhìn (functional, logical, process, development, deployment, data).

Mục tiêu của file Vibe Coding này:
- Trình bày cách nhóm đã dùng công cụ và prompt để xây dựng tài liệu kiến trúc có kiểm chứng.
- Thể hiện cách làm chủ động phân tích, tìm tòi, đối chiếu thực tế thay vì phụ thuộc hoàn toàn vào AI.
- Ghi rõ phần nào do AI hỗ trợ, phần nào nhóm tự xác thực trước khi chốt vào tài liệu.

---

## 2. Phạm vi trình bày và nguyên tắc làm việc

Phạm vi của file này:
- Tập trung vào quy trình tạo/cập nhật nội dung kiến trúc và sơ đồ.
- Tập trung vào quyết định kiến trúc mang tính nền tảng cho các phần sau như deployment, observability, security integration.

Không đi quá sâu ở bước này:
- Nhóm đã chốt FE/BE/DB stack cho đồ án, nên không dành dung lượng phân tích chi tiết lại lựa chọn công nghệ nền (ví dụ framework FE, framework BE, DB engine).
- Chỉ nêu ngắn gọn các stack đó ở mức bối cảnh để phục vụ phần triển khai tiếp theo.

Nguyên tắc khi làm việc với AI:
- AI chỉ là công cụ tăng tốc tổng hợp và chuẩn hóa diễn đạt.
- Mọi thông tin kiến trúc quan trọng phải được đối chiếu với PRD, Domain Model, Workflow, Prototype, Backlog và các ràng buộc vận hành.
- Không chốt nội dung chỉ dựa trên một lần trả lời của AI.
- Source code được dùng như bước hậu kiểm sau triển khai, không phải đầu vào chính của Giai đoạn thiết kế kiến trúc ban đầu.

## 3. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex, Claude sonnet 4.5)
	- Vai trò: đề xuất nháp kiến trúc mục tiêu từ tài liệu yêu cầu, chuẩn hóa mô tả theo 6 góc nhìn, và sinh bộ câu hỏi làm rõ.
	- Giới hạn: không dùng kết quả AI nếu chưa qua đối chiếu với tài liệu nghiệp vụ và quyết định của nhóm.

- PlantUML
	- Vai trò: dựng mã sơ đồ use case, component/container, sequence, deployment, data flow.
	- Cách dùng: nhóm tự kiểm tra lại tên service, giao thức, chiều luồng dữ liệu trước khi render.

- VS Code + Markdown Preview
	- Vai trò: biên tập file kiến trúc, kiểm tra liên kết ảnh/sơ đồ, rà soát tính nhất quán giữa các phần.

## 4. Prompt mẫu đã dùng
### Prompt 1 - Xây kiến trúc mục tiêu từ tài liệu đầu vào
"Phân tích PRD, Domain Model, Workflow, Prototype và Product Backlog để đề xuất kiến trúc mục tiêu cho IMS: danh sách service, ranh giới trách nhiệm, giao tiếp HTTP/gRPC, data stores, và vai trò từng service."

### Prompt 2 - Viết theo 6 góc nhìn trước khi code
"Soạn tài liệu kiến trúc theo Functional, Logical, Process, Development, Data, Deployment cho hệ thống dự kiến triển khai; đánh dấu rõ phần nào là quyết định đã chốt và phần nào là giả định cần xác minh."

### Prompt 3 - Tạo PlantUML cho kiến trúc đích
"Tạo mã PlantUML cho component view và deployment view của IMS với các thành phần mục tiêu: web-app, api-gateway, inventory-management-service, keycloak-service, metrics-service, analytics-indexer-service, ai-service, MongoDB, Redis, Elasticsearch, Keycloak; thể hiện rõ boundary và luồng chính để làm baseline coding."

### Prompt 4 - Bắt buộc đọc và tóm tắt trước khi viết
"Trước khi đề xuất tài liệu kiến trúc, hãy đọc PRD, Domain Model, Workflow, Prototype, Product Backlog; sau đó tóm tắt 3 phần: hệ thống cần giải quyết vấn đề gì, kiến trúc mục tiêu nên tổ chức thế nào, và điểm còn mơ hồ cần xác minh thủ công với nhóm."

### Prompt 5 - Đặt câu hỏi Why để tránh mô tả hời hợt
"Với mỗi quyết định kiến trúc quan trọng (gateway, gRPC nội bộ, indexer, keycloak), hãy trả lời Why: tại sao cần thành phần này, nếu bỏ đi thì rủi ro gì, và ảnh hưởng đến deploy/scale ra sao."

### Prompt 6 - Lập kế hoạch cập nhật theo đợt
"Lập kế hoạch cập nhật tài liệu kiến trúc theo 3 đợt: Đợt 1 chốt functional+logical, Đợt 2 chốt process+data, Đợt 3 chốt deployment+security+observability; mỗi đợt ghi rõ đầu ra cần có và cách kiểm chứng."

### Prompt 7 - Triển khai theo kế hoạch đã duyệt
"Triển khai đúng Đợt 1 theo kế hoạch đã chốt; sau khi cập nhật, liệt kê các giả định, các điểm đã kiểm chứng, và các điểm cần nhóm xác nhận thêm trước khi sang Đợt 2."

### Prompt 8 - Prompt phản biện chéo
"Review tài liệu kiến trúc hiện tại theo mindset kiến trúc sư: chỉ ra mâu thuẫn giữa các view, dịch vụ thiếu trong sơ đồ, hoặc luồng dữ liệu chưa khớp PRD/Workflow/Backlog. Đề xuất patch cụ thể trước khi triển khai code."

---

## 5. Quy trình làm việc chi tiết của nhóm (human-in-the-loop)

1. Xác nhận phạm vi nghiệp vụ MVP/P1 từ PRD, backlog và workflow.
2. Yêu cầu AI tạo nháp kiến trúc mục tiêu theo 6 góc nhìn.
3. Nhóm tự đối chiếu từng quyết định kiến trúc với ràng buộc nghiệp vụ và vận hành.
4. Yêu cầu AI đặt câu hỏi Why cho các quyết định kiến trúc chính.
5. Chốt từng view theo đợt nhỏ, không chốt toàn bộ một lần.
6. Tạo/điều chỉnh PlantUML để dùng làm baseline cho giai đoạn coding.
7. Chạy vòng phản biện: tìm điểm mâu thuẫn giữa functional, logical, process, data, deployment.
8. Chốt phiên bản kiến trúc trước khi phân rã task kỹ thuật và triển khai code.

Điểm nhấn không phụ thuộc hoàn toàn vào AI:
- AI sinh nháp nhanh, nhóm là bên chịu trách nhiệm kiểm chứng và quyết định cuối.
- Mỗi khẳng định quan trọng phải có bằng chứng từ tài liệu đầu vào và quyết định nghiệp vụ đã được nhóm xác nhận.
- Sau khi có code, nhóm mới chạy vòng hậu kiểm để xác minh code bám kiến trúc đã chốt.

Chi tiết bổ sung khi cập nhật file kiến trúc:
- Với mỗi góc nhìn, nhóm đều trả lời 2 câu hỏi bắt buộc:
	- What: phần này mô tả chính xác thành phần/luồng nào?
	- Why: thành phần/luồng đó tồn tại để giải quyết ràng buộc gì?
- Nếu chưa trả lời được Why, chưa chốt nội dung vào bản cuối.

---

## 6. Bảng kiểm chứng trước khi chốt nội dung

Bảng nhóm dùng trong quá trình review:

| Hạng mục | AI đề xuất | Nhóm kiểm chứng thủ công | Nguồn kiểm chứng |
| :-- | :-- | :-- | :-- |
| Danh sách service mục tiêu | Có | Có | PRD + Domain Model + Backlog |
| Port/protocol dự kiến | Có | Có | Architecture constraints + NFR |
| HTTP/gRPC routing mục tiêu | Có | Có | Workflow + Use cases |
| Data flow Mongo -> ES | Có | Có | Reporting requirements + Data view |
| Security flow Keycloak/JWT | Có | Có | Security requirements + role matrix |
| Deployment assumptions | Có | Có | Deployment scenario draft |
| Observability path | Có | Có | Monitoring requirements |
| Mức độ bám kiến trúc sau coding (hậu kiểm) | Có | Có | Source tree + compose + config |

Ý nghĩa bảng:
- Giúp minh bạch phần nào do AI hỗ trợ, phần nào đã xác thực bởi nhóm.

---

## 7. Prompt theo từng Giai đoạn làm việc (chi tiết để tái sử dụng)

### 7.1 Giai đoạn khởi động
"Đọc PRD, Domain Model, Workflow, Prototype, Product Backlog; sau đó tóm tắt kiến trúc mục tiêu trong tối đa 12 gạch đầu dòng. Tách rõ phần chắc chắn và phần cần xác minh."

### 7.2 Giai đoạn bóc tách service và ranh giới
"Liệt kê service boundaries dự kiến: service nào là core domain, service nào là auth, service nào là analytics, service nào là AI support. Với mỗi service nêu input/output và lý do tách boundary."

### 7.3 Giai đoạn dựng các view
"Soạn Functional View và Logical View trước; chỉ khi hai view nhất quán mới tiếp tục Process View và Data View. Nếu phát hiện mâu thuẫn phải dừng và nêu câu hỏi làm rõ."

### 7.4 Giai đoạn định hình deployment-ready architecture
"Không cần phân tích lại sâu FE/BE/DB stack. Chỉ nêu các thành phần nền tảng phục vụ triển khai: gateway, identity, indexer, metrics, storage, cache, search, network boundary."

### 7.5 Giai đoạn phản biện Why
"Đặt câu hỏi Why cho từng thành phần kiến trúc quan trọng và đánh giá nếu bỏ thành phần đó thì ảnh hưởng tới bảo mật, hiệu năng, vận hành, và deploy như thế nào."

### 7.6 Giai đoạn chốt và tạo patch
"Tạo danh sách patch cuối cho tài liệu kiến trúc trước coding: patch nội dung, patch sơ đồ, patch chú thích. Ưu tiên từ mức ảnh hưởng cao đến thấp."

---

## 8. Checklist hoàn thiện file chính (bản chi tiết)
- Danh sách service mục tiêu, boundary và trách nhiệm được định nghĩa rõ trước coding.
- Cổng/giao thức được đề xuất nhất quán giữa logical view và deployment view.
- Luồng MongoDB -> Elasticsearch qua indexer được mô tả rõ điều kiện đồng bộ.
- Sơ đồ PlantUML khớp nội dung văn bản, không lệch tên service hoặc chiều luồng.
- Có phần security (Keycloak/OIDC/JWT) và chỉ ra điểm kiểm soát truy cập chính.
- Có phần deployment/operational foundation để nối sang tài liệu deploy.
- Có ghi chú giả định, rủi ro kiến trúc và điểm cần xác minh ở vòng triển khai.
- Có tiêu chí hậu kiểm sau coding để bảo đảm code bám kiến trúc đã chốt.

---

## 9. Minh chứng cách làm không phụ thuộc hoàn toàn vào AI

Các thực hành bắt buộc của nhóm:
- Không chấp nhận output AI nếu không có bước đối chiếu với PRD/Domain/Workflow/Prototype/Backlog.
- Mỗi lần AI đề xuất thay đổi kiến trúc đều phải trả lời thêm câu hỏi Why.
- Mỗi đợt cập nhật đều có vòng review nội bộ trước khi ghi vào file chính.
- Mọi sơ đồ đều kiểm tra chéo với mã PlantUML và mô tả văn bản.
- Sau khi code xong, thực hiện vòng hậu kiểm để đo mức độ bám giữa code và kiến trúc.

Kết quả đạt được:
- Tài liệu có tính chính xác cao hơn so với chỉ dùng mô tả tự động.
- Nhóm hiểu rõ logic hệ thống, đủ cơ sở để chuyển sang phần deployment và vận hành.

## 10. Lưu ý cập nhật
Khi thêm service mới, đổi protocol, hoặc đổi deployment topology:
- Cập nhật đồng thời phần mô tả + sơ đồ để giữ tính nhất quán tài liệu.
- Chạy lại vòng prompt phản biện để phát hiện mâu thuẫn giữa các view.
- Đối chiếu lại các thành phần nền tảng liên quan đến triển khai (deployment, security, observability).

Lưu ý về thứ tự thực hiện:
- Thiết kế và chốt Architecture trước khi triển khai code.
- Sau triển khai, chỉ cập nhật tài liệu ở dạng hậu kiểm/chênh lệch so với kiến trúc mục tiêu ban đầu.