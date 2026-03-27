# Kafka Setup Analysis

## Mục tiêu

Thiết lập hệ thống Kafka làm event bus cho toàn bộ ứng dụng (backend services, analytics, search index) nhằm đảm bảo tính mở rộng, bền vững và hỗ trợ các luồng dữ liệu bất đồng bộ như: thông báo giao dịch tồn kho, log audit, cập nhật search index, gửi sự kiện tới service khác.

## Tổng quan

Kafka sẽ chạy trong cụm (cluster) gồm ít nhất 3 broker để đảm bảo high‑availability và replication. Phiên bản hiện tại sử dụng **Kafka Raft (kRaft)** cho control plane, loại bỏ hoàn toàn ZooKeeper để giảm phụ thuộc vận hành.

Kết nối với NestJS backend qua thư viện `kafkajs` hoặc `@nestjs/microservices` Kafka transport. Các service sẽ publish sự kiện và (nếu cần) consumer để xử lý.

## Các bước thiết lập

1. **Chuẩn bị môi trường** (Đã xong)
   - Quyết định dùng Docker Compose (development) và Kubernetes (production).
   - Tạo folder `infra/kafka` trong repo để chứa cấu hình.
   - Chọn phiên bản Kafka (ví dụ `3.5.0` hoặc latest compatible với kRaft).

2. **Docker Compose file** (Đã xong)
   - Tạo `infra/kafka/docker-compose.yml` với dịch vụ:
     - `kafka-broker`: image `confluentinc/cp-kafka`, exposes 9092. # cấu hình kRaft, không cần dịch vụ ZooKeeper.
   - Cấu hình lưu trữ dữ liệu (volumes) và environment variables: `KAFKA_BROKER_ID`, `KAFKA_LISTENERS`, `KAFKA_ADVERTISED_LISTENERS`, `KAFKA_KRAFT_BROKER_ID`, `KAFKA_CONTROLLER_QUORUM_VOTERS` (kRaft), `KAFKA_AUTO_CREATE_TOPICS_ENABLE=false`.
   - Tạo topic mặc định `inventory-transactions` và `audit-logs` bằng lệnh `kafka-topics` trong compose entrypoint.

3. **Kubernetes manifests** (Chưa làm, đợi đến khi deploy mới làm)
   - Tạo `infra/kafka/k8s/` chứa `statefulset.yaml`, `service.yaml`, `configmap.yaml`.
   - Sử dụng PersistentVolumeClaims cho mỗi broker.
   - Thiết lập readiness/liveness probes và anti-affinity để tránh single point of failure.
   - Thêm CronJob để tạo topic nếu chưa tồn tại.

4. **Client integration (NestJS)**
   - Cài đặt **`npm install kafkajs`** và sử dụng thư viện này trong module/ service (không cần `@nestjs/microservices`).
   - Tạo một module Kafka trong dự án, đặt tại `src/event-bus/`, cung cấp producer-global singleton và helper service.
   - Định nghĩa `KafkaConfigService` trong `config/` để đọc từ `process.env`.
   - Implement `KafkaProducerService` với phương thức `publish(topic, message)` bao gồm retry/backoff.
   - Nếu cần consumer, tạo `KafkaConsumerService` chạy trong background (tích hợp với `onModuleInit`).
   - Bảo đảm topic names được đưa vào enum hoặc constant để tránh typo.

5. **Định nghĩa sự kiện & dispatcher** (Đã xong, ngoại trừ step cuối)
   - Chuẩn hoá định dạng message: `type`, `payload`, `timestamp`, `trace_id`.
   - Định nghĩa interface `Event` và `Handler` để mô tả sự kiện và các bộ xử lý.
   - Tạo class `Dispatcher` (hoặc registry) với các phương thức `register(handler)` và `dispatch(evt)` để điều phối event tới handler phù hợp.
   - Định nghĩa các loại event: `InventoryTransactionCreated`, `InventoryTransactionUpdated`, `AuditLogCreated`, ...

6. **Security & Network** (Chưa làm, đợi đến khi deploy mới làm)
   - Bật SASL/SSL khi chạy production.
   - Tạo user service accounts và sử dụng ACL để hạn chế quyền access.
   - Cấu hình `KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM` và cung cấp certs qua Kubernetes secret.

7. **Testing & Development** (Đã xong, ngoại trừ step cuối đợi khi nào cần cải tiến mới làm)
   - Thêm script npm `kafka:up`/`kafka:down` để khởi động/dừng container phát triển.
   - Viết tests đơn vị cho producer (mocks kafkajs) và E2E tests thực tế khởi động broker in‑memory hoặc docker.
   - Đảm bảo consumer xử lý message không block đường chính (dùng hợp từ `rxjs` hoặc services queue).

## Ghi chú

- Chọn chế độ replication factor ≥ 3 và min.insync.replicas = 2.
- Giữ retention phù hợp (ví dụ 7–30 ngày) hoặc bật compaction cho các topic metadata.
- Luôn kiểm tra latency trước khi thêm consumer mới.
- Một số service backend có thể dùng Kafka Connect để sink vào Elasticsearch/DB.

> File này lưu trữ kế hoạch và phân tích chi tiết để thiết lập Kafka cho dự án.
