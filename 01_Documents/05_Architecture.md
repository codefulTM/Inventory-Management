# Hệ Thống Quản Trị Kho Hàng (Inventory Management System - IMS)

## 1. Các Mô Hình Quản Lý Kho Phổ Biến

Quản lý kho không chỉ là đếm hàng tồn, mà là tối ưu hóa dòng chảy hàng hóa để giảm chi phí và tăng hiệu quả vận hành.

### Các phương pháp định giá tồn kho

- **FIFO (First-In, First-Out):** Hàng nhập trước xuất trước. Phù hợp với hàng có hạn sử dụng (thực phẩm, dược phẩm).
- **LIFO (Last-In, First-Out):** Hàng nhập sau xuất trước. Thường dùng cho các mặt hàng đồng nhất (than, đá) hoặc tối ưu thuế.
- **Weighted Average Cost:** Tính giá trung bình gia quyền của toàn bộ hàng trong kho sau mỗi lần nhập.

### Các mô hình tối ưu hóa

- **EOQ (Economic Order Quantity):** Công thức tính lượng hàng đặt tối ưu để tổng chi phí đặt hàng và chi phí lưu kho là thấp nhất.
- **ABC Analysis:** Phân loại hàng hóa dựa trên giá trị mang lại:
  - **Nhóm A:** Giá trị cao (~80%), số lượng ít (~20%). Cần kiểm soát chặt chẽ.
  - **Nhóm B:** Giá trị và số lượng trung bình.
  - **Nhóm C:** Giá trị thấp, số lượng rất lớn. Kiểm soát lỏng hơn.
- **JIT (Just-In-Time):** Mô hình sản xuất/nhập hàng đúng lúc cần, giúp giảm thiểu tối đa vốn tồn kho.

---

## 2. Kiến Trúc Hệ Thống (System Architecture)

Để xây dựng một hệ thống IMS có khả năng mở rộng cao, chúng ta tiếp cận theo 3 góc nhìn:

### A. Góc nhìn Chức năng (Functional View)

Hệ thống được chia thành các module nghiệp vụ tách biệt:

1.  **Catalog Management:** Quản lý thông tin SKU, thuộc tính sản phẩm, mã vạch (Barcode/QR).
2.  **Inbound Management:** Quy trình nhận hàng, kiểm định (QC) và nhập kho (Put-away).
3.  **Inventory Control:** Quản lý số lượng tồn, vị trí (Bin/Rack), chuyển kho nội bộ.
4.  **Outbound Management:** Xử lý đơn hàng, lấy hàng (Picking), đóng gói (Packing) và giao hàng.
5.  **Audit & Stocktake:** Kiểm kê định kỳ và điều chỉnh sai lệch dữ liệu.

### B. Góc nhìn Kỹ thuật (Technical View)

Sử dụng kiến trúc **Microservices** để tách biệt các luồng nghiệp vụ nặng:

- **Service Inventory:** Đảm nhận việc cộng/trừ tồn kho. Sử dụng _Distributed Locking_ để tránh tranh chấp dữ liệu khi nhiều đơn hàng đến cùng lúc.
- **Service Integration:** Kết nối với các sàn TMĐT (Shopee, TikTok Shop) và đơn vị vận chuyển (GHN, GHTK).
- **Service Reporting:** Xử lý các truy vấn dữ liệu lớn để xuất báo cáo mà không ảnh hưởng đến hiệu năng hệ thống bán hàng.

### C. Góc nhìn Dữ liệu (Data View)

- **RDBMS (PostgreSQL/MySQL):** Lưu trữ dữ liệu quan hệ cần tính toàn vẹn cao (Transactions, Products, Orders).
- **NoSQL (MongoDB):** Lưu trữ lịch sử thay đổi (Audit Logs) hoặc thông tin sản phẩm có thuộc tính linh hoạt.
- **In-memory Data (Redis):** Dùng để quản lý "Virtual Inventory" (tồn kho ảo) nhằm phản hồi nhanh cho người dùng trên website/app.

---

## 3. Công Nghệ và Công Cụ Đề Xuất (Tech Stack)

| Thành phần     | Công nghệ đề xuất                          |
| :------------- | :----------------------------------------- |
| **Backend**    | Node.js (NestJS)                           |
| **Frontend**   | React (Typescript)                         |
| **Database**   | MongoDB, Redis (Caching/Locking)           |
| **DevOps**     | Docker, Kubernetes, Jenkins/GitHub Actions |
| **Security**   | Keycloak                                   |
| **Logging**    | ELK                                        |
| **Monitoring** | Prometheus & Grafana                       |

---

## 4. Các Thách Thức Kỹ Thuật Cần Giải Quyết

1.  **Over-selling:** Giải quyết bằng cách sử dụng Cơ chế khóa (Optimistic/Pessimistic Locking) trong Database hoặc Redis.
2.  **Real-time Sync:** Đồng bộ số lượng tồn kho lên nhiều sàn TMĐT ngay lập tức khi có thay đổi (Webhook/Message Queue).
3.  **Traceability:** Khả năng truy xuất nguồn gốc theo từng số Serial hoặc số Lô (Batch number).

---

## 5. Architectural View Model

### 1. Logical View

\*Logical View này mô tả cấu trúc nghiệp vụ. Khi triển khai trên MongoDB, các quan hệ 1:N chặt chẽ (như Batch và BatchComponents) sẽ được triển khai theo dạng **Embedded Document** để tối ưu tốc độ đọc, các quan hệ lỏng hơn sẽ dùng **Reference\***

<img width="1242" height="817" alt="image" src="https://github.com/user-attachments/assets/e0f2a846-f2d5-4389-9ed1-298af0a2f94b" />

### Các tầng kiến trúc (Architecture Layers)

- **Frontend (React + TS):** Lớp giao diện người dùng. Chứa các module quản lý Material (Vật tư), InventoryLot (Lô kho) và ProductionBatch (Mẻ sản xuất). Tích hợp thư viện Keycloak-js để xử lý đăng nhập.
- **API / Server (NestJS):** Tầng trung gian tiếp nhận yêu cầu. Chịu trách nhiệm điều hướng (Routing), xác thực Token (JWT Validation) và kiểm tra dữ liệu đầu vào (Validation).
- **Logic / Persistent (NestJS):** Trái tim của hệ thống. Chứa logic nghiệp vụ xử lý các quy tắc phức tạp (ví dụ: tự động khóa lô hàng khi kiểm nghiệm không đạt, tính toán định mức sản xuất).
- **Database (MongoDB):** Tầng lưu trữ dữ liệu bền vững. Dữ liệu được tổ chức theo các Collection tương ứng với thực thể nghiệp vụ: Vật tư, Lô hàng và Sản xuất.

### Dịch vụ hạ tầng & Công nghệ (Services & Technologies)

- **Security Service (Keycloak IdP):** Quản lý định danh tập trung. Cấp phát Token OIDC cho người dùng và xác thực quyền truy cập của các yêu cầu API.
- **Reporting Service (PDFKit/ExcelJS):** Xử lý việc tổng hợp dữ liệu từ tầng Logic để xuất ra các chứng từ pháp lý như Phiếu nhập kho, Biên bản kiểm kê hoặc nhãn Barcode.
- **Event Bus (Kafka):** Hệ thống hàng đợi thông điệp. Ghi nhận các sự kiện biến động (ví dụ: "LotChanged") để phục vụ hệ thống Audit Trail hoặc gửi thông báo.

### Các mối quan hệ & Luồng dữ liệu (Relationships)

- **Xác thực (OIDC Auth & JWT):** Người dùng đăng nhập qua Keycloak. Tầng API sử dụng Public Key từ Keycloak để xác thực tính hợp lệ của mọi yêu cầu gửi đến.
- **Giao tiếp Frontend - Backend:** Sử dụng giao thức **HTTP/REST API** để trao đổi dữ liệu JSON.
- **Phụ thuộc nghiệp vụ (Internal Logic):**
  - **InventoryLot ➔ Material:** Khi tạo lô hàng, hệ thống tham chiếu đến Master Data (Material) để lấy thông tin quy cách, tiêu chuẩn kiểm nghiệm.
  - **ProductionBatch ➔ InventoryLot:** Khi sản xuất, hệ thống thực hiện trừ tồn kho vật lý từ các lô hàng cụ thể (Picking).
- **Luồng báo cáo (Data Flows):** Tầng Logic đẩy dữ liệu thô vào Reporting Service ➔ Trả về file (PDF/Excel) cho người dùng tải xuống tại giao diện Frontend.
- **Truy vết (Traceability):** Mọi hành động thay đổi trạng thái dữ liệu ở tầng Logic đều phát một sự kiện (Event) vào Kafka để đảm bảo tính minh bạch và khả năng phục hồi dữ liệu.

### 2. Development View

<!-- <img width="1117" height="812" alt="image" src="https://github.com/user-attachments/assets/3fe4a702-13ad-4d54-831c-d6f90e129d20" /> -->

```
.
└── 01_Source Code/
    ├── docker-compose.yml
    ├── frontend/
    │   ├── index.html
    │   ├── package-lock.json
    │   ├── package.json
    │   └── src/
    │       ├── components/
    │       │   ├── Material/
    │       │   │   ├── MaterialList.tsx
    │       │   │   ├── MaterialDetail.tsx
    │       │   │   ├── MaterialForm.tsx
    │       │   │   ├── ...
    │       │   │   └── index.ts
    │       │   ├── User/
    │       │   │   ├── UserList.tsx
    │       │   │   ├── UserDetail.tsx
    │       │   │   ├── UserForm.tsx
    │       │   │   ├── ...
    │       │   │   └── index.ts
    │       │   ├── InventoryLot/
    │       │   │   ├── InventoryLotList.tsx
    │       │   │   ├── InventoryLotDetail.tsx
    │       │   │   ├── InventoryLotForm.tsx
    │       │   │   ├── ...
    │       │   │   └── index.ts
    │       │   └── ProductionBatch/
    │       │       ├── ProductionBatchList.tsx
    │       │       ├── ProductionBatchDetail.tsx
    │       │       ├── ProductionBatchForm.tsx
    │       │       ├── ...
    │       │       └── index.ts
    │       ├── pages/
    │       │   ├── MaterialPage.tsx
    │       │   ├── UserPage.tsx
    │       │   ├── InventoryLotPage.tsx
    │       │   └── ProductionBatchPage.tsx
    │       ├── services/
    │       │   ├── materialService.ts
    │       │   ├── userService.ts
    │       │   ├── inventoryLotService.ts
    │       │   └── productionBatchService.ts
    │       ├── types/
    │       │   ├── material.ts
    │       │   ├── user.ts
    │       │   ├── inventoryLot.ts
    │       │   └── productionBatch.ts
    │       ├── assets/
    │       ├── App.tsx
    │       ├── main.tsx
    │       ├── index.css
    │       └── ...
    ├── database/
    │   └── mongo-init.js
    ├── backend/
    │   ├── src/
    │   │   ├── material/
    │   │   │   ├── material.controller.ts
    │   │   │   ├── material.service.ts
    │   │   │   ├── material.repository.ts
    │   │   │   ├── dto/
    │   │   │   ├── interfaces/
    │   │   │   └── material.module.ts
    │   │   ├── inventory-lot/
    │   │   │   ├── inventory-lot.controller.ts
    │   │   │   ├── inventory-lot.service.ts
    │   │   │   ├── inventory-lot.repository.ts
    │   │   │   ├── dto/
    │   │   │   ├── interfaces/
    │   │   │   └── inventory-lot.module.ts
    │   │   ├── production-batch/
    │   │   │   ├── production-batch.controller.ts
    │   │   │   ├── production-batch.service.ts
    │   │   │   ├── production-batch.repository.ts
    │   │   │   ├── dto/
    │   │   │   ├── interfaces/
    │   │   │   └── production-batch.module.ts
    │   │   ├── database/
    │   │   │   ├── database.module.ts
    │   │   │   └── mongoose.config.ts
    │   │   ├── event-bus/
    │   │   │   ├── kafka.module.ts
    │   │   │   ├── kafka.service.ts
    │   │   │   └── kafka.config.ts
    │   │   ├── schemas/
    │   │   │   ├── material.schema.ts
    │   │   │   ├── inventory-lot.schema.ts
    │   │   │   └── production-batch.schema.ts
    │   │   ├── app.module.ts
    │   │   ├── app.controller.ts
    │   │   ├── app.service.ts
    │   │   ├── main.ts
    │   │   └── ...
    │   ├── test/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── ...
    └── infra/
        ├── k8s/
        │   ├── deployment.yaml
        │   ├── ingress.yaml
        │   ├── mongo-pv.yaml
        │   └── redis-config.yaml
        │── docker/
        │   ├── backend.Dockerfile
        │   └── frontend.Dockerfile
        └── kafka/
            └── docker-compose.yml
```

#### 01_Source Code: Thư mục gốc chứa toàn bộ mã nguồn và cấu hình triển khai

- **docker-compose.yml**: File cấu hình Orchestration chính để khởi chạy toàn bộ hệ thống (Backend, Frontend, MongoDB, Redis, Keycloak) trong môi trường phát triển local chỉ với một câu lệnh.

#### frontend/: Ứng dụng giao diện người dùng (React.js + TypeScript)

- **index.html**: Điểm vào của SPA(Single-Page Application) - trang HTML tĩnh duy nhất mà trình duyệt tải lên đầu tiên, chứa thẻ `<div id="root">` nơi React mount và các meta tags cơ bản.
- **package-lock.json**: Khóa phiên bản chính xác của các gói npm đã cài để đảm bảo build nhất quán, tránh trường hợp máy khác cài đặt các phiên bản khác nhau gây lỗi.
- **package.json**: Liệt kê dependencies, scripts (start, build, test) và cấu hình dự án frontend.
- **src/**: Thư mục mã nguồn chính của ứng dụng.
  - **components/**: Các thành phần React tái sử dụng theo domain (Material, InventoryLot, ProductionBatch...). Mỗi domain có thư mục riêng chứa các component con (List, Detail, Form) và một file index.ts để gom tất cả các component con lại và xuất ra cùng lúc.
  - **pages/**: Các trang (route-level components) tương ứng với URL ứng dụng.
  - **services/**: Lớp hoặc hàm giúp gọi API backend, xử lý logic giao tiếp HTTP.
  - **types/**: Định nghĩa interfaces/type aliases TypeScript cho DTOs và props.
  - **assets/**: Chứa hình ảnh, biểu tượng và các tài nguyên tĩnh khác.
  - **App.tsx**: Component gốc chứa Router, Provider (Keycloak, Contexts) và cấu hình chung.
  - **main.tsx**: Điểm vào của Vite/React, render `<App />` vào DOM.
  - **index.css**: Các style toàn cục hoặc reset CSS áp dụng cho toàn bộ ứng dụng.

#### database/: Cấu hình dữ liệu

- **mongo-init.js**: Script khởi tạo cơ sở dữ liệu MongoDB, dùng để tạo các Collections ban đầu, Index và User quản trị database khi container khởi chạy lần đầu.

#### backend/: Ứng dụng xử lý nghiệp vụ (NestJS Monolith)

- **src/**: Thư mục mã nguồn chính của ứng dụng.
  - **material/, inventory-lot/, production-batch/**: Các module nghiệp vụ chính, mỗi module chứa Controller (xử lý HTTP requests), Service (xử lý logic nghiệp vụ), Repository (truy cập dữ liệu) và các thư mục con cho DTOs và Interfaces.
  - **schemas/**: Định nghĩa các Mongoose Schema tương ứng với các thực thể nghiệp vụ (Material, InventoryLot, ProductionBatch).
  - **database/**: Thư mục chứa các cấu hình kết nối cơ sở dữ liệu và helper liên quan.
    - **database.module.ts**: Module NestJS để cung cấp kết nối MongoDB cho toàn bộ ứng dụng.
    - **mongoose.config.ts**: Cấu hình chi tiết cho Mongoose, bao gồm URI kết nối, options và các hooks chung.
  - **event-bus/**: Mã tích hợp hệ thống message queue (Kafka) cho publish/subscribe event.
  - **app.module.ts**: Module gốc của NestJS, nơi import tất cả các module con và cấu hình chung.
  - **app.controller.ts**: Controller gốc, có thể dùng để xử lý các route chung hoặc health check.
  - **app.service.ts**: Service gốc, có thể chứa các logic chung hoặc helper functions.
  - **main.ts**: Entry point chịu trách nhiệm bootstrap ứng dụng NestJS và cấu hình middleware.
- **test/**: Thư mục lưu trữ các file kiểm thử (unit và e2e) cho backend.
- **package.json**: File cấu hình npm liệt kê các dependencies và scripts xây dựng/chạy dự án backend.
- **tsconfig.json**: Cấu hình TypeScript dùng khi biên dịch mã nguồn backend.

#### infra/: Hạ tầng và cấu hình triển khai (DevOps)

- **docker/**: Chứa các Dockerfile riêng biệt để đóng gói ứng dụng.
  - **backend.Dockerfile**: Build image cho NestJS (Node.js runtime).
  - **frontend.Dockerfile**: Build image cho React và sử dụng Nginx để phục vụ web static.
- **k8s/**: Chứa các file YAML để triển khai hệ thống lên cụm Kubernetes.
  - **deployment.yaml**: Định nghĩa số lượng Pods, tài nguyên CPU/RAM cho các dịch vụ.
  - **ingress.yaml**: Cấu hình bộ cân bằng tải và Routing (Điều hướng) traffic từ ngoài vào hệ thống.
  - **mongo-pv.yaml**: Cấu hình Persistent Volume để đảm bảo dữ liệu MongoDB không bị mất khi Pod khởi động lại.
  - **redis-config.yaml**: Cấu hình cho bộ nhớ đệm Redis phục vụ Locking.

#### Cách để build hệ thống

- **Chuẩn bị môi trường**: Cài Node.js (v16+), Docker & Docker Compose.
- **Backend** (thủ công – không dùng Docker):
  1. Di chuyển vào thư mục `02_Source/01_Source Code/backend`.
  2. Chạy `npm install` nếu cần cài thêm package.
  3. Biên dịch TypeScript: `npm run build` (hoặc `tsc -p tsconfig.build.json`).
  4. Kiểm tra bản build bằng `npm run start:prod`.
  - _Ghi chú:_ khi sử dụng Docker/Docker Compose, bước này sẽ được Dockerfile thực hiện tự động và bạn không cần làm lại thủ công.
- **Frontend** (thủ công – không dùng Docker):
  1. Vào `02_Source/01_Source Code/frontend`.
  2. Chạy `npm install` khi muốn cài thủ công.
  3. Build sản phẩm cho production với `npm run build` (Vite).
  4. Thư mục `dist/` chứa bản build, dùng Nginx hoặc server khác để phục vụ.
  - _Ghi chú:_ Dockerfile frontend cũng thực hiện cài và build khi tạo image, do đó bước này chỉ cần khi không dùng Docker để đóng gói.
- **Docker compose**: Từ gốc workspace chạy `docker-compose -f 02_Source/01_Source Code/docker-compose.yml build` để xây tất cả các container (backend, frontend, database, redis, keycloak …). Bởi vì Dockerfile đã tự quản lý bước compile, lệnh này đủ để cả backend/frontend được biên dịch trong quá trình tạo image.
- **Lưu ý**: Sử dụng `--no-cache` khi cần cập nhật toàn bộ; thông số môi trường (ENV vars) được điều chỉnh trong file `.env` hoặc `docker-compose.override.yml`.

#### Cách để chạy hệ thống

- **Chạy thủ công (không dùng Docker):**
  1. Backend: chuyển vào `02_Source/01_Source Code/backend`.
     - Nếu chưa build, thực hiện `npm run build` như ở phần trước.
     - Khởi động bằng `npm run start:prod` (hoặc `node dist/main.js`).
     - Ứng dụng lắng nghe mặc định cổng `3000`.
  2. Frontend: vào `02_Source/01_Source Code/frontend`.
     - Sau khi đã `npm run build`, dùng một HTTP server tĩnh (ví dụ `npx serve dist` hoặc cấu hình Nginx) để phục vụ nội dung ở cổng bất kỳ (thường `5173` hoặc `80`).
  3. MongoDB & Redis: chạy cục bộ (cài bản native hoặc dùng container riêng) với kết nối mặc định `mongodb://localhost:27017` và `redis://localhost:6379`.
  4. Keycloak: cài và chạy trên `http://localhost:8080` (có thể dùng Docker theo hướng dẫn trong file deploy).
  5. Đảm bảo biến môi trường (`.env`) đúng, sau đó truy cập URL frontend và thực hiện đăng nhập.

- **Qua Docker/Docker Compose:**
  1. Di chuyển về thư mục gốc workspace.
  2. Sử dụng cấu hình `02_Source/01_Source Code/docker-compose.yml` (hoặc `docker-compose.override.yml` nếu cần ghi đè) để chạy toàn bộ stack:
     ```bash
     docker-compose -f "02_Source/01_Source Code/docker-compose.yml" up --build
     ```
  3. Lệnh trên sẽ khởi tạo các container backend, frontend, mongo, redis, keycloak… và tự động build lại image nếu cần.
  4. Truy cập:
     - Frontend: http://localhost:5173 (hoặc cổng cấu hình trong compose)
     - Backend API: http://localhost:3000/api
     - Keycloak admin: http://localhost:8080
  5. Dừng các dịch vụ bằng `docker-compose down`.

> Ghi chú: khi chạy bằng Docker Compose, mọi cấu hình (ENV vars) nằm trong `.env`/`docker-compose.override.yml`; backend và frontend đã được biên dịch sẵn trong image nên không cần làm lại thủ công.

### 3. Deployment View

#### Giao diện web cho Người dùng (User's Device)

Tất cả các kết nối từ thiết bị người dùng đến hệ thống đều được thực hiện qua giao thức **HTTPS** để đảm bảo tính bảo mật và mã hóa dữ liệu.
Hosted URL: https://inventory-system.cloud/

#### Backend cho hệ thống

Đây là trung tâm xử lý nghiệp vụ, đóng vai trò điều phối dữ liệu giữa giao diện người dùng và các hệ thống lưu trữ/xác thực. Hệ thống Backend được đóng gói và triển khai trên nền tảng đám mây để đảm bảo khả năng mở rộng và tính sẵn sàng cao.

Hosted URL: [inventory-management-6411.onrender.com
](https://inventory-management-6411.onrender.com/)

#### Bảo mật (Security - Keycloak)

Backend và Frontend thực hiện xác thực và định danh người dùng thông qua **Keycloak** (IdP) bên ngoài cụm K8s. Mọi truy cập đều đi qua **HTTPS**, sử dụng chuẩn **OIDC/OAuth2**, Access Token dạng **JWT** được Backend kiểm tra chữ ký trước khi cho phép truy cập tài nguyên.

#### Tầng Dữ liệu (Data Tier)

Được triển khai trên các Nodes chuyên dụng nhằm tối ưu hiệu suất lưu trữ:

- **MongoDB:** Lưu trữ dữ liệu chính của hệ thống.
- Connection string: mongodb+srv://admin:123@inventorymanagement.kbyjdmp.mongodb.net/?appName=InventoryManagement
- **Redis:** Xử lý Caching và cơ chế **Locking tồn kho** với tốc độ cực nhanh, tránh xung đột dữ liệu.

#### Tầng Giám sát (Observability Tier)

- **ELK Stack:** Thu thập và lưu trữ Logs từ Backend, hỗ trợ IT Admin truy vết lỗi và kiểm soát vận hành.
- **Prometheus & Grafana:** Thu thập số liệu (Metrics) từ phần cứng và ứng dụng, cung cấp cái nhìn trực quan về sức khỏe hệ thống theo thời gian thực.

### 4. Process View

## 4. Process View (Luồng Xử lý Nghiệp vụ)

### Inbound Receipt & QC Evaluation Workflow

#### Thành phần tham gia:

- **Frontend (React):** UI Components cho Operator và QC Personnel.
- **Backend (NestJS):** API Controller, Business Logic, Auth (Keycloak/Okta).
- **Persistence & Infra:** MongoDB, Redis (Lock), Kafka (Events), Prometheus (Metrics).

#### Các pha xử lý:

**Phase 1: Receiving**

1. Operator quét mã & tạo phiếu nhập tạm trên UI.
2. Gửi yêu cầu POST /inbound-batches lên API Controller.
3. Backend xác thực phiên làm việc (Session), kiểm tra Token hợp lệ.
4. Lưu Batch với trạng thái PENDING vào MongoDB.
5. Publish sự kiện "BatchCreated" lên Kafka.
6. Trả về Batch ID cho Frontend, UI phản hồi thành công.

**Phase 2: Quality Evaluation**

7. QC Personnel truy cập danh sách hàng chờ kiểm (GET /qc/pending).
8. Backend trả về thông tin SKU, NCC, số lượng.
9. QC nhập kết quả kiểm nghiệm (độ ẩm, nhiệt độ...) lên UI.
10. Gửi PUT /qc/evaluate/{batchId} lên API Controller.
11. Backend truy xuất Specification dựa trên SKU, tự động đối chiếu (auto-compare).
12. Nếu đạt tiêu chuẩn:

- Cập nhật trạng thái Batch: ACCEPTED.
- Mở khóa Put-away (Lock: FALSE) trên Redis.
- UI cập nhật trạng thái, thông báo Operator.

13. Nếu không đạt:

- Cập nhật trạng thái Batch: REJECTED.
- Kích hoạt Hard-locking (Lock: TRUE) trên Redis.
- Chặn mọi thao tác Picking/Transfer liên quan đến Batch.
- UI cảnh báo, bôi đỏ dữ liệu.

14. Ghi nhận chỉ số hiệu suất QC Metrics.

**Phase 3: Traceability & Logging**

15. Mọi thay đổi trạng thái đều được đẩy sự kiện vào Kafka.
16. Lưu Audit Log và Traceability Log cho Batch.
17. Prometheus thu thập metrics về hiệu suất, trạng thái hệ thống.

#### Giải thích bổ sung:

- **Cơ chế Hard-locking:** Redis đảm bảo trạng thái khóa cứng cho các Batch bị REJECTED, loại bỏ rủi ro xuất nhầm hàng lỗi.
- **Traceability:** Kafka lưu trữ toàn bộ lịch sử thay đổi, đảm bảo khả năng truy xuất nguồn gốc nhanh chóng (<3 giây).
- **UI Feedback:** Frontend phản hồi tức thời, bôi đỏ dữ liệu khi có sai lệch, giúp nhân viên nhận diện và xử lý nhanh.

#### Sơ đồ minh họa:

![](https://github.com/user-attachments/assets/5ef84afb-f075-44d6-aea1-5c4ca88a2a72)

---

---

# 6. Security - Keycloak Integration

Hệ thống Inventory Management System (IMS) sử dụng **Keycloak** làm nền tảng quản trị định danh và truy cập (IAM) tập trung, tuân thủ các tiêu chuẩn bảo mật **OpenID Connect (OIDC)** và **OAuth 2.0**.

### 6.1 Thành phần bảo mật (Components)

#### 6.1.1 Keycloak Identity Provider (IdP)

- **Vai trò:** Quản lý tập trung Realm, Clients, Roles và Users. Lưu trữ thông tin định danh và thực hiện cấp phát Token.
- **Technology Stack:**
  - Keycloak v23+ (Latest LTS)
  - Quarkus runtime
  - PostgreSQL Database (cho Keycloak production) hoặc H2 (development)
  - Java 17+ JRE
- **Container:** `quay.io/keycloak/keycloak:23.0`
- **Deployment:**
  - Development: Docker Compose (port 8080)
  - Production: Kubernetes StatefulSet với 2+ replicas
- **Access Points:**
  - Admin Console: `https://keycloak.domain.com/admin`
  - Realm Endpoint: `https://keycloak.domain.com/realms/inventory-management`
  - Token Endpoint: `https://keycloak.domain.com/realms/inventory-management/protocol/openid-connect/token`
  - JWKS Endpoint: `https://keycloak.domain.com/realms/inventory-management/protocol/openid-connect/certs`

#### 6.1.2 React Frontend (Client Application)

- **Vai trò:** Chịu trách nhiệm chuyển hướng đăng nhập, quản lý Access Token và Refresh Token trong phiên làm việc của người dùng.
- **Technology Stack:**
  - `@react-keycloak/web` v3.4+ hoặc `keycloak-js` v23+
  - React 18+, TypeScript
  - Axios Interceptor (tự động gắn Bearer token)
  - LocalStorage/SessionStorage (lưu trữ token tạm thời)
- **Client Configuration:**
  - Client ID: `inventory-management-frontend`
  - Client Type: Public
  - Valid Redirect URIs: `http://localhost:5173/*`, `https://app.domain.com/*`
  - Web Origins: `http://localhost:5173`, `https://app.domain.com`
  - PKCE: Enabled (S256)
- **Access Flow:** Authorization Code Flow with PKCE

#### 6.1.3 NestJS Backend (Resource Server)

- **Vai trò:** Xác thực chữ ký JWT từ Keycloak và thực thi phân quyền ở mức API (Method-level Security).
- **Technology Stack:**
  - `nest-keycloak-connect` v1.10+
  - `@nestjs/passport` + `passport-jwt`
  - NestJS Guards (AuthGuard, RoleGuard, ResourceGuard)
  - Redis Cache (lưu JWKS và Blacklist tokens)
- **Client Configuration:**
  - Client ID: `inventory-management-backend`
  - Client Type: Confidential
  - Service Account Enabled: Yes
  - Client Authenticator: Client Secret
- **Validation:**
  - JWT Signature Verification (RS256 algorithm)
  - Token Expiration Check
  - Issuer Validation
  - Audience Validation
- **Access Points:**
  - Protected APIs: `https://api.domain.com/api/*`
  - Health Check: `https://api.domain.com/health` (public)
  - Swagger UI: `https://api.domain.com/api/docs` (authenticated)

### 6.2 Logging và Audit Trail

#### 6.2.1 Keycloak Event Logging

- **Event Types:**
  - Login Events: LOGIN, LOGOUT, LOGIN_ERROR, REFRESH_TOKEN
  - Admin Events: CREATE_USER, UPDATE_USER, DELETE_ROLE, GRANT_CONSENT
- **Storage:**
  - Development: Keycloak Database (7 days retention)
  - Production: Forward to ELK Stack via Filebeat
- **Log Format:** JSON structured logs
- **Access:** Admin Console → Events → Login Events / Admin Events

#### 6.2.2 Backend Audit Logs

- **Captured Information:**
  - Timestamp (ISO 8601)
  - User ID & Username (từ JWT claims)
  - HTTP Method & Path
  - Request Payload (sanitized, exclude passwords)
  - Response Status Code
  - IP Address & User Agent
  - Session ID
- **Implementation:** NestJS Interceptor + Winston Logger
- **Storage:**
  - File: `logs/audit-{date}.log` (local development)
  - ELK: Elasticsearch Index `audit-logs-*` (production)
- **Retention:** 90 days (compliance requirement)
- **Query Access:** Kibana Dashboard (IT Administrator role only)

#### 6.2.3 Security Event Monitoring

- **Critical Events:**
  - Multiple failed login attempts (> 5 in 5 minutes)
  - Privilege escalation attempts
  - Access to Quarantine/Rejected lots
  - Session termination by Manager
  - Backup/Restore operations
- **Alerting:**
  - Slack/Email notifications for critical events
  - Prometheus AlertManager integration
- **Dashboard:** Grafana Security Overview (realtime metrics)

### 6.3 Luồng xác thực & Ủy quyền

#### 6.3.1 Authentication Flow (PKCE)

1. **Khởi tạo:** User truy cập Frontend → Redirect sang Keycloak Login Page
2. **PKCE Challenge:** Frontend tạo `code_verifier` và `code_challenge` (SHA-256)
3. **Authorization Code:** Keycloak xác thực thông tin → trả về Authorization Code
4. **Token Exchange:** Frontend gọi Token Endpoint với Code + Code Verifier → nhận Access Token (JWT) & Refresh Token
5. **Token Storage:** Lưu tokens vào SessionStorage (hoặc Memory cho bảo mật cao hơn)

#### 6.3.2 API Authorization Flow

```
Frontend → Backend API Request
├─ Header: Authorization: Bearer <Access_Token>
├─ Backend NestJS Guard:
│  ├─ Extract JWT from Header
│  ├─ Verify Signature using JWKS (cached in Redis)
│  ├─ Validate Expiration, Issuer, Audience
│  ├─ Check Blacklist (Redis)
│  └─ Extract User Claims (sub, roles, email)
├─ Role/Resource Guards: Check permissions
└─ Execute API Logic or Return 401/403
```

#### 6.3.3 Token Lifecycle Management

- **Access Token TTL:** 15 minutes (production), 1 hour (development)
- **Refresh Token TTL:** 8 hours (production)
- **Refresh Strategy:** Silent refresh 2 minutes before expiration (frontend timer)
- **Revocation:**
  - Logout: Frontend clears storage + Backend adds token to Redis Blacklist
  - Session Termination: Manager triggers Keycloak Admin API → revoke all user sessions

#### 6.3.4 Two-Factor Authentication (2FA)

- **Required For:** IT Administrator role
- **Trigger Scenarios:**
  - System Backup/Restore operations (US05)
  - Access to Audit Logs
  - Critical system configuration changes
- **Implementation:** Keycloak OTP Policy (TOTP)
  - Apps: Google Authenticator, Authy, FreeOTP
  - Recovery Codes: 10 single-use codes generated at setup

### 6.4 Phân quyền dựa trên vai trò (RBAC)

Hệ thống định nghĩa 4 vai trò chính với các quyền hạn đặc thù dựa trên User Stories:

| Vai trò (Role)       | Phạm vi quyền hạn (Permissions)                                                                                | Ghi chú nghiệp vụ      | Keycloak Roles            |
| :------------------- | :------------------------------------------------------------------------------------------------------------- | :--------------------- | :------------------------ |
| **Manager**          | Tra cứu tập trung, phê duyệt phiếu nhập/xuất, điều chỉnh tồn kho, quản lý người dùng và xem Dashboard.         | US01 - US15 (Manager)  | `manager`, `user`         |
| **Quality Control**  | Đánh giá lô hàng (QC), xử lý hàng Rejected, cách ly hàng hóa (Quarantine), truy xuất nguồn gốc (Traceability). | US01 - US06 (QC)       | `quality_control`, `user` |
| **Operator**         | Tạo phiếu nhập/xuất điện tử, xác thực kiểm đếm thực tế (Blind count), thực hiện kiểm kê tại hiện trường.       | US01 - US05 (Operator) | `operator`, `user`        |
| **IT Administrator** | Giám sát sức khỏe hệ thống, quản lý Log tập trung, thiết lập sao lưu và phục hồi dữ liệu (Restore).            | US01 - US06 (IT Admin) | `it_admin`, `user`        |

#### 6.4.1 Role Mapping Strategy

- **Realm Roles:** Định nghĩa trong Keycloak Realm `inventory-management`
- **Composite Roles:** Base role `user` (read-only) được composite vào tất cả roles khác
- **JWT Claims:** Roles được đưa vào JWT claim `realm_access.roles[]`
- **Backend Mapping:**

  ```typescript
  @Roles('manager')
  @Public(false)
  async approveTransaction() { ... }

  @Resource('inventory-lots')
  @Roles('quality_control')
  async quarantineLot() { ... }
  ```

#### 6.4.2 Fine-Grained Permissions

- **Resource-Based Access Control:**
  - Operator: Chỉ được chỉnh sửa transactions do chính mình tạo
  - Manager: Có thể override mọi transactions
  - QC: Chỉ được thao tác trên lots ở trạng thái Quarantine
- **Implementation:** NestJS Custom Guards + MongoDB ownership queries

### 6.5 Cơ chế bảo vệ đặc thù

Dựa trên các yêu cầu an ninh từ User Stories, hệ thống triển khai các kỹ thuật sau:

#### 6.5.1 Session Termination (Manager US14)

- **Khi nào:** Manager thực hiện khóa tài khoản người dùng
- **Cơ chế:**
  1. Backend gọi Keycloak Admin REST API: `DELETE /admin/realms/{realm}/users/{userId}/sessions`
  2. Thu hồi toàn bộ Active Sessions của user
  3. NestJS cập nhật Token Blacklist trong Redis với TTL = remaining token lifetime
  4. Mọi API request với token bị blacklist sẽ nhận `401 Unauthorized`
- **Response Time:** < 100ms (cached check)
- **Logging:** Event được ghi vào Audit Log với severity HIGH

#### 6.5.2 Audit Trail (Manager US15)

- **Dữ liệu ghi nhận:** Method, Path, UserID, Username, Payload (sanitized), Response Status, IP, User Agent, Timestamp
- **Implementation:** NestJS Interceptor (`AuditLogInterceptor`)
- **Storage Pipeline:**
  - Winston Logger → `logs/audit-{date}.log`
  - Filebeat → Logstash → Elasticsearch Index `audit-logs-YYYY.MM`
- **Read-only Protection:** Elasticsearch Index templates với `index.blocks.write: true` sau 24h
- **Compliance:** 90 days retention (đáp ứng yêu cầu kiểm toán)
- **Access Control:** Chỉ IT Administrator có quyền query Kibana Dashboard

#### 6.5.3 Hard-locking cho Quarantine (QC US04)

- **Khi nào:** QC thực hiện cách ly lô hàng (set status = Quarantine)
- **Cơ chế:**
  1. Update MongoDB: `lots.status = 'Quarantine'`
  2. Sync to Redis: `SET quarantine:lot:{lotId} true EX 86400`
  3. API Guards kiểm tra Redis trước khi cho phép Picking/Transfer/Usage
  4. Nếu lot bị Quarantine → trả về `423 Locked` với thông báo rõ ràng
- **Performance:** < 50ms (Redis in-memory check)
- **Consistency:** Redis TTL 24h, background job sync lại từ MongoDB mỗi 30 phút

#### 6.5.4 Data Integrity cho Backup/Restore (IT Admin US04)

- **Backup Protection:**
  - Mỗi backup file được tạo checksum SHA-256
  - Lưu trữ: `backups/{timestamp}/dump.tar.gz` + `dump.tar.gz.sha256`
  - Encryption at rest: AES-256 (optional cho production)
- **Restore Validation:**
  1. Verify checksum trước khi extract
  2. Yêu cầu 2FA confirmation từ IT Admin
  3. Tạo snapshot hiện tại trước khi restore
  4. Restore + Validation queries
  5. Rollback capability nếu validation fails
- **Logging:** Mọi backup/restore operation ghi vào Security Event Log với full metadata

### 6.6 Quản lý thông tin định danh

#### 6.6.1 Password Security

- **Hashing Algorithm:**
  - Keycloak default: PBKDF2-SHA256 (27,500 iterations)
  - Alternative: Bcrypt (cost factor 10)
- **Password Policy (Keycloak Realm Settings):**
  - Minimum Length: 12 characters
  - Must include: Uppercase, Lowercase, Digit, Special Character
  - Not Recently Used: Last 5 passwords
  - Expiration: 90 days (configurable)
  - Max Failed Attempts: 5 → Account temporarily locked (15 minutes)

#### 6.6.2 Role Management by Manager

- **Capability:** Manager có thể thay đổi Role của nhân sự qua UI quản trị (US13)
- **Backend Flow:**
  1. Manager gọi API `PUT /api/users/{userId}/role`
  2. Backend xác thực Manager role
  3. Gọi Keycloak Admin API: Update User Role Mappings
  4. Keycloak cập nhật User's Realm Roles
  5. Claims trong Token mới sẽ phản ánh role updated
- **Effect Timing:** Immediate cho tokens mới, existing tokens hết hạn sau 15 phút
- **Audit:** Role change events được log với before/after values

#### 6.6.3 User Provisioning

- **Self-Registration:** Disabled (chỉ Manager/IT Admin có quyền tạo user)
- **Creation Flow:**
  1. Manager/IT Admin tạo user qua UI hoặc Keycloak Admin Console
  2. Gửi email verification với temporary password
  3. User đăng nhập lần đầu → bắt buộc đổi password
  4. Setup 2FA (nếu role là IT Administrator)
- **Deprovisioning:**
  - Soft delete: Set `enabled: false` trong Keycloak
  - Hard delete: Sau 90 days retention period (compliance requirement)

### 6.7 Network Security & Access Points

#### 6.7.1 Network Topology

```
                    ┌─────────────────┐
                    │   Internet      │
                    └────────┬────────┘
                             │ HTTPS (443)
                    ┌────────▼────────┐
                    │  Load Balancer  │
                    │  (nginx/ALB)    │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │ HTTPS            │ HTTPS            │ HTTPS
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │ Frontend  │     │  Backend  │     │ Keycloak  │
    │ (React)   │────▶│  (NestJS) │────▶│   (IdP)   │
    │ Port 5173 │     │ Port 3000 │     │ Port 8080 │
    └───────────┘     └─────┬─────┘     └───────────┘
                            │
                    ┌───────┼───────┐
                    │       │       │
              ┌─────▼──┐ ┌─▼────┐ ┌▼─────────┐
              │MongoDB │ │Redis │ │  ELK     │
              │ 27017  │ │ 6379 │ │ Stack    │
              └────────┘ └──────┘ └──────────┘
```

#### 6.7.2 External Access Points (Production)

| Service            | URL/Endpoint                                         | Protocol | Port | Public Access | Authentication Required |
| :----------------- | :--------------------------------------------------- | :------- | :--- | :------------ | :---------------------- |
| **Frontend UI**    | `https://app.inventory.domain.com`                   | HTTPS    | 443  | ✅ Yes        | OAuth2/OIDC (Redirect)  |
| **Backend API**    | `https://api.inventory.domain.com/api/*`             | HTTPS    | 443  | ✅ Yes        | JWT Bearer Token        |
| **API Docs**       | `https://api.inventory.domain.com/api/docs`          | HTTPS    | 443  | ⚠️ Restricted | Authenticated users     |
| **Health Check**   | `https://api.inventory.domain.com/health`            | HTTPS    | 443  | ✅ Yes        | ❌ No (Public)          |
| **Keycloak Admin** | `https://auth.inventory.domain.com/admin`            | HTTPS    | 443  | ⚠️ Restricted | Keycloak Admin account  |
| **Keycloak Realm** | `https://auth.inventory.domain.com/realms/inventory` | HTTPS    | 443  | ✅ Yes        | OIDC Redirect           |

#### 6.7.3 Internal Access Points (Development)

| Service       | URL/Endpoint                          | Protocol | Port  | Docker Network | Notes                  |
| :------------ | :------------------------------------ | :------- | :---- | :------------- | :--------------------- |
| Frontend      | `http://localhost:5173`               | HTTP     | 5173  | host           | Vite Dev Server        |
| Backend API   | `http://localhost:3000/api`           | HTTP     | 3000  | inventory-net  | NestJS with hot-reload |
| Keycloak      | `http://localhost:8080`               | HTTP     | 8080  | inventory-net  | Admin: admin/admin     |
| MongoDB       | `mongodb://localhost:27017/inventory` | MongoDB  | 27017 | inventory-net  | No auth in dev mode    |
| Redis         | `redis://localhost:6379`              | Redis    | 6379  | inventory-net  | No password in dev     |
| Elasticsearch | `http://localhost:9200`               | HTTP     | 9200  | inventory-net  | ELK Stack              |
| Kibana        | `http://localhost:5601`               | HTTP     | 5601  | inventory-net  | Log visualization      |

#### 6.7.4 Security Headers & CORS

**CORS Configuration (Backend):**

```typescript
// main.ts - NestJS
app.enableCors({
  origin: [
    "http://localhost:5173", // Dev
    "https://app.inventory.domain.com", // Prod
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  exposedHeaders: ["X-Total-Count", "X-Page-Number"],
  maxAge: 3600,
});
```

**Security Headers (nginx/Response):**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

#### 6.7.5 SSL/TLS Configuration

- **Minimum TLS Version:** TLS 1.2 (khuyến nghị TLS 1.3)
- **Cipher Suites:** ECDHE-RSA-AES256-GCM-SHA384, ECDHE-RSA-AES128-GCM-SHA256 (Forward Secrecy)
- **Certificate Management:**
  - Development: Self-signed certificates hoặc mkcert
  - Production: Let's Encrypt (auto-renewal) hoặc Commercial CA
  - Certificate storage: Kubernetes Secrets / Docker Secrets
- **HSTS:** Enabled with 1-year max-age + includeSubDomains

#### 6.7.6 Rate Limiting & DDoS Protection

- **API Gateway Rate Limits:**
  - Anonymous: 10 req/minute
  - Authenticated: 100 req/minute
  - Manager/QC: 200 req/minute
  - IT Admin: 500 req/minute
- **Implementation:**
  - NestJS: `@nestjs/throttler` package
  - Redis backend for distributed rate limiting
- **Keycloak Protection:**
  - Login attempts: 5 failures → 15 minutes account lockout
  - Brute force detection: Automatic IP blacklisting
- **Infrastructure:**
  - Production: CloudFlare / AWS WAF / Azure Front Door
  - DDoS mitigation: Layer 7 protection enabled

#### 6.7.7 Firewall Rules (Kubernetes NetworkPolicy)

```yaml
# Example: Backend can only be accessed from Frontend and Ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
```

## 7. Database Schema

Hệ thống sử dụng **MongoDB** với mô hình **Collections + Document**. Các quan hệ 1:N được thể hiện qua **ObjectId Reference**, các phần dữ liệu gắn chặt (sub-steps, labels) có thể **embed** để giảm số lần join ứng dụng.

### Users Collection (auth/keycloak sync)

| Field        | Type                                           | Notes                               |
| :----------- | :--------------------------------------------- | :---------------------------------- |
| `_id`        | ObjectId                                       | Tự sinh bởi MongoDB, index mặc định |
| `username`   | String                                         | Unique index                        |
| `email`      | String                                         | Unique index                        |
| `role`       | String (Enum: manager, operator, qc, it_admin) | Lưu role ánh xạ từ Keycloak         |
| `is_active`  | Boolean                                        | Default: true                       |
| `last_login` | Date                                           |                                     |
| `created_at` | Date                                           | Default: now()                      |

### Materials Collection

| Field                       | Type          | Notes                                                    |
| :-------------------------- | :------------ | :------------------------------------------------------- |
| `_id`                       | ObjectId      | Primary document id                                      |
| `material_code`             | String        | Mã nội bộ, unique index (vd: MAT-001)                    |
| `name`                      | String        | Tên hiển thị                                             |
| `type`                      | String (Enum) | API, Excipient, Container, FinishedProduct, Intermediate |
| `storage_conditions`        | String        |                                                          |
| `spec_doc`                  | String        | URL/đường dẫn tài liệu kỹ thuật                          |
| `created_at` / `updated_at` | Date          | ISODate                                                  |

### InventoryLots Collection

| Field                       | Type          | Notes                                           |
| :-------------------------- | :------------ | :---------------------------------------------- |
| `_id`                       | ObjectId      | lot id nội bộ                                   |
| `material_id`               | ObjectId      | Ref → `materials._id`                           |
| `lot_code`                  | String        | Mã lô đọc được (vd: LOT-2025-001), unique index |
| `mfr_name`                  | String        |                                                 |
| `mfr_lot`                   | String        | Số lô của nhà SX                                |
| `status`                    | String (Enum) | Quarantine, Accepted, Rejected, Depleted        |
| `quantity`                  | Decimal128    | Số lượng hiện tại                               |
| `uom`                       | String        | kg, g, L, pcs                                   |
| `expiration_date`           | Date          |                                                 |
| `parent_lot_id`             | ObjectId      | Ref → `inventorylots._id` (nếu là lô tách/mẫu)  |
| `is_sample`                 | Boolean       | Default: false                                  |
| `created_at` / `updated_at` | Date          |                                                 |
| `created_by`                | String        | Username/ID người tạo                           |

### InventoryTransactions Collection

| Field              | Type                                  | Notes                                       |
| :----------------- | :------------------------------------ | :------------------------------------------ |
| `_id`              | ObjectId                              |                                             |
| `lot_id`           | ObjectId                              | Ref → `inventorylots._id`                   |
| `type`             | String (Enum)                         | receipt, usage, split, transfer, adjustment |
| `quantity`         | Decimal128                            | Dấu + nhập / - xuất                         |
| `performed_by`     | String                                | Username/ID                                 |
| `transaction_date` | Date                                  | Default: now()                              |
| `note`             | String                                |                                             |
| Index              | `{ lot_id: 1, transaction_date: -1 }` | phục vụ truy vấn lịch sử                    |

### QCTests Collection

| Field         | Type          | Notes                                     |
| :------------ | :------------ | :---------------------------------------- |
| `_id`         | ObjectId      |                                           |
| `lot_id`      | ObjectId      | Ref → `inventorylots._id`                 |
| `test_type`   | String (Enum) | identity, potency, microbial, moisture... |
| `result`      | Object        | `{ value, unit, method }`                 |
| `status`      | String (Enum) | pass, fail, pending                       |
| `verified_by` | String        | Username/ID                               |
| `tested_at`   | Date          |                                           |

### ProductionBatches Collection

| Field                       | Type          | Notes                                    |
| :-------------------------- | :------------ | :--------------------------------------- |
| `_id`                       | ObjectId      |                                          |
| `product_id`                | ObjectId      | Ref → `materials._id` (thành phẩm)       |
| `batch_number`              | String        | Unique index (vd: BATCH-2025-001)        |
| `batch_size`                | Decimal128    |                                          |
| `status`                    | String (Enum) | planned, in_progress, complete, rejected |
| `manufacture_date`          | Date          |                                          |
| `created_at` / `updated_at` | Date          |                                          |

### BatchComponents Collection (tùy chọn nếu không embed)

Chỉ dùng khi muốn tách components thành collection riêng để truy vấn lớn.

| Field         | Type              | Notes                         |
| :------------ | :---------------- | :---------------------------- |
| `_id`         | ObjectId          |                               |
| `batch_id`    | ObjectId          | Ref → `productionbatches._id` |
| `lot_id`      | ObjectId          | Ref → `inventorylots._id`     |
| `planned_qty` | Decimal128        |                               |
| `actual_qty`  | Decimal128        | Nullable                      |
| Index         | `{ batch_id: 1 }` |                               |

### LabelTemplates Collection

| Field              | Type          | Notes                                                        |
| :----------------- | :------------ | :----------------------------------------------------------- |
| `_id`              | ObjectId      |                                                              |
| `template_code`    | String        | Unique index (vd: TPL-RM-01)                                 |
| `label_type`       | String (Enum) | raw_material, sample, finished_product, intermediate, status |
| `content`          | String (Text) | Markup chứa placeholders                                     |
| `width` / `height` | Number        | inches/mm                                                    |
| `created_at`       | Date          |                                                              |

### Entity Relationship Overview

- **Materials (1) ── (N) InventoryLots:** Một loại vật tư có thể có nhiều lô nhập về.
- **InventoryLots (1) ── (N) InventoryTransactions:** Một lô hàng có nhiều biến động kho.
- **InventoryLots (1) ── (N) QCTests:** Một lô hàng có thể trải qua nhiều bài kiểm tra QC.
- **ProductionBatches (1) ── (N) BatchComponents:** Một mẻ sản xuất tiêu thụ nhiều nguyên liệu (từ các lô hàng khác nhau).
- **LabelTemplates (Used by):** InventoryLots & ProductionBatches dựa trên `label_type`.

### Example Data Flow

1. **Tiếp nhận:** Tạo document `materials` (MAT-001 Vitamin D3) → tạo `inventorylots` (lot-uuid-001) với `material_id` trỏ về `materials._id` → thêm `inventorytransactions` type `receipt` +25.5 kg.
2. **Dán nhãn:** Chọn `labeltemplates` `TPL-RM-01` → embed record vào `inventorylots.labels[]` (template_id, printed_at, printed_by) → in nhãn.
3. **Kiểm định:** Thêm `qctests` cho `lot-uuid-001` → cập nhật `inventorylots.status` từ `quarantine` → `accepted` khi tất cả `qctests.status = pass`.
4. **Sản xuất:** Tạo `productionbatches` cho sản phẩm `product_id` trỏ `materials._id` → embed `components[]` với `lot_id` và định mức → ghi `inventorytransactions` type `usage` -2 kg cho `lot-uuid-001`.
