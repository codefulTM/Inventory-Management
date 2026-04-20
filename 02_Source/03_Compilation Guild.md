# Hướng Dẫn Cài Đặt, Biên Dịch, Cấu Hình và Chạy Hệ Thống (Compilation Guild)

Tài liệu này cập nhật các bước thực tế để chạy và phát triển source code nằm trong `02_Source/01_Source Code`.

**Mục tiêu ngắn gọn:** chạy toàn bộ hệ thống bằng Docker Compose (nhanh nhất) hoặc chạy từng service để phát triển (local dev).

## 1. Yêu cầu cơ bản

- Hệ điều hành: Windows / macOS / Linux
- Node.js >= 18 (LTS)
- npm >= 9 (hoặc `yarn` nếu project có `yarn.lock`)
- Docker & Docker Compose (nếu muốn chạy toàn bộ bằng container)
- Git

## 2. Cấu trúc chính (tóm tắt)

Thư mục code chính: `02_Source/01_Source Code`

- `inventory-management-service/` — backend (NestJS)
- `api-gateway/` — API gateway (NestJS)
- `inventory-management-web-app/` — frontend (React + Vite)
- `ai-service/`, `metrics-service/`, `analytics-indexer-service/`, `keycloak-service/` — microservices
- `database/` — script init DB (mongo-init.js)
- `docker-compose.yml` — compose file chạy sẵn hầu hết services

## 3. Chạy nhanh (Toàn bộ bằng Docker Compose)

1. Mở terminal, chuyển vào thư mục source:
   ```bash
   cd "02_Source/01_Source Code"
   ```
2. Build và chạy tất cả service (ngầm/background):
   ```bash
   docker compose up --build -d
   ```
3. Một số endpoint & port mặc định (theo `docker-compose.yml`):
   - MongoDB: `localhost:27017`
   - Keycloak (admin): `http://localhost:8080`
   - API Gateway: `http://localhost:3000`
   - Backend (inventory-management-service): `http://localhost:3001` (gRPC: 50052)
   - AI service: `http://localhost:3003`
   - Frontend (Vite dev server): `http://localhost:5173`
   - Elasticsearch: `http://localhost:9200`
   - Redis: `localhost:6379`

4. Kiểm tra logs / trạng thái:
   ```bash
   docker compose ps
   docker compose logs -f inventory-management-service api-gateway inventory-management-web-app
   ```
5. Dừng và xoá containers:
   ```bash
   docker compose down
   ```

## 4. Chạy test / seed dữ liệu

- Unit / e2e (backend):

  ```bash
  cd inventory-management-service
  npm run test         # unit
  npm run test:e2e     # e2e (cần infra up)
  ```

- Seed sample data (scripts có sẵn):
  ```bash
  npm run task4:data:seed
  # hoặc các tùy chọn small|medium|large
  ```

## 5. Một số lệnh hữu ích

- Xem trạng thái containers: `docker compose ps`
- Tail logs: `docker compose logs -f <service-name>`
- Build riêng service: `docker compose build <service-name>`
- Start chỉ một service: `docker compose up -d <service-name>`

## 6. Ghi chú & xử lý sự cố nhanh

- Port conflict: kiểm tra cổng 3000/3001/5173/27017/8080.
- Nếu backend không kết nối Mongo: kiểm tra `MONGODB_URI` trong `.env` hoặc container `mongo` đang chạy.
- Nếu dùng `03_Deployment/01_Deployment_Package/base/docker-compose-mongo.yml` trên Windows, sửa volume host path (không dùng `/home/ubuntu/...`).

## 7. Tài liệu liên quan

- Xem [README chính của source](02_Source/01_Source Code/README.md) để biết tóm tắt nhanh.
- Xem README của từng service (ví dụ `inventory-management-service/README.md`, `inventory-management-web-app/README.md`) để biết scripts và test cụ thể.

## 8. Video hướng dẫn cài đặt và chạy hệ thống

- Xem video hướng dẫn chi tiết quá trình: [https://www.youtube.com/watch?v=example](https://www.youtube.com/watch?v=example) (thay bằng link thực tế)
