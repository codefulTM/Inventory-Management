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

   > Lưu ý: nếu bạn chạy stack bằng `docker compose`, tạo file `.env` nằm cùng cấp với `docker-compose.yml` và thêm:

   ```text
   MAIL_USER=your@gmail.com
   MAIL_PASS=<your_smtp_app_password>
   ```

   Các dịch vụ (ví dụ `inventory-management-service`) sẽ tham chiếu các biến này từ `docker-compose.yml`.

3. Kiểm tra logs / trạng thái:
   ```bash
   docker compose ps
   docker compose logs -f inventory-management-service api-gateway inventory-management-web-app
   ```
4. Dừng và xoá containers:
   ```bash
   docker compose down
   ```

## 4. Chạy test / seed dữ liệu

- Hướng dẫn test:

### Test toàn bộ microservices trên Docker

1. Từ `02_Source/01_Source Code` dựng và khởi chạy infra cần thiết (Mongo, Keycloak, Redis, Elasticsearch):

```bash
cd "02_Source/01_Source Code"
docker compose up --build -d mongo keycloak redis elasticsearch
```

2. Build các image service (nếu chưa có) và khởi chạy chúng trong chế độ background:

```bash
docker compose build
docker compose up -d
```

3. Chạy test từng service bên trong container (ví dụ các service chính):

```bash
# Backend (inventory-management-service)
docker compose exec inventory_backend sh -c "cd /usr/src/app && npm ci && npm run test"

# API Gateway
docker compose exec inventory_api_gateway sh -c "cd /usr/src/app && npm ci && npm run test"

# Analytics indexer
docker compose exec inventory_analytics_indexer sh -c "cd /usr/src/app && npm ci && npm run test"

# Metrics service (gRPC tests may need extra setup)
docker compose exec inventory_metrics_service sh -c "cd /usr/src/app && npm ci && npm run test"
```

Notes:

- Container names come từ `docker-compose.yml` (`inventory_backend`, `inventory_api_gateway`, `inventory_analytics_indexer`, `inventory_metrics_service`, ...). Nếu khác, dùng `docker compose ps` để xem tên.
- `npm ci` đảm bảo devDependencies cho test được cài trong container image; nếu image already contains node_modules you can skip it.

4. Sau khi test xong, dừng và xóa containers nếu muốn:

```bash
docker compose down
```

Nếu bạn gặp lỗi thiếu biến môi trường cho service khi chạy trong container, đảm bảo `.env` (cùng cấp với `docker-compose.yml`) đã chứa `MAIL_USER`/`MAIL_PASS` và các biến khác cần thiết.

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
