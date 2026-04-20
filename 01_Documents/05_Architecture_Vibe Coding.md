# 05_Architecture - Vibe Coding

## 1. Mục tiêu file chính
File chính [05_Architecture.md](05_Architecture.md) mô tả kiến trúc IMS theo nhiều góc nhìn (functional, logical, process, development, deployment, data).

## 2. Công cụ nhóm sử dụng
- GitHub Copilot Chat (GPT-5.3-Codex): tổng hợp kiến trúc từ source code và chuẩn hóa mô tả.
- PlantUML: dựng use case, component, sequence, ER, deployment diagrams.
- VS Code Markdown Preview: rà soát cấu trúc và link ảnh.
- Docker Compose + README/source tree: đối chiếu cổng dịch vụ và dependency thực tế.

## 3. Prompt mẫu đã dùng
### Prompt 1 - Trích xuất kiến trúc từ source
"Phân tích cấu trúc repository IMS và liệt kê các service chính, giao tiếp HTTP/gRPC, data stores, và vai trò từng service."

### Prompt 2 - Viết theo 6 góc nhìn
"Soạn tài liệu kiến trúc theo Functional, Logical, Process, Development, Data, Deployment cho hệ thống microservices hiện tại."

### Prompt 3 - Tạo PlantUML
"Tạo mã PlantUML cho component view và deployment view của IMS với các thành phần: web-app, api-gateway, inventory-management-service, keycloak-service, metrics-service, analytics-indexer-service, ai-service, MongoDB, Redis, Elasticsearch, Keycloak."

## 4. Cách tiếp cận của nhóm
1. Xác nhận phạm vi dịch vụ đang chạy thực tế trong `02_Source/01_Source Code`.
2. Chốt mô hình dữ liệu trung tâm (lot-centric inventory).
3. Viết từng góc nhìn độc lập, sau đó so khớp chéo để tránh mâu thuẫn.
4. Chèn sơ đồ PlantUML và ảnh render tương ứng.
5. Bổ sung môi trường cloud/prod, security integration và observability.

## 5. Checklist hoàn thiện file chính
- Tên service, cổng, giao thức đúng với source.
- Luồng dữ liệu MongoDB -> Elasticsearch qua indexer được mô tả rõ.
- Có đầy đủ diagram code (PlantUML) cho từng view chính.
- Có phần security (Keycloak/OIDC/JWT) và deployment cloud.
- Có ghi chú kiến trúc quan trọng để phục vụ bảo vệ đồ án.

## 6. Lưu ý cập nhật
Khi thêm service mới, đổi protocol, hoặc đổi deployment topology, cập nhật đồng thời phần mô tả + sơ đồ để giữ tính nhất quán tài liệu.