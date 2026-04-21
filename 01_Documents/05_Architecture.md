# Hệ Thống Quản Trị Kho Hàng (IMS) - Architecture

## 1. Mục tiêu tài liệu

Tài liệu này mô tả kiến trúc hệ thống, tập trung vào:

- Các mô hình kiến trúc và mô hình vận hành kho đang được triển khai.
- Diễn giải kiến trúc theo nhiều góc nhìn (functional, logical, process, development, deployment, data).
- Công nghệ và công cụ thực tế đang sử dụng.
- Mã PlantUML cho các sơ đồ để có thể render/chèn ảnh sau.

---

## 2. Các mô hình kiến trúc đang áp dụng

### 2.1 Mô hình nghiệp vụ kho (Lot-centric Inventory)

Hệ thống vận hành theo mô hình lấy **Inventory Lot** làm trung tâm:

- Material là master data của vật tư/sản phẩm.
- Inventory Lot đại diện cho từng lô vật lý.
- Inventory Transaction lưu vết biến động nhập/xuất/điều chỉnh.
- QC Test gắn với lot để ra quyết định chất lượng.
- Production Batch tiêu thụ lot nguyên liệu và sinh lot thành phẩm.

### 2.2 Mô hình dịch vụ (Microservices + API Gateway)

Hệ thống sử dụng mô hình nhiều service, với `api-gateway` làm entrypoint HTTP:

- `inventory-management-web-app`: frontend React/Vite.
- `api-gateway`: xác thực/ủy quyền và định tuyến request.
- `inventory-management-service`: core business domain.
- `keycloak-service`: auth service tích hợp Keycloak qua gRPC + HTTP.
- `metrics-service`: báo cáo qua gRPC từ dữ liệu Elasticsearch.
- `analytics-indexer-service`: worker đồng bộ MongoDB -> Elasticsearch theo lịch.
- `ai-service`: nhóm endpoint AI/AI agents, lấy dữ liệu qua gRPC từ core backend.

### 2.3 Mô hình dữ liệu phân tầng (OLTP + Read Model)

- **OLTP**: MongoDB cho dữ liệu nghiệp vụ giao dịch.
- **Read model analytics**: Elasticsearch cho truy vấn báo cáo.
- **Đồng bộ**: analytics-indexer-service chạy scheduler, dùng Redis lưu watermark đồng bộ.

### 2.4 Mô hình giao tiếp

- HTTP/REST: frontend <-> gateway, gateway -> inventory-management-service và ai-service (proxy).
- gRPC nội bộ:
  - gateway <-> keycloak-service (auth proto)
  - gateway <-> metrics-service (metrics proto)
  - ai-service <-> inventory-management-service (inventory proto, AiDataService)

---

## 3. Kiến trúc theo các góc nhìn

## 3.1 Functional View (góc nhìn chức năng)

### Nhóm chức năng chính

- **Identity & Access**: đăng nhập, refresh token, reset password, profile, phân quyền role.
- **Inventory Core**: material, inventory lot, inventory transaction, import/export order.
- **QC**: tạo test, submit decision, supplier performance, dashboard KPI QC.
- **Production**: production batch + batch component.
- **Control & Compliance**: inventory adjustment, inventory audit report, audit log, log management.
- **Insights**: báo cáo tổng hợp inventory/material usage/qc/audit.
- **AI Assistant**: route AI hỗ trợ phân tích/tư vấn vận hành.

### Mapping role -> chức năng

- **Manager**: quản trị vật tư, lô, phê duyệt luồng kho, báo cáo.
- **Operator**: nhập/xuất, thao tác lot/batch theo quyền.
- **Quality Control**: đánh giá chất lượng lô và theo dõi chỉ số QC.
- **IT Administrator**: quản trị user, audit/log, monitoring hệ thống.

### PlantUML - Use Case View

![Use Case View](Images/Architecture/usecase-view.png)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor Manager
actor Operator
actor QC as "Quality Control"
actor IT as "IT Administrator"

rectangle "IMS" {
  usecase UC1 as "Quan ly Material/Lot"
  usecase UC2 as "Nhap/Xuat + Transaction"
  usecase UC3 as "QC Test + QC Decision"
  usecase UC4 as "Production Batch"
  usecase UC5 as "Inventory Adjustment/Audit"
  usecase UC6 as "Reports (Inventory/QC/Audit)"
  usecase UC7 as "User/Auth/Audit Log"
  usecase UC8 as "AI Assistant Console"
}

Manager --> UC1
Manager --> UC2
Manager --> UC4
Manager --> UC5
Manager --> UC6

Operator --> UC2
Operator --> UC4

QC --> UC3
QC --> UC6

IT --> UC7
IT --> UC6

Manager --> UC8
Operator --> UC8
QC --> UC8
@enduml
```

---

## 3.2 Logical View (góc nhìn logic/service)

Luồng tổng quát:

1. Frontend gọi vào `api-gateway`.
2. Gateway xử lý auth guard/role guard.
3. Gateway proxy phần lớn API sang `inventory-management-service`.
4. Gateway gọi gRPC đến `keycloak-service` cho nghiệp vụ auth và `metrics-service` cho reports.
5. `ai-service` phục vụ route `/ai/*` và `/ai-agents/*`, dữ liệu lấy từ core backend qua gRPC.
6. Dữ liệu nghiệp vụ nằm ở MongoDB; analytics dùng Elasticsearch do indexer đồng bộ.

### PlantUML - Container/Component View

![Container/Component View](Images/Architecture/component-view.png)

```plantuml
@startuml
left to right direction
skinparam componentStyle rectangle

actor User

rectangle "Frontend" {
  [inventory-management-web-app\nReact + Vite\n:5173] as FE
}

rectangle "Gateway Layer" {
  [api-gateway\nNestJS HTTP :3000] as GW
}

rectangle "Business Services" {
  [inventory-management-service\nNestJS HTTP :3001\ngRPC :50052] as IMS
  [keycloak-service\nNestJS HTTP :3002\ngRPC :50051] as KCS
  [metrics-service\nNestJS gRPC :6741] as MET
  [ai-service\nNestJS HTTP :3003] as AIS
  [analytics-indexer-service\nNestJS Worker] as IDX
}

database "MongoDB\n:27017" as MDB
database "Redis\n:6379" as RED
database "Elasticsearch\n:9200" as ES

rectangle "Identity Provider" {
  [Keycloak\n:8080] as KC
}

User --> FE : Browser
FE --> GW : REST/JSON

GW --> IMS : HTTP proxy\n(non-auth, non-reports, non-ai)
GW --> AIS : HTTP proxy\n/ai/*, /ai-agents/*
GW --> KCS : gRPC auth.proto
GW --> MET : gRPC metrics.proto

AIS --> IMS : gRPC inventory.proto\n(AiDataService)

IMS --> MDB
KCS --> MDB
KCS --> KC

IDX --> MDB : read source data
IDX --> RED : sync watermark
IDX --> ES : index documents

MET --> ES : query reports
@enduml
```

---

## 3.3 Process View (góc nhìn luồng xử lý)

## Process A - Inbound + QC decision 

### PlantUML - Sequence Inbound/QC

![Sequence Inbound View](Images/Architecture/Sequence-Inbound.png)

```plantuml
@startuml
actor Operator
actor QC
participant "Frontend" as FE
participant "API Gateway" as GW
participant "Inventory Service" as IMS
database "MongoDB" as MDB

Operator -> FE : Tao lot nhap kho
FE -> GW : POST /inventory-lots
GW -> IMS : Forward HTTP
IMS -> MDB : Save InventoryLot
IMS -> MDB : Save Receipt Transaction
IMS --> GW : 201 Created
GW --> FE : Response

QC -> FE : Tao/nhap ket qua QC
FE -> GW : POST /qc-tests
GW -> IMS : Forward HTTP
IMS -> MDB : Save QCTest
IMS --> GW : 201 Created
GW --> FE : Response

QC -> FE : Submit QC decision
FE -> GW : PATCH /qc-tests/{lotId}/decision
GW -> IMS : Forward HTTP
IMS -> MDB : Update lot status
IMS --> GW : Decision result
GW --> FE : Response
@enduml
```

## Process B - Reporting pipeline (Mongo -> ES -> gRPC report)

### PlantUML - Sequence Reporting

![Sequence Reporting View](Images/Architecture/Sequence-Reporting.png)

```plantuml
@startuml
actor Manager
participant "Frontend" as FE
participant "API Gateway" as GW
participant "metrics-service" as MET
participant "analytics-indexer" as IDX
database "MongoDB" as MDB
database "Redis" as RED
database "Elasticsearch" as ES

loop Every 10 minutes
  IDX -> RED : read watermark
  IDX -> MDB : query delta data
  IDX -> ES : upsert indexed docs
  IDX -> RED : update watermark
end

Manager -> FE : Xem bao cao ton kho
FE -> GW : GET /reports/inventory-status
GW -> MET : gRPC GetInventoryStatus()
MET -> ES : aggregate query
ES --> MET : report data
MET --> GW : gRPC response
GW --> FE : JSON report
@enduml
```

---

## 3.4 Development View (góc nhìn mã nguồn)

### Cấu trúc chi tiết

```text
02_Source/01_Source Code/
  docker-compose.yml
  README.md
  proto/
    auth.proto
    inventory.proto
    metrics.proto
  database/
    mongo-init.js
    realm-export.json
  infra/
    local/

  api-gateway/
    Dockerfile
    proto/
    src/
      app.module.ts
      main.ts
      auth/
        auth.controller.ts
        auth.module.ts
        auth.service.ts
        decorators/
        guards/
        strategies/
      grpc/
      proxy/
      reports/
      schemas/
      utils/
    test/

  inventory-management-service/
    Dockerfile
    src/
      app.module.ts
      main.ts
      ai-data-grpc/
      material/
      inventory-lot/
      inventory-transaction/
      qc-test/
      production-batch/
      import-export-order/
      inventory-adjustment/
      inventory-audit-report/
      barcode/
      label-template/
      warehouse-hierarchy/
      audit-log/
      log-management/
      system-monitoring/
      user/
      metrics/
      auth/
      common/
      database/
      event-bus/
      keycloak/
      mail/
      schemas/
    test/

  keycloak-service/
    Dockerfile
    src/
      app.module.ts
      main.ts
      auth/
        auth.controller.ts
        auth.grpc.controller.ts
        auth.service.ts
        dto/
        decorators/
        guards/
        strategies/
        utils/
      keycloak/
      user/
      audit-log/
      database/
      mail/
      schemas/
    test/

  metrics-service/
    Dockerfile
    proto/
    src/
      app.module.ts
      main.ts
      config/
      elasticsearch/
      reports/
        reports.controller.ts
        reports.service.ts
        repositories/
        dto/
    test/

  analytics-indexer-service/
    Dockerfile
    src/
      app.module.ts
      main.ts
      run-once.ts
      config/
      redis/
      elasticsearch/
      schemas/
      sync/
        collections/
        sync.module.ts
        sync.scheduler.ts
        sync.service.ts

  ai-service/
    Dockerfile
    src/
      app.module.ts
      main.ts
      ai/
        ai.controller.ts
        ai.module.ts
        ai-supplier.service.ts
        dto/
      ai-agents/
        ai-agents.controller.ts
        ai-agents.module.ts
        agents/
        services/
        dto/
      backend-client/
    test/

  inventory-management-web-app/
    Dockerfile
    Dockerfile.dev
    src/
      main.tsx
      App.tsx
      router/
      layouts/
      pages/
        auth/
        admin/
        manager/
        operator/
        qc/
        shared/
      components/
      services/
      hooks/
      types/
      utils/
      styles/
      config/
      assets/
    public/
```

### Diễn giải chi tiết theo service

1. `api-gateway`
Lớp biên HTTP duy nhất cho frontend, chạy guard JWT + role guard toàn cục, proxy request sang backend/ai-service, đồng thời gọi gRPC sang keycloak-service và metrics-service.

2. `inventory-management-service`
Service nghiệp vụ lõi, chứa đầy đủ module domain kho và QC. Service này chạy dạng hybrid: HTTP REST cho nghiệp vụ chính và gRPC để cung cấp dữ liệu cho AI.

3. `keycloak-service`
Service định danh/tài khoản, bridge giữa hệ IMS và Keycloak IdP, hỗ trợ login/refresh/logout/forgot-reset password qua cả HTTP và gRPC.

4. `metrics-service`
Service báo cáo tách biệt, chỉ expose gRPC; truy vấn dữ liệu đã index trong Elasticsearch để trả các báo cáo inventory, QC, audit.

5. `analytics-indexer-service`
Worker nền không mở HTTP port, chạy scheduler đồng bộ dữ liệu từ MongoDB sang Elasticsearch và dùng Redis để lưu watermark đồng bộ.

6. `ai-service`
Service AI gồm 2 nhánh: endpoint AI thông thường và AI agents. Dữ liệu nghiệp vụ được lấy qua gRPC client từ `inventory-management-service`.

7. `inventory-management-web-app`
Frontend React/Vite tổ chức theo role pages (`admin`, `manager`, `operator`, `qc`) và route guard phía client để điều hướng theo quyền.

8. Thành phần hạ tầng dùng chung
`docker-compose.yml` điều phối toàn bộ stack local; `proto/` định nghĩa contract gRPC liên service; `database/` chứa script seed MongoDB và realm export cho Keycloak.

9. Ghi chú tương thích
Trong repository vẫn còn các thư mục `backend/` và `frontend/`, nhưng luồng triển khai chính hiện tại sử dụng `inventory-management-service/` và `inventory-management-web-app/`.

### PlantUML - Module Dependency (simplified)

![Module Dependency View](Images/Architecture/Module-Dependency.png)

```plantuml
@startuml
skinparam componentStyle rectangle

[web-app] --> [api-gateway]
[api-gateway] --> [inventory-management-service]
[api-gateway] --> [keycloak-service]
[api-gateway] --> [metrics-service]
[api-gateway] --> [ai-service]

[ai-service] --> [inventory-management-service]
[analytics-indexer-service] --> [inventory-management-service]
[analytics-indexer-service] --> [elasticsearch]
[metrics-service] --> [elasticsearch]

[keycloak-service] --> [keycloak]
[keycloak-service] --> [mongodb]
[inventory-management-service] --> [mongodb]
@enduml
```

---

## 3.5 Data View (góc nhìn dữ liệu)

### Dữ liệu nghiệp vụ lõi

- `materials`
- `inventorylots`
- `inventorytransactions`
- `qctests`
- `productionbatches`
- `batchcomponents`
- `importexportorders`
- `inventoryadjustments`
- `inventoryauditreports`
- `users`
- `auditlogs`

### PlantUML - ER Overview

![ER Overview](Images/Architecture/ER.png)

```plantuml
@startuml
hide circle
skinparam linetype ortho

entity "Material" as Material {
  *id : ObjectId
  --
  material_code
  name
  type
  status
}

entity "InventoryLot" as Lot {
  *id : ObjectId
  --
  lot_number
  quantity
  status
  expiration_date
}

entity "InventoryTransaction" as Txn {
  *id : ObjectId
  --
  type
  quantity
  transaction_date
}

entity "QCTest" as QC {
  *id : ObjectId
  --
  test_type
  status
  tested_at
}

entity "ProductionBatch" as PB {
  *id : ObjectId
  --
  batch_number
  status
}

entity "BatchComponent" as BC {
  *id : ObjectId
  --
  planned_qty
  actual_qty
}

Material ||--o{ Lot : material_id
Lot ||--o{ Txn : lot_id
Lot ||--o{ QC : lot_id
PB ||--o{ BC : batch_id
Lot ||--o{ BC : lot_id
@enduml
```

---

## 3.6 Deployment View (góc nhìn triển khai)

### Môi trường local/dev 

Triển khai bằng Docker Compose với bridge network `inventory_net`, các cổng chính:

- Frontend: `5173`
- API Gateway: `3000`
- Inventory Service: `3001` (HTTP), `50052` (gRPC)
- Keycloak Service: `3002` (HTTP), `50051` (gRPC)
- AI Service: `3003`
- Metrics Service: `6741` (gRPC)
- MongoDB: `27017`
- Redis: `6379`
- Elasticsearch: `9200`
- Keycloak IdP: `8080`

### PlantUML - Deployment Diagram (Docker Compose)

![Deployment Diagram](Images/Architecture/Deployment-Diagram.png)

```plantuml
@startuml
node "Developer Machine" {
  node "Docker Engine" {
    node "Network: inventory_net" {
      artifact "inventory-management-web-app\n:5173" as FE
      artifact "api-gateway\n:3000" as GW
      artifact "inventory-management-service\n:3001, :50052" as IMS
      artifact "keycloak-service\n:3002, :50051" as KCS
      artifact "ai-service\n:3003" as AIS
      artifact "metrics-service\n:6741" as MET
      artifact "analytics-indexer-service" as IDX

      database "mongo\n:27017" as MDB
      database "redis\n:6379" as RED
      database "elasticsearch\n:9200" as ES
      artifact "keycloak\n:8080" as KC
    }
  }
}

FE --> GW
GW --> IMS
GW --> KCS
GW --> MET
GW --> AIS
AIS --> IMS
IMS --> MDB
KCS --> MDB
KCS --> KC
IDX --> MDB
IDX --> RED
IDX --> ES
MET --> ES
@enduml
```

### Môi trường cloud/prod

Triển khai production trên cloud theo mô hình tách lớp, tất cả truy cập public đều qua HTTPS:

- Frontend (User's Device): `https://inventory-system.cloud/`
- Backend API: `https://api.inventory-system.cloud/`
- Keycloak (IdP, ngoài cụm K8s): `https://keycloak.inventory-system.cloud`
- Grafana (monitoring dashboard): `https://grafana.inventory-system.cloud/`
- Jenkins (CI/CD): `https://jenkins.inventory-system.cloud`

### Security & Identity (prod)

- Tất cả kết nối từ thiết bị người dùng đến frontend/backend đều qua HTTPS (TLS).
- Frontend và Backend xác thực qua Keycloak theo chuẩn OIDC/OAuth2.
- Access Token sử dụng JWT; Backend thực hiện kiểm tra chữ ký token trước khi cho phép truy cập tài nguyên.
- Keycloak được đặt ngoài cụm K8s, đóng vai trò Identity Provider trung tâm.

### Data Tier (prod)

- MongoDB: lưu trữ dữ liệu nghiệp vụ chính.
- Connection string hiện tại:
  `mongodb+srv://admin:123@inventorymanagement.kbyjdmp.mongodb.net/?appName=InventoryManagement`
- Redis: caching + locking tồn kho tốc độ cao để giảm xung đột dữ liệu đồng thời.

### Observability Tier (prod)

- ELK Stack: thu thập/lưu trữ log từ backend, hỗ trợ IT Admin truy vết lỗi và kiểm soát vận hành.
- Prometheus + Grafana: thu thập metrics hạ tầng/ứng dụng và trực quan hóa theo thời gian thực.

### PlantUML - Deployment Diagram (Cloud/Production)

![Deployment Diagram](Images/Architecture/cloud-deploy.png)

```plantuml
@startuml
left to right direction

actor User

cloud "Internet" {
  rectangle "Frontend\nhttps://inventory-system.cloud" as FE
  rectangle "Backend API\nhttps://api.inventory-system.cloud" as API
  rectangle "Keycloak IdP\nhttps://keycloak.inventory-system.cloud" as KC
  rectangle "Grafana\nhttps://grafana.inventory-system.cloud" as GRA
  rectangle "Jenkins CI/CD\nhttps://jenkins.inventory-system.cloud" as JEN
}

node "Kubernetes Cluster (Cloud)" {
  component "Backend Services\n(api-gateway, inventory-service, ai-service, metrics, indexer)" as BE
  component "Log/Metric Exporters" as EXP
}

node "Dedicated Data Nodes" {
  database "MongoDB Atlas" as MDB
  database "Redis" as RED
  database "Elasticsearch" as ES
}

node "Observability Nodes" {
  component "ELK Stack" as ELK
  component "Prometheus" as PROM
}

User --> FE : HTTPS
FE --> API : HTTPS
API --> KC : OIDC/OAuth2 (HTTPS)
API --> BE : internal routing

BE --> MDB : TLS
BE --> RED : TLS
BE --> ES : TLS

BE --> EXP : logs/metrics
EXP --> ELK : logs
EXP --> PROM : metrics
GRA --> PROM : dashboards

JEN --> BE : deploy pipeline
@enduml
```

---
### 🌐 Hosted Environment Information
* **Hosted frontend url:** `https://inventory-system.cloud/`
* **API Gateway url:** `https://api.inventory-system.cloud/`
* **Keycloak (SSO/Auth) url:** `https://keycloak.inventory-system.cloud`
* **Grafana:** `https://grafana.inventory-system.cloud`
* **Jenkins CI/CD:** `https://jenkins.inventory-system.cloud`
* **Kibana:** `https://kibana.inventory-system.cloud/`
---

## 3.7 CI/CD View (góc nhìn pipeline vận hành)

Hệ thống hiện dùng Jenkins Pipeline (declarative) với các stage chuẩn hóa cho kiểm thử và triển khai bằng Docker Compose.

### Luồng CI/CD hiện tại (theo Jenkinsfile)

1. **Prepare ENV**
  - Copy file `.env` từ đường dẫn chuẩn trên Jenkins host vào gói deploy.
2. **Unit Test**
  - Chạy trong container `node:20-alpine`.
  - Thực thi test unit cho `inventory-management-service` (`src/unit-test`).
3. **Integration Test**
  - Chạy trong container `node:20`.
  - Thực thi test tích hợp (loại trừ unit test).
4. **Stop Old Containers**
  - Dừng stack cũ qua `docker compose --env-file .env down`.
5. **Build**
  - Build image/services bằng `docker compose --env-file .env build`.
6. **Deploy**
  - Khởi chạy stack mới bằng `docker compose --env-file .env up -d`.
7. **E2E Test**
  - Chạy test end-to-end bằng Jest config `test/jest-e2e.json`.
8. **Post-failure rollback**
  - Nếu pipeline fail, Jenkins thực hiện `down` rồi `up -d` để khôi phục trạng thái chạy gần nhất.

### Đặc điểm kiến trúc CI/CD

- **Build/Test isolation:** test chạy trong ephemeral Docker agent (`node:20*`), giảm phụ thuộc runtime host.
- **Deployment unit:** gói triển khai tại `03_Deployment/01_Deployment_Package`.
- **Execution model:** pipeline tuần tự theo stage, có chốt E2E sau deploy.
- **Rollback strategy:** rollback mức hạ tầng container (compose-level), phù hợp môi trường hiện tại.

### PlantUML - CI/CD Pipeline Flow
![CI/CD pipeline](Images/Architecture/cicd.png)

```plantuml
@startuml
left to right direction

actor Developer
participant "Jenkins" as JEN
participant "Docker Agent (node:20*)" as AG
participant "Deploy Package\n03_Deployment/01_Deployment_Package" as PKG
participant "Docker Compose Runtime" as DCR
participant "Inventory Service Tests" as TST

Developer -> JEN : Trigger pipeline
JEN -> PKG : Prepare ENV (.env)

JEN -> AG : Unit Test stage
AG -> TST : jest unit tests
TST --> AG : pass/fail

JEN -> AG : Integration Test stage
AG -> TST : jest integration tests
TST --> AG : pass/fail

JEN -> DCR : Stop old containers (compose down)
JEN -> DCR : Build images (compose build)
JEN -> DCR : Deploy (compose up -d)

JEN -> AG : E2E Test stage
AG -> TST : jest e2e
TST --> AG : pass/fail

alt any stage failed
  JEN -> DCR : rollback (down ; up -d)
end
@enduml
```

---

## 3.8 Monitoring & Observability View

Hệ thống giám sát hiện tại dùng stack Prometheus + Grafana, kết hợp exporter ở mức host/container/database và mở rộng với ELK cho log analytics trên môi trường production.

### Thành phần monitoring đang triển khai

- **Prometheus** (`9090`): thu thập metrics theo chu kỳ `5s`.
- **Grafana** (`3002`): dashboard trực quan hóa, datasource Prometheus được provision tự động.
- **node-exporter** (`9100`): metrics máy chủ.
- **cAdvisor** (`8081` host -> `8080` container): metrics container Docker.
- **mongodb-exporter** (`9216`): metrics MongoDB.

Stack observability chạy bằng compose tại:
- `03_Deployment/01_Deployment_Package/observability/docker-compose-grafana.yml`
- `03_Deployment/01_Deployment_Package/observability/prometheus.yml`

Cấu hình provisioning và script tiện ích nằm tại:
- `02_Source/01_Source Code/infra/monitoring/grafana/provisioning/datasources/prometheus.yml`
- `02_Source/01_Source Code/infra/monitoring/scripts/import-dashboards.sh`
- `02_Source/01_Source Code/infra/monitoring/scripts/check-grafana.sh`

### Monitoring scope (theo prometheus.yml)

Prometheus đang scrape các nhóm target chính:
- Hạ tầng host (`node-exporter`).
- Runtime container (`cadvisor`).
- MongoDB (`mongodb-exporter`).
- Backend service (`inventory_backend:3001`).
- Keycloak (`inventory_keycloak:8080`).
- Jenkins (`/prometheus` trên `jenkins:8080`).

### Dashboard & Health operations

- Grafana có script import dashboard chuẩn (Node Exporter, cAdvisor, MongoDB) qua API.
- Có script health-check để kiểm tra trạng thái Grafana/auth datasource/dashboard/targets.

### PlantUML - Monitoring Data Flow
![Monitoring](Images/Architecture/monitoring-view.png)

```plantuml
@startuml
left to right direction

node "Inventory Platform" {
  component "inventory_backend:3001" as BE
  component "inventory_keycloak:8080" as KC
  component "Jenkins:8080/prometheus" as JEN
  component "Docker Host" as HOST
  component "Containers" as CTR
  database "MongoDB" as MDB
}

component "node-exporter:9100" as NEXP
component "cAdvisor:8080" as CAD
component "mongodb-exporter:9216" as MEXP
component "Prometheus:9090" as PROM
component "Grafana:3002" as GRA

HOST --> NEXP : host metrics
CTR --> CAD : container metrics
MDB --> MEXP : db metrics

BE --> PROM : scrape target
KC --> PROM : scrape target
JEN --> PROM : scrape target
NEXP --> PROM : scrape
CAD --> PROM : scrape
MEXP --> PROM : scrape

PROM --> GRA : datasource queries
@enduml
```

---

## 4. Công nghệ và công cụ được lựa chọn

| Nhóm | Công nghệ/Công cụ | Vai trò trong hệ thống |
| :-- | :-- | :-- |
| Frontend | React, TypeScript, Vite, React Router | UI theo role, điều hướng và gọi API |
| API Layer | NestJS (api-gateway) | Entry HTTP, guard auth/role, reverse proxy, gRPC client |
| Core Domain | NestJS (inventory-management-service) | Xử lý nghiệp vụ kho, QC, batch, audit |
| Auth Service | NestJS (keycloak-service) + Keycloak | Đăng nhập, token lifecycle, quản trị user/role |
| AI Service | NestJS (ai-service) | AI endpoints + agents, đọc dữ liệu nội bộ qua gRPC |
| Reporting | metrics-service (NestJS + gRPC) | Truy vấn dữ liệu báo cáo từ Elasticsearch |
| Analytics ETL | analytics-indexer-service (NestJS worker) | Đồng bộ MongoDB -> Elasticsearch theo lịch |
| OLTP Database | MongoDB | Lưu dữ liệu nghiệp vụ chính |
| Cache/State | Redis | Lưu watermark đồng bộ cho indexer |
| Search/Analytics | Elasticsearch | Read model cho báo cáo và phân tích |
| Monitoring | Prometheus, Grafana, node-exporter, cAdvisor, mongodb-exporter | Thu thập metrics hạ tầng + ứng dụng, cảnh báo và trực quan hóa |
| Logging/Observability | ELK Stack (Elasticsearch, Logstash, Kibana) | Thu thập, lưu trữ và truy vấn log phục vụ audit/vận hành |
| Service Communication | HTTP/REST, gRPC | Giao tiếp giữa các lớp/services |
| Containerization | Docker, Docker Compose | Đóng gói và chạy toàn bộ stack local |
| CI | Jenkinsfile | Pipeline CI/CD (theo repo) |

---

## 5. Security - Keycloak Integration

Hệ thống Inventory Management System (IMS) sử dụng **Keycloak** làm nền tảng quản trị định danh và truy cập (IAM) tập trung, tuân thủ các tiêu chuẩn bảo mật **OpenID Connect (OIDC)** và **OAuth 2.0**.

### 5.1 Thành phần bảo mật (Components)

#### 5.1.1 Keycloak Identity Provider (IdP)

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
  - Admin Console: `https://keycloak.inventory-system.cloud/admin`
  - Realm Endpoint: `https://keycloak.inventory-system.cloud/realms/inventory-management`
  - Token Endpoint: `https://keycloak.inventory-system.cloud/realms/inventory-management/protocol/openid-connect/token`
  - JWKS Endpoint: `https://keycloak.inventory-system.cloud/realms/inventory-management/protocol/openid-connect/certs`

#### 5.1.2 React Frontend (Client Application)

- **Vai trò:** Chịu trách nhiệm chuyển hướng đăng nhập, quản lý Access Token và Refresh Token trong phiên làm việc của người dùng.
- **Technology Stack:**
  - `@react-keycloak/web` v3.4+ hoặc `keycloak-js` v23+
  - React 18+, TypeScript
  - Axios Interceptor (tự động gắn Bearer token)
  - LocalStorage/SessionStorage (lưu trữ token tạm thời)
- **Client Configuration:**
  - Client ID: `inventory-management-frontend`
  - Client Type: Public
  - Valid Redirect URIs: `http://localhost:5173/*`, `https://inventory-system.cloud/*`
  - Web Origins: `http://localhost:5173`, `https://inventory-system.cloud`
  - PKCE: Enabled (S256)
- **Access Flow:** Authorization Code Flow with PKCE

#### 5.1.3 NestJS Backend (Resource Server)

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
  - Protected APIs: `https://api.inventory-system.cloud/api/*`
  - Health Check: `https://api.inventory-system.cloud/health` (public)
  - Swagger UI: `https://api.inventory-system.cloud/api/docs` (authenticated)

### 5.2 Logging và Audit Trail

#### 5.2.1 Keycloak Event Logging

- **Event Types:**
  - Login Events: LOGIN, LOGOUT, LOGIN_ERROR, REFRESH_TOKEN
  - Admin Events: CREATE_USER, UPDATE_USER, DELETE_ROLE, GRANT_CONSENT
- **Storage:**
  - Development: Keycloak Database (7 days retention)
  - Production: Forward to ELK Stack via Filebeat
- **Log Format:** JSON structured logs
- **Access:** Admin Console -> Events -> Login Events / Admin Events

#### 5.2.2 Backend Audit Logs

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

#### 5.2.3 Security Event Monitoring

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

### 5.3 Luồng xác thực & Ủy quyền

#### 5.3.1 Authentication Flow (PKCE)

1. **Khởi tạo:** User truy cập Frontend -> Redirect sang Keycloak Login Page.
2. **PKCE Challenge:** Frontend tạo `code_verifier` và `code_challenge` (SHA-256).
3. **Authorization Code:** Keycloak xác thực thông tin -> trả về Authorization Code.
4. **Token Exchange:** Frontend gọi Token Endpoint với Code + Code Verifier -> nhận Access Token (JWT) & Refresh Token.
5. **Token Storage:** Lưu tokens vào SessionStorage (hoặc Memory cho bảo mật cao hơn).

#### 5.3.2 API Authorization Flow

```text
Frontend -> Backend API Request
|- Header: Authorization: Bearer <Access_Token>
|- Backend NestJS Guard:
|  |- Extract JWT from Header
|  |- Verify Signature using JWKS (cached in Redis)
|  |- Validate Expiration, Issuer, Audience
|  |- Check Blacklist (Redis)
|  \- Extract User Claims (sub, roles, email)
|- Role/Resource Guards: Check permissions
\- Execute API Logic or Return 401/403
```

#### 5.3.3 Token Lifecycle Management

- **Access Token TTL:** 15 minutes (production), 1 hour (development)
- **Refresh Token TTL:** 8 hours (production)
- **Refresh Strategy:** Silent refresh 2 minutes before expiration (frontend timer)
- **Revocation:**
  - Logout: Frontend clears storage + Backend adds token to Redis Blacklist
  - Session Termination: Manager triggers Keycloak Admin API -> revoke all user sessions

#### 5.3.4 Two-Factor Authentication (2FA)

- **Required For:** IT Administrator role
- **Trigger Scenarios:**
  - System Backup/Restore operations (US05)
  - Access to Audit Logs
  - Critical system configuration changes
- **Implementation:** Keycloak OTP Policy (TOTP)
  - Apps: Google Authenticator, Authy, FreeOTP
  - Recovery Codes: 10 single-use codes generated at setup

### 5.4 Phân quyền dựa trên vai trò (RBAC)

Hệ thống định nghĩa 4 vai trò chính với các quyền hạn đặc thù dựa trên User Stories:

| Vai trò (Role)       | Phạm vi quyền hạn (Permissions)                                                                                | Ghi chú nghiệp vụ      | Keycloak Roles            |
| :------------------- | :------------------------------------------------------------------------------------------------------------- | :--------------------- | :------------------------ |
| **Manager**          | Tra cứu tập trung, phê duyệt phiếu nhập/xuất, điều chỉnh tồn kho, quản lý người dùng và xem Dashboard.       | US01 - US15 (Manager)  | `manager`, `user`         |
| **Quality Control**  | Đánh giá lô hàng (QC), xử lý hàng Rejected, cách ly hàng hóa (Quarantine), truy xuất nguồn gốc (Traceability). | US01 - US06 (QC)       | `quality_control`, `user` |
| **Operator**         | Tạo phiếu nhập/xuất điện tử, xác thực kiểm đếm thực tế (Blind count), thực hiện kiểm kê tại hiện trường.     | US01 - US05 (Operator) | `operator`, `user`        |
| **IT Administrator** | Giám sát sức khỏe hệ thống, quản lý Log tập trung, thiết lập sao lưu và phục hồi dữ liệu (Restore).          | US01 - US06 (IT Admin) | `it_admin`, `user`        |

#### 5.4.1 Role Mapping Strategy

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

#### 5.4.2 Fine-Grained Permissions

- **Resource-Based Access Control:**
  - Operator: Chỉ được chỉnh sửa transactions do chính mình tạo
  - Manager: Có thể override mọi transactions
  - QC: Chỉ được thao tác trên lots ở trạng thái Quarantine
- **Implementation:** NestJS Custom Guards + MongoDB ownership queries

### 5.5 Cơ chế bảo vệ đặc thù

Dựa trên các yêu cầu an ninh từ User Stories, hệ thống triển khai các kỹ thuật sau:

#### 5.5.1 Session Termination (Manager US14)

- **Khi nào:** Manager thực hiện khóa tài khoản người dùng
- **Cơ chế:**
  1. Backend gọi Keycloak Admin REST API: `DELETE /admin/realms/{realm}/users/{userId}/sessions`
  2. Thu hồi toàn bộ Active Sessions của user
  3. NestJS cập nhật Token Blacklist trong Redis với TTL = remaining token lifetime
  4. Mọi API request với token bị blacklist sẽ nhận `401 Unauthorized`
- **Response Time:** < 100ms (cached check)
- **Logging:** Event được ghi vào Audit Log với severity HIGH

#### 5.5.2 Audit Trail (Manager US15)

- **Dữ liệu ghi nhận:** Method, Path, UserID, Username, Payload (sanitized), Response Status, IP, User Agent, Timestamp
- **Implementation:** NestJS Interceptor (`AuditLogInterceptor`)
- **Storage Pipeline:**
  - Winston Logger -> `logs/audit-{date}.log`
  - Filebeat -> Logstash -> Elasticsearch Index `audit-logs-YYYY.MM`
- **Read-only Protection:** Elasticsearch Index templates với `index.blocks.write: true` sau 24h
- **Compliance:** 90 days retention (đáp ứng yêu cầu kiểm toán)
- **Access Control:** Chỉ IT Administrator có quyền query Kibana Dashboard

#### 5.5.3 Hard-locking cho Quarantine (QC US04)

- **Khi nào:** QC thực hiện cách ly lô hàng (set status = Quarantine)
- **Cơ chế:**
  1. Update MongoDB: `lots.status = 'Quarantine'`
  2. Sync to Redis: `SET quarantine:lot:{lotId} true EX 86400`
  3. API Guards kiểm tra Redis trước khi cho phép Picking/Transfer/Usage
  4. Nếu lot bị Quarantine -> trả về `423 Locked` với thông báo rõ ràng
- **Performance:** < 50ms (Redis in-memory check)
- **Consistency:** Redis TTL 24h, background job sync lại từ MongoDB mỗi 30 phút

#### 5.5.4 Data Integrity cho Backup/Restore (IT Admin US04)

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

### 5.6 Quản lý thông tin định danh

#### 5.6.1 Password Security

- **Hashing Algorithm:**
  - Keycloak default: PBKDF2-SHA256 (27,500 iterations)
  - Alternative: Bcrypt (cost factor 10)
- **Password Policy (Keycloak Realm Settings):**
  - Minimum Length: 12 characters
  - Must include: Uppercase, Lowercase, Digit, Special Character
  - Not Recently Used: Last 5 passwords
  - Expiration: 90 days (configurable)
  - Max Failed Attempts: 5 -> Account temporarily locked (15 minutes)

#### 5.6.2 Role Management by Manager

- **Capability:** Manager có thể thay đổi Role của nhân sự qua UI quản trị (US13)
- **Backend Flow:**
  1. Manager gọi API `PUT /api/users/{userId}/role`
  2. Backend xác thực Manager role
  3. Gọi Keycloak Admin API: Update User Role Mappings
  4. Keycloak cập nhật User's Realm Roles
  5. Claims trong Token mới sẽ phản ánh role updated
- **Effect Timing:** Immediate cho tokens mới, existing tokens hết hạn sau 15 phút
- **Audit:** Role change events được log với before/after values

#### 5.6.3 User Provisioning

- **Self-Registration:** Disabled (chỉ Manager/IT Admin có quyền tạo user)
- **Creation Flow:**
  1. Manager/IT Admin tạo user qua UI hoặc Keycloak Admin Console
  2. Gửi email verification với temporary password
  3. User đăng nhập lần đầu -> bắt buộc đổi password
  4. Setup 2FA (nếu role là IT Administrator)
- **Deprovisioning:**
  - Soft delete: Set `enabled: false` trong Keycloak
  - Hard delete: Sau 90 days retention period (compliance requirement)

---

## 6. Ghi chú kiến trúc quan trọng

- `api-gateway` không chỉ định tuyến, mà còn thực thi auth guard + roles guard ở lớp biên.
- `reports/*` không đi thẳng core DB; đọc qua `metrics-service` từ Elasticsearch để tách tải báo cáo khỏi OLTP.
- `analytics-indexer-service` chạy kiểu worker (không mở HTTP server), giảm độ phức tạp bề mặt tấn công.
- `inventory-management-service` chạy hybrid: vừa HTTP API vừa gRPC endpoint cho AI data.
