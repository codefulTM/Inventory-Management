# Tools và Prompts

Document này trình bày công cụ và các prompts chính nhóm đã dùng để tạo và cập nhật các sản phẩm trong thư mục 02_Source.

---

## GitHub Copilot

### Prompt:

```
Xem xét stack tôi đang sử dụng để rồi sau đó lên plan để biến nó thành RAG Agents thực sự.
```

### Prompt:

```
Rút gọn Rag Agents Plan lại còn 4 phases
```

### Prompt:

```
.....Đây là đoạn hội thoại tôi đã test với My Assistant. Có vẻ không ổn, hãy cải thiện và tự test cho đến khi hoàn thiện (phải dùng được, trả lời phải đáp ứng được nhu cầu người dùng) tính năng này
```

### Prompt:

```
Using AI-DLC, based on my existing backend, I want to create folders for keycloak-service and api-gateway:
1. keycloak-service: Transfer authentication logic and keycloaks from the backend here.
2. api-gateway: Gateway for the frontend to call APIs; the gateway will navigate using gRPC.
Note: When making this change, all logic must be ensured, all tests must pass, and the directory structure must be standard NestJS.
```

### Prompt:

```
Using AI-DLC, read the entire source code from "01_Source Code/", then extract everything related to AI into the "ai-service". "ai-service" interacts with other services also using gRPC.
Note: When making this change, all logic must be guaranteed, and all tests (unit, integration, contract, e2e) must pass.
```

### Prompt:

```
Using AI-DLC, read the entire source code from "01_Source Code/", I want to create an analytics-indexer-service to synchronize data from MongoDB to Elasticsearch every 10 minutes for statistical purposes. The previous synchronization time will be saved to Redis. The next 10 minutes will use that time as the "from" to query MongoDB sync es, and the "to" will be saved to Redis again. Each collection will have a different Redis key time.
```

### Prompt:

```
Using AI-DLC, after reading all the code in the "01_Source Code" folder, I want to extract all statistical data into the "metrics-service" and convert all that data into queries from Elasticsearch that were previously synced with the analytics-indexer-service.
Note: This extraction must ensure that the existing logic remains intact; all units, integrations, contracts, and e2e tests must pass.
```

### Prompt:

```
inventory-management-service và analytics-indexer-service sẽ cùng connect tới chung 1 redis.

1. analytics-indexer-service sẽ sử dụng db 0 của redis để lưu time sync (đã có).
2. inventory-management-service sẽ sử dụng db 1 của redis để lưu các keyId. Các id bây giờ sẽ không phải do người dùng nhập vào nữa. Hệ thống sẽ trực tiếp tạo bằng cách call redis INCR keyname. Mỗi bảng hoặc mỗi loại id sẽ có riêng 1 key redis khác nhau. ID được tạo sẽ có dạng: "XXX-number" XXX là ký tự đại diện của loại ID đó và number là số lưu trong redis, ví dụ material tạo data đầu tiên "MAT-1". Các data mẫu được tạo bởi script init sẽ có ID thêm "EX-" ở phía trc, ví dụ "EX-MAT-1". Nếu ID bị trùng sẽ retry để lấy ID khác.
Và ở các form tạo data cũng sẽ disable/ẩn các field ID sẽ do hệ thống tự tạo đó.
```