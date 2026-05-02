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

Tách biệt hai luồng dữ liệu: ghi (OLTP) và đọc (Analytics).

- OLTP (MongoDB): Lưu dữ liệu gốc, tối ưu cho giao dịch nhanh (thêm/sửa/xóa).
- Read Model (Elasticsearch): Lưu bản sao đã được tối ưu hóa để tìm kiếm và lập báo cáo phức tạp.
- Đồng bộ: analytics-indexer-service định kỳ quét dữ liệu mới từ MongoDB (dựa vào watermark trong Redis) để đẩy sang Elasticsearch.

### 2.4 Mô hình giao tiếp

Quy định cách các dịch vụ nói chuyện với nhau.

- HTTP/REST: Dùng cho giao tiếp bên ngoài (Frontend) và các proxy đơn giản vì tính phổ biến, dễ debug.
- gRPC: Dùng cho giao tiếp nội bộ giữa các microservices (Gateway -> Keycloak/Metrics) vì nhanh hơn (binary protocol), có schema rõ ràng (.proto) và hỗ trợ streaming.

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
   Dịch vụ trung gian quản lý xác thực. Service này thay mặt hệ thống kho (IMS) làm việc với Keycloak (nơi quản lý tài khoản tập trung), giúp thực hiện các tác vụ như đăng nhập, đăng xuất, gia hạn phiên hay quên mật khẩu. Service này hỗ trợ tiếp nhận yêu cầu từ cả phía Web (HTTP) và các dịch vụ nội bộ (gRPC).

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

### Diễn giải chi tiết sơ đồ ER

Sơ đồ ER dưới đây thể hiện mô hình **quản lý kho theo lô (Lot-centric inventory)**, trong đó `InventoryLot` đóng vai trò trung tâm kết nối các nghiệp vụ nhập/xuất, kiểm định chất lượng và sản xuất.

#### 1. Các thực thể (Entity) và thuộc tính

| Bảng | Ý nghĩa nghiệp vụ |
|------|-------------------|
| **Material** | Danh mục nguyên vật liệu (thuốc thành phẩm, hoạt chất, tá dược, bao bì...) |
| **InventoryLot** | Lô hàng tồn kho — đại diện cho từng lô vật lý có số lượng và hạn sử dụng riêng |
| **InventoryTransaction** | Giao dịch kho — phiếu nhập (IN), xuất (OUT) hoặc điều chỉnh (ADJUSTMENT) |
| **QCTest** | Kiểm tra chất lượng (QC) — gắn với từng lô để ra quyết định pass/fail/pending |
| **ProductionBatch** | Lô sản xuất — đại diện cho một đợt sản xuất cụ thể |
| **BatchComponent** | Thành phần/định mức nguyên liệu của lô sản xuất — liên kết lô sản xuất với lô nguyên liệu tiêu thụ |

**Material (Nguyên vật liệu)**
- `id` (`ObjectId`): Khóa chính duy nhất.
- `material_code`: Mã định danh nguyên vật liệu (ví dụ: `PARA-001`).
- `name`: Tên nguyên vật liệu (ví dụ: Paracetamol).
- `type`: Phân loại (API, Excipient, Packaging...).
- `status`: Trạng thái hoạt động (`active`/`inactive`).

**InventoryLot (Lô tồn kho)**
- `id` (`ObjectId`): Khóa chính.
- `lot_number`: Số lô vật lý (ví dụ: `LOT-2024-001`).
- `quantity`: Số lượng tồn kho hiện tại của lô.
- `status`: Trạng thái lô (`available`, `quarantine`, `expired`...).
- `expiration_date`: Ngày hết hạn — dùng để áp dụng phương pháp FEFO/FIFO khi xuất kho.

**InventoryTransaction (Giao dịch kho)**
- `id` (`ObjectId`): Khóa chính.
- `type`: Loại giao dịch (`IN` — nhập, `OUT` — xuất, `ADJUSTMENT` — điều chỉnh).
- `quantity`: Số lượng giao dịch.
- `transaction_date`: Thời điểm xảy ra giao dịch.

**QCTest (Kiểm tra chất lượng)**
- `id` (`ObjectId`): Khóa chính.
- `test_type`: Loại kiểm tra (độ ẩm, độ tinh khiết, vi sinh...).
- `status`: Kết quả kiểm tra (`pass`, `fail`, `pending`).
- `tested_at`: Thời điểm thực hiện kiểm tra.

**ProductionBatch (Lô sản xuất)**
- `id` (`ObjectId`): Khóa chính.
- `batch_number`: Số lô sản xuất.
- `status`: Trạng thái (`planned`, `in_progress`, `completed`...).

**BatchComponent (Thành phần lô)**
- `id` (`ObjectId`): Khóa chính.
- `planned_qty`: Số lượng nguyên liệu **dự kiến** dùng (định mức).
- `actual_qty`: Số lượng nguyên liệu **thực tế** dùng (có thể chênh lệch so với định mức).

#### 2. Mối quan hệ (Relationships)

**Material → InventoryLot (1 : N)**
- **Ý nghĩa:** Một nguyên vật liệu có thể có nhiều lô hàng tồn kho (nhập về nhiều đợt khác nhau).
- **Khóa ngoại:** `material_id` nằm trong `InventoryLot`.
- **Ví dụ:** Paracetamol có thể có lô nhập tháng 1, tháng 2, tháng 3... mỗi lô có số lượng và hạn sử dụng riêng.

**InventoryLot → InventoryTransaction (1 : N)**
- **Ý nghĩa:** Một lô hàng có thể có nhiều giao dịch nhập/xuất trong suốt vòng đời.
- **Khóa ngoại:** `lot_id` nằm trong `InventoryTransaction`.
- **Ví dụ:** Lô thuốc A được nhập 1.000 viên, sau đó xuất 200 viên, rồi xuất tiếp 300 viên... mỗi lần xuất/nhập đều sinh một `InventoryTransaction`.

**InventoryLot → QCTest (1 : N)**
- **Ý nghĩa:** Một lô hàng có thể được kiểm tra chất lượng nhiều lần (mỗi lần một loại test khác nhau).
- **Khóa ngoại:** `lot_id` nằm trong `QCTest`.
- **Ví dụ:** Một lô có thể test độ ẩm lần 1, test vi sinh lần 2, test độ hòa tan lần 3...

**InventoryLot → ProductionBatch (1 : N)**
- **Ý nghĩa:** Một lô nguyên liệu có thể được cấp phát cho nhiều lô sản xuất khác nhau.
- **Khóa ngoại:** `lot_id` nằm trong `ProductionBatch`.
- **Ví dụ:** Lô Paracetamol 1.000 kg có thể chia cho lô sản xuất thuốc A (dùng 300 kg) và lô sản xuất thuốc B (dùng 500 kg).

**ProductionBatch → BatchComponent (1 : N)**
- **Ý nghĩa:** Một lô sản xuất cần nhiều thành phần/nguyên liệu khác nhau.
- **Khóa ngoại:** `batch_id` nằm trong `BatchComponent`.
- **Ví dụ:** Lô sản xuất thuốc hạ sốt cần Paracetamol (thành phần 1), Tá dược A (thành phần 2), Tá dược B (thành phần 3)...

**InventoryLot → BatchComponent (1 : N)**
- **Ý nghĩa:** Một lô nguyên liệu cụ thể có thể được dùng trong nhiều thành phần của các lô sản xuất khác nhau.
- **Khóa ngoại:** `lot_id` nằm trong `BatchComponent`.
- **Ví dụ:** Lô Paracetamol `LOT-2024-001` có thể là nguyên liệu cho cả `BatchComponent` của lô sản xuất thuốc A và thuốc B.

#### 3. Luồng nghiệp vụ dữ liệu tổng thể

1. **Nhập kho:** Tạo `Material` (nếu chưa có) → Tạo `InventoryLot` (gán `material_id`) → Tạo `InventoryTransaction` (`type = IN`).
2. **Kiểm định:** Tạo `QCTest` cho `InventoryLot` → Nếu `status = pass` thì lô chuyển sang `available`; nếu `fail` thì chuyển `quarantine` hoặc `rejected`.
3. **Lên kế hoạch sản xuất:** Tạo `ProductionBatch` → Tạo các `BatchComponent` (gán `batch_id`) để liệt kê nguyên liệu cần dùng với `planned_qty`.
4. **Xuất kho sản xuất:** Khi thực hiện sản xuất, tạo `InventoryTransaction` (`type = OUT`) cho các `InventoryLot` được cấp phát, đồng thời cập nhật `actual_qty` vào `BatchComponent` để theo dõi định mức so với thực tế.

> **Lưu ý thiết kế:** Mọi giao dịch kho đều gắn với `InventoryLot` thay vì gắn trực tiếp với `Material`. Điều này đảm bảo truy xuất nguồn gốc (traceability) theo từng lô và hỗ trợ quản lý hạn sử dụng chặt chẽ.

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
- Kibana: `https://kibana.inventory-system.cloud`

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

- **Hosted frontend url:** `https://inventory-system.cloud/`
- **API Gateway url:** `https://api.inventory-system.cloud/`
- **Keycloak (SSO/Auth) url:** `https://keycloak.inventory-system.cloud`
- **Grafana:** `https://grafana.inventory-system.cloud`
- **Jenkins CI/CD:** `https://jenkins.inventory-system.cloud`
- **Kibana:** `https://kibana.inventory-system.cloud/`

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

| Nhóm                  | Công nghệ/Công cụ                                              | Vai trò trong hệ thống                                         |
| :-------------------- | :------------------------------------------------------------- | :------------------------------------------------------------- |
| Frontend              | React, TypeScript, Vite, React Router                          | UI theo role, điều hướng và gọi API                            |
| API Layer             | NestJS (api-gateway)                                           | Entry HTTP, guard auth/role, reverse proxy, gRPC client        |
| Core Domain           | NestJS (inventory-management-service)                          | Xử lý nghiệp vụ kho, QC, batch, audit                          |
| Auth Service          | NestJS (keycloak-service) + Keycloak                           | Đăng nhập, token lifecycle, quản trị user/role                 |
| AI Service            | NestJS (ai-service)                                            | AI endpoints + agents, đọc dữ liệu nội bộ qua gRPC             |
| Reporting             | metrics-service (NestJS + gRPC)                                | Truy vấn dữ liệu báo cáo từ Elasticsearch                      |
| Analytics ETL         | analytics-indexer-service (NestJS worker)                      | Đồng bộ MongoDB -> Elasticsearch theo lịch                     |
| OLTP Database         | MongoDB                                                        | Lưu dữ liệu nghiệp vụ chính                                    |
| Cache/State           | Redis                                                          | Lưu watermark đồng bộ cho indexer                              |
| Search/Analytics      | Elasticsearch                                                  | Read model cho báo cáo và phân tích                            |
| Monitoring            | Prometheus, Grafana, node-exporter, cAdvisor, mongodb-exporter | Thu thập metrics hạ tầng + ứng dụng, cảnh báo và trực quan hóa |
| Logging/Observability | ELK Stack (Elasticsearch, Logstash, Kibana)                    | Thu thập, lưu trữ và truy vấn log phục vụ audit/vận hành       |
| Service Communication | HTTP/REST, gRPC                                                | Giao tiếp giữa các lớp/services                                |
| Containerization      | Docker, Docker Compose                                         | Đóng gói và chạy toàn bộ stack local                           |
| CI                    | Jenkinsfile                                                    | Pipeline CI/CD (theo repo)                                     |

---

## 5. Security - Keycloak Integration

Hệ thống Inventory Management System (IMS) sử dụng **Keycloak** làm nền tảng quản trị định danh và truy cập (IAM) tập trung, tuân thủ các tiêu chuẩn bảo mật **OpenID Connect (OIDC)** và **OAuth 2.0**.

### 5.1 Các thành phần bảo mật (Security Components)

Hệ thống sử dụng **Keycloak** làm trung tâm quản lý tài khoản (Identity Provider), tuân thủ chuẩn **OpenID Connect (OIDC)** và **OAuth 2.0**.

#### 5.1.1 Keycloak (Identity Provider)
- **Vai trò:** Quản lý tập trung User, Roles và cấp phát Token (JWT).
- **Truy cập:**
  - Admin Console: `https://keycloak.inventory-system.cloud/admin`
  - Token Endpoint: `https://keycloak.inventory-system.cloud/realms/inventory-management/protocol/openid-connect/token`
  - JWKS Endpoint: `https://keycloak.inventory-system.cloud/realms/inventory-management/protocol/openid-connect/certs`

#### 5.1.2 React Frontend (Giao diện người dùng)
- **Vai trò:** Đưa người dùng đến trang đăng nhập của Keycloak và lưu lại Token (Access/Refresh) sau khi đăng nhập.
- **Cấu hình:** Dùng `@react-keycloak/web` để tự động gắn Bearer Token vào các request gọi về Backend.

#### 5.1.3 NestJS Backend (Máy chủ xử lý)
- **Vai trò:** Kiểm tra chữ ký JWT từ Keycloak và thực thi phân quyền (Roles) tại các API.
- **Cơ chế:** Dùng `nest-keycloak-connect` và Redis để cache thông tin xác thực, giúp kiểm tra nhanh chóng.

---

### 5.2 Ghi log và Audit Trail (Logging & Audit)

Hệ thống ghi lại lịch sử hoạt động để phục vụ kiểm tra an ninh và vận hành.

#### 5.2.1 Log sự kiện Keycloak
- **Ghi nhận:** Đăng nhập (LOGIN), Đăng xuất (LOGOUT), Tạo user (CREATE_USER)...
- **Lưu trữ:** Database Keycloak (Local) hoặc đẩy về ELK Stack (Production).

#### 5.2.2 Backend Audit Logs
- **Ghi nhận:** *Ai* (User), *Làm gì* (API Path), *Khi nào* (Timestamp), *Từ đâu* (IP Address).
- **Lưu trữ:** File log cục bộ (Dev) hoặc Elasticsearch (Prod) để tìm kiếm qua Kibana.
- **Thời gian lưu:** 90 ngày (yêu cầu tuân thủ).

#### 5.2.3 Giám sát sự kiện an ninh
- **Theo dõi:** Đăng nhập sai quá 5 lần, truy cập lô hàng Quarantine, thay đổi cấu hình hệ thống.
- **Cảnh báo:** Gửi thông báo qua Slack/Email cho IT Admin khi có sự kiện nghiêm trọng.

### 5.3 Quy trình đăng nhập & phân quyền

- **Đăng nhập:** User vào trang web -> Chuyển đến trang login của Keycloak -> Đăng nhập -> Quay về với Token (JWT).
- **Phân quyền:** Mỗi khi User gọi API, hệ thống kiểm tra Token để biết User là ai và có quyền gì.
- **Làm mới token:** Khi Token cũ sắp hết hạn, hệ thống tự động lấy Token mới (không cần đăng nhập lại).
- **Bảo mật 2 lớp (2FA):** Dành riêng cho IT Admin, dùng ứng dụng như Google Authenticator để xác thực.

---

### 5.4 Phân quyền theo vai trò (RBAC)

Hệ thống có 4 vai trò chính, mỗi vai trò chỉ được làm những việc nhất định:

- **Manager (Quản lý):** Quản trị vật tư, lô hàng, phê duyệt các luồng kho, xem báo cáo và quản lý user.
- **Operator (Nhân viên kho):** Tạo phiếu nhập/xuất, kiểm kê kho thực tế tại hiện trường.
- **Quality Control (Kiểm soát chất lượng):** Đánh giá chất lượng lô hàng, xử lý hàng loi, cách ly hàng hóa (Quarantine).
- **IT Administrator (Quản trị viên):** Giám sát hệ thống, quản lý Log, thiết lập sao lưu và phục hồi dữ liệu.

---

### 5.5 Các cơ chế bảo vệ đặc thù

- **Khóa tài khoản:** Manager có thể ép đăng xuất (logout) mọi phiên làm việc của nhân viên khi cần thiết.
- **Truy vết (Audit):** Mọi thay đổi dữ liệu đều được ghi log lại (ai làm, lúc nào, làm gì) để phục vụ kiểm toán.
- **Khóa hàng cách ly (Quarantine):** Lô hàng đang bị cách ly sẽ bị khóa, không cho xuất kho dù có lệnh.
- **Sao lưu & Phục hồi:** Dữ liệu được sao lưu định kỳ, có kiểm tra an toàn trước khi phục hồi để tránh làm hỏng dữ liệu.

---

### 5.6 Quản lý thông tin người dùng

- **Mật khẩu:** Phải dài ít nhất 12 ký tự, có đủ chữ hoa/thường/số/ký tự đặc biệt. Đổi mật khẩu mỗi 90 ngày.
- **Tạo user:** Chỉ Manager hoặc IT Admin mới được tạo user mới. User mới nhận emailed tạm để đăng nhập lần đầu.
- **2FA:** IT Admin bắt buộc phải bật xác thực 2 lớp khi đăng nhập để tăng cường bảo mật.

---

## 6. Ghi chú kiến trúc quan trọng

- `api-gateway` không chỉ định tuyến, mà còn thực thi auth guard + roles guard ở lớp biên.
- `reports/*` không đi thẳng core DB; đọc qua `metrics-service` từ Elasticsearch để tách tải báo cáo khỏi OLTP.
- `analytics-indexer-service` chạy kiểu worker (không mở HTTP server), giảm độ phức tạp bề mặt tấn công.
- `inventory-management-service` chạy hybrid: vừa HTTP API vừa gRPC endpoint cho AI data.
