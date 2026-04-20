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

> Ghi chú: file `03_Deployment/01_Deployment_Package/base/docker-compose-mongo.yml` tồn tại nhưng chứa đường dẫn volume cứng (ví dụ `/home/ubuntu/...`). Trên Windows hãy sửa đường dẫn volume hoặc dùng `02_Source/01_Source Code/docker-compose.yml` để chạy nhanh.

## 4. Chạy từng phần (Local development — recommended for coding)

Thường thì developer chạy Mongo (và các infra cần thiết) bằng Docker, rồi chạy các service node locally để debug.

- Bước 1 — Chạy Mongo (từ folder `02_Source/01_Source Code`):

  ```bash
  docker compose up -d mongo
  ```

- Bước 2 — Chuẩn bị biến môi trường
  - Nhiều service có file mẫu `.env.example`. Copy rồi chỉnh sửa theo máy bạn:
    ```bash
    # Linux / macOS / PowerShell
    cp inventory-management-service/.env.example inventory-management-service/.env
    # Windows cmd
    copy inventory-management-service\.env.example inventory-management-service\.env
    ```
  - Chú ý chỉnh `MONGODB_URI`, `KEYCLOAK_SERVER_URL`, `PORT` nếu cần.

- Bước 3 — Cài phụ thuộc & chạy service (ví dụ các service chính):

  Backend (inventory-management-service):

  ```bash
  cd inventory-management-service
  # Nếu repo có package-lock.json: npm ci  (hoặc npm install)
  npm install
  npm run start:dev
  # server dev: http://localhost:3001
  ```

  API Gateway:

  ```bash
  cd ../api-gateway
  npm install
  npm run start:dev
  # gateway: http://localhost:3000
  ```

  AI Service (nếu cần):

  ```bash
  cd ../ai-service
  npm install
  npm run start:dev
  # ai-service: http://localhost:3003
  ```

  Frontend (inventory-management-web-app):

  ```bash
  cd ../inventory-management-web-app
  npm install   # hoặc yarn
  # Nếu muốn frontend gọi local gateway:
  # set VITE_API_BASE_URL=http://localhost:3000
  npm run dev
  # frontend: http://localhost:5173
  ```

  Notes:
  - Nếu thư mục có `yarn.lock` bạn có thể dùng `yarn` thay vì `npm install`.
  - Một số microservices (analytics-indexer, metrics) cần Elasticsearch/Redis chạy để hoạt động.

## 5. Build cho production

- Backend (NestJS):

  ```bash
  cd inventory-management-service
  npm run build
  # chạy production
  npm run start:prod
  # hoặc: node dist/main.js
  ```

- Frontend (Vite):
  ```bash
  cd inventory-management-web-app
  npm run build
  # preview hoặc serve bằng nginx/docker
  npm run preview
  ```

## 6. Chạy test / seed dữ liệu

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

## 7. Một số lệnh hữu ích

- Xem trạng thái containers: `docker compose ps`
- Tail logs: `docker compose logs -f <service-name>`
- Build riêng service: `docker compose build <service-name>`
- Start chỉ một service: `docker compose up -d <service-name>`

## 8. Ghi chú & xử lý sự cố nhanh

- Port conflict: kiểm tra cổng 3000/3001/5173/27017/8080.
- Nếu backend không kết nối Mongo: kiểm tra `MONGODB_URI` trong `.env` hoặc container `mongo` đang chạy.
- Nếu dùng `03_Deployment/01_Deployment_Package/base/docker-compose-mongo.yml` trên Windows, sửa volume host path (không dùng `/home/ubuntu/...`).

## 9. Tài liệu liên quan

- Xem [README chính của source](02_Source/01_Source Code/README.md) để biết tóm tắt nhanh.
- Xem README của từng service (ví dụ `inventory-management-service/README.md`, `inventory-management-web-app/README.md`) để biết scripts và test cụ thể.

---

If you want, I can now:

- run the repo's lint/tests for one service
- or open a PR with this change
