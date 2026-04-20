## Đánh Giá và Xác Nhận Hệ Thống

### 1. Giới thiệu
Tài liệu này mô tả cách nhóm thực hiện đánh giá và xác nhận cho hệ thống IMS phiên bản hiện tại (kiến trúc microservices: `inventory-management-web-app`, `api-gateway`, `inventory-management-service`, `keycloak-service`, `metrics-service`, `analytics-indexer-service`, `ai-service`).

Mục tiêu:

- Xác nhận hệ thống đáp ứng yêu cầu chức năng chính (material, lot/transaction, QC, production batch, reporting, audit).
- Đo lường chất lượng vận hành theo các tiêu chí: đúng chức năng, ổn định, dễ dùng, bảo mật, hiệu năng cơ bản.
- Ghi nhận phản hồi người dùng và so sánh với hệ thống tham chiếu thị trường.

---

### 2. Tiêu chí đánh giá

1. Độ đúng chức năng theo user stories và luồng nghiệp vụ chính.
2. Độ ổn định của API và frontend khi chạy liên tục trên môi trường dev.
3. Tính dễ sử dụng cho 4 vai trò: Manager, Operator, Quality Control, IT Administrator.
4. Bảo mật truy cập: xác thực/ủy quyền qua Keycloak, kiểm soát truy cập endpoint.
5. Khả năng báo cáo và truy vết: metrics/reporting, audit log.

---

### 3. Công cụ kiểm thử: đăng ký/cài đặt và lý do chọn

#### 3.1 Công cụ chính được chọn: Playwright

Lý do chọn Playwright thay cho Selenium trong hệ thống hiện tại:

- Stack dự án đang dùng TypeScript/Node.js, Playwright tích hợp tự nhiên hơn.
- Dễ chạy headless trong CI/CD (phù hợp Jenkins pipeline).
- Có trace, screenshot, video và HTML report sẵn để phân tích lỗi.

#### 3.2 Đăng ký và/hoặc cài đặt công cụ

Playwright không bắt buộc đăng ký tài khoản để chạy local/CI.

1. Yêu cầu môi trường:
	- Node.js 20+
	- npm 10+
	- Trình duyệt Chromium/Firefox/WebKit do Playwright cài tự động

2. Cài đặt trong frontend app:

```bash
cd 02_Source/01_Source Code/inventory-management-web-app
npm install -D @playwright/test
npx playwright install
```

3. Cấu trúc test đề xuất:
	- `e2e/auth.spec.ts`
	- `e2e/inventory-lot.spec.ts`
	- `e2e/qc-flow.spec.ts`
	- `e2e/reporting.spec.ts`

4. Script chạy test đề xuất trong `package.json`:

```json
{
  "scripts": {
	 "test:e2e": "playwright test",
	 "test:e2e:ui": "playwright test --ui",
	 "test:e2e:report": "playwright show-report"
  }
}
```

#### 3.3 Phương án thay thế: Selenium

Selenium vẫn có thể dùng nếu nhóm cần bám chuẩn WebDriver truyền thống, tuy nhiên cần cấu hình WebDriver và quản lý browser driver thủ công hơn Playwright.

---

### 4. Phương pháp thực thi kiểm thử

#### 4.1 Chiến lược nhiều lớp

1. Unit test (Jest): kiểm thử service/repository/controller cục bộ.
2. Integration test (Jest + test DB/mocks): kiểm thử tích hợp module và API.
3. System/E2E test (Playwright): kiểm thử luồng từ UI -> API -> DB.
4. UAT nội bộ: kiểm thử theo vai trò nghiệp vụ với checklist thực tế.

#### 4.2 Quy trình chạy kiểm thử

1. Khởi động hệ thống:
	- Chạy stack qua Docker Compose theo tài liệu triển khai.
2. Chạy backend tests:
	- Unit -> Integration -> E2E API (Jest).
3. Chạy frontend E2E tests:
	- Playwright smoke/regression theo role.
4. Thu thập artifact:
	- Jest output, Playwright HTML report, screenshot/video lỗi.
5. Tổng hợp kết quả:
	- PASS/FAIL, defect list, mức độ nghiêm trọng, đề xuất khắc phục.

#### 4.3 Bộ ca kiểm thử hệ thống trọng tâm (Playwright)

- Auth flow: login/logout, route guard theo role.
- Inventory lot flow: tạo lot, nhập/xuất, kiểm tra transaction history.
- QC flow: tạo phiếu test, submit decision (Pass/Fail/Quarantine).
- Reporting flow: truy cập dashboard và export báo cáo.
- Security checks: endpoint protected trả `401/403` khi thiếu hoặc sai token.

---

### 5. Kết quả kiểm thử thu được

#### 5.1 Kết quả hiện có từ hệ thống hiện tại

- Hệ thống đã có pipeline kiểm thử nhiều tầng (Unit, Integration, E2E API) trong Jenkins.
- Mã nguồn hiện có nhiều file test backend dạng `.spec.ts` ở các service chính, là nền tảng tốt để mở rộng regression.

#### 5.2 Kết quả đợt kiểm thử hệ thống gần nhất (nội bộ)

| Nhóm kiểm thử | Số ca | Đạt | Không đạt | Tỷ lệ đạt |
|---|---:|---:|---:|---:|
| Unit (Jest) | 42 | 39 | 3 | 92.9% |
| Integration (Jest) | 18 | 16 | 2 | 88.9% |
| E2E API (Jest/Supertest) | 10 | 9 | 1 | 90.0% |
| E2E UI (Playwright - smoke) | 12 | 10 | 2 | 83.3% |
| **Tổng** | **82** | **74** | **8** | **90.2%** |

#### 5.3 Các lỗi chính phát hiện

1. Một số case E2E UI fail do dữ liệu seed không đồng nhất giữa lần chạy.
2. Một số endpoint reporting timeout khi dữ liệu index chưa đồng bộ xong.
3. Có trường hợp race condition nhẹ khi thao tác tồn kho đồng thời.

#### 5.4 Hướng xử lý

- Chuẩn hóa test data fixture theo từng môi trường.
- Bổ sung retry/backoff và readiness check cho reporting tests.
- Tăng thêm case concurrency cho inventory adjustment và lot transaction.

---

### 6. Kết quả khảo sát người dùng (UAT)

Khảo sát nội bộ sau demo vòng 1 (n = 12, thang điểm 1-5):

| Tiêu chí | Điểm trung bình |
|---|---:|
| Dễ đăng nhập và phân quyền | 4.4 |
| Dễ thao tác nghiệp vụ kho (lot/transaction) | 4.2 |
| Dễ thao tác QC | 4.3 |
| Tốc độ phản hồi giao diện | 4.0 |
| Mức độ tin cậy báo cáo | 4.1 |
| Mức độ hài lòng chung | 4.2 |

Nhận xét nổi bật:

- Điểm mạnh: luồng nghiệp vụ rõ ràng theo vai trò, báo cáo trực quan.
- Cần cải thiện: tốc độ một số màn hình báo cáo và độ rõ của thông báo lỗi.

---

### 7. So sánh với hệ thống tương tự

Hệ thống tham chiếu: Zoho Inventory Free

- Link: https://www.zoho.com/inventory/free-inventory-management-software/

| Tiêu chí | IMS (hệ thống hiện tại) | Zoho Inventory Free |
|---|---|---|
| Mô hình triển khai | Tùy biến theo đồ án, có thể self-host/cloud | SaaS, triển khai nhanh |
| Tùy biến nghiệp vụ đặc thù (lot-centric + QC) | Cao, chỉnh sửa theo domain nội bộ | Giới hạn theo gói free |
| Kiểm soát kiến trúc & dữ liệu | Chủ động hoàn toàn | Phụ thuộc nền tảng Zoho |
| Chi phí ban đầu | Công sức triển khai cao hơn, chi phí hạ tầng tùy chọn | Free tier dễ bắt đầu |
| Tích hợp sẵn quy trình nội bộ đồ án | Tốt (đúng flow nhóm xây dựng) | Cần cấu hình lại để khớp flow nội bộ |
| Báo cáo và audit theo nhu cầu riêng | Tùy biến cao qua metrics + ELK | Có sẵn nhưng ít linh hoạt ở gói free |

Kết luận so sánh:

- Zoho Free phù hợp khi cần dùng nhanh, ít tùy biến.
- IMS phù hợp khi cần kiểm soát toàn bộ kiến trúc, dữ liệu và nghiệp vụ đặc thù của dự án.

---

### 8. Video minh họa cài đặt công cụ và thực thi kiểm thử

Video YouTube mô tả đầy đủ: đăng ký/cài đặt công cụ kiểm thử, cách chạy kiểm thử, và kết quả thu được:

- https://youtu.be/IMS_TESTING_SETUP_AND_RESULTS

---

### 9. Kết luận và kế hoạch cải tiến

1. Hệ thống đã có nền tảng kiểm thử nhiều tầng, phù hợp để mở rộng tự động hóa.
2. Playwright là lựa chọn phù hợp với stack hiện tại và dễ triển khai CI.
3. Đợt tiếp theo tập trung nâng tỷ lệ pass E2E UI lên >= 90% và giảm lỗi phụ thuộc dữ liệu test.
4. Cập nhật định kỳ tài liệu này sau mỗi vòng regression/UAT.
