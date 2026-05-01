# 01. 01_Product Requirements Document

## 1. Bối cảnh nghiệp vụ

Nhiều doanh nghiệp vừa và nhỏ vẫn vận hành kho bằng giấy tờ hoặc Excel rời rạc, dẫn đến sai lệch tồn kho, khó truy vết lô hàng và tăng rủi ro kiểm toán.

Hệ thống Inventory Management hiện tại được xây dựng để số hóa chuỗi nghiệp vụ kho theo lô: nhập hàng -> kiểm soát chất lượng -> lưu kho -> xuất kho -> kiểm kê/điều chỉnh -> báo cáo.

Ghi chú cập nhật: tài liệu này đã được rà soát theo code thực tế đang chạy trong monorepo.

---

## 2. Vấn đề nghiệp vụ

Các vấn đề cốt lõi cần giải quyết:

- Không có bức tranh tồn kho tin cậy theo lô và theo vai trò.
  -> Ví dụ: Quản lý không biết chính xác còn bao nhiêu sản phẩm thuộc lô A, hoặc nhân viên kho không rõ lô nào đã hết hạn.
- Truy vết chất lượng chưa nhất quán giữa nhận hàng, QC và xuất kho.
  -> Ví dụ: Lô hàng đã bị QC đánh giá “Không đạt” nhưng vẫn bị xuất kho do thiếu cập nhật trạng thái.
- Sai sót thủ công khi nhập liệu, đối soát, ký duyệt.
  -> Ví dụ: Nhân viên nhập nhầm số lượng hoặc chọn nhầm lô khi ghi phiếu nhập, dẫn đến tồn kho thực tế lệch với hệ thống.
- Khó đáp ứng yêu cầu audit trail và báo cáo tuân thủ.
  -> Ví dụ: Khi kiểm toán yêu cầu truy lại ai đã xác nhận xuất kho lô X vào ngày Y, hệ thống không lưu đủ thông tin hoặc log bị thiếu.
- Thiếu chuẩn hóa vận hành hệ thống (phân quyền, log, giám sát).
  -> Ví dụ: Nhân viên kho có thể chỉnh sửa dữ liệu QC hoặc không có cảnh báo khi hệ thống gặp lỗi, gây rủi ro vận hành.

---

## 3. Kiến trúc triển khai thực tế

Hệ thống đang dùng kiến trúc nhiều service, có gateway:

- api-gateway
  - Xử lý auth route qua gRPC đến keycloak-service.
  - Xử lý reports route qua gRPC đến metrics-service.
  - Proxy phần lớn REST nghiệp vụ về inventory-management-service.
  - Proxy route AI sang ai-service.

- inventory-management-service (service nghiệp vụ chính)
  - Domain chính: material, inventory-lot, inventory-transaction, qc-test, production-batch, import-export-order, inventory-adjustment, inventory-audit-report, barcode, user, audit-log, monitoring, logs.

- keycloak-service
  - Đăng nhập, refresh, logout, quên/đặt lại mật khẩu.
  - Đồng bộ thông tin user với hệ nghiệp vụ.

- analytics-indexer-service + metrics-service
  - Đồng bộ dữ liệu từ MongoDB sang Elasticsearch theo lịch cron.
  - Trả báo cáo tổng hợp inventory/qc/audit cho manager và IT admin.

- inventory-management-web-app
  - Route tách theo role: manager, operator, quality-control, it_admin.

---

## 4. Vai trò, vấn đề và mục tiêu

### 4.1 Manager (Quản lý)

Pain points:

- Quy trình duyệt phiếu nhập/xuất hiện tại chậm, dễ gây bottleneck.
- Khó phát hiện biến động tồn kho bất thường kịp thời.
- Thiếu khả năng truy vết giao dịch khi xảy ra sai lệch.
- Việc tổng hợp báo cáo kiểm kê tốn thời gian và dễ sai sót thủ công.

Mục tiêu nghiệp vụ:

- Quản trị phê duyệt phiếu nhập/xuất.
- Điều chỉnh tồn kho theo lý do có kiểm soát.
- Tạo và tải báo cáo kiểm kê chính thức.
- Theo dõi transaction/audit để hậu kiểm.

### 4.2 Quality Control Technician (QC)

Pain points:

- Quy trình kiểm tra chất lượng cho từng lot chưa được chuẩn hóa, dễ thiếu bước hoặc thiếu bằng chứng đi kèm.
- Việc ghi nhận kết quả kiểm định và quyết định (Accepted/Rejected/Hold) chưa nhất quán, khó truy vết lại.
- Xử lý các tình huống như reject, retest, quarantine còn thủ công và mất thời gian.
- Khó theo dõi hiệu suất QC và đánh giá chất lượng nhà cung cấp do thiếu dữ liệu tổng hợp.

Mục tiêu nghiệp vụ:

- Chuẩn hóa workflow QC cho từng lot, bao gồm test, bằng chứng và quyết định rõ ràng.
- Cho phép tạo và quản lý các quyết định kiểm định: Accepted / Rejected / Hold.
- Hỗ trợ quy trình re-test để đưa ra quyết định Extend hoặc Discard.
- Cung cấp khả năng theo dõi KPI QC và đánh giá hiệu suất nhà cung cấp.

### 4.3 Operator / Warehouse Staff (Nhân viên kho)

Pain points:

- Khối lượng tác vụ nhập/xuất lớn, thao tác thủ công dễ gây sai sót (nhầm số lượng, nhầm lot, nhầm material).
- Thiếu công cụ hỗ trợ để xác định nhanh đúng lot–material khi thao tác tại kho.
- Việc ghi nhận chứng từ và số liệu thực tế còn rời rạc, dễ thiếu hoặc sai lệch.
- Không có danh sách công việc rõ ràng (worklist), gây khó khăn trong việc ưu tiên xử lý.
- Khó đối soát trách nhiệm cá nhân do thiếu lịch sử thao tác chi tiết.

Mục tiêu nghiệp vụ:

- Cho phép tạo phiếu nhập/xuất ở trạng thái chờ duyệt.
- Hỗ trợ scan hoặc tra cứu để xác định chính xác lot–material khi thao tác.
- Cho phép upload chứng từ và cập nhật số liệu thực tế tại thời điểm xử lý.
- Cung cấp worklist cá nhân để quản lý và ưu tiên công việc.
- Ghi nhận và hiển thị lịch sử transaction theo từng người dùng để phục vụ đối soát.

### 4.4 IT Administrator (Quản trị hệ thống)

Pain points:

- Việc quản lý user và phân quyền chưa chặt chẽ, dễ xảy ra sai sót hoặc cấp quyền không phù hợp.
- Thiếu khả năng kiểm soát và truy vết hoạt động người dùng một cách đầy đủ và minh bạch.
- Khó theo dõi tình trạng hệ thống theo thời gian thực, dễ bỏ sót sự cố hoặc suy giảm hiệu năng.
- Log hệ thống phân tán, khó tổng hợp và phân tích khi cần điều tra sự cố.
- Việc trích xuất dữ liệu phục vụ audit còn thủ công và mất thời gian.

Mục tiêu nghiệp vụ:

- Quản lý vòng đời người dùng (user lifecycle) và kiểm soát quyền truy cập theo role.
- Theo dõi các chỉ số hệ thống (system metrics) và thiết lập cảnh báo theo ngưỡng.
- Tập trung hóa log và hỗ trợ truy vấn, phân tích khi cần.
- Cung cấp khả năng audit và export dữ liệu phục vụ kiểm tra, đối soát.

---

## 5. Luồng quy trình nghiệp vụ chính

### 5.1 Luồng nhập/xuất kho có phê duyệt

1. Operator/Manager tạo import-export order -> trạng thái mặc định PendingConfirmation.
2. Hệ thống chuẩn hóa item theo order_type:

- Inbound: kiểm tra material, reserve lot_id, kiểm tra expected_location thuộc warehouse.
- Outbound: kiểm tra lot/material/unit/location/warehouse và số lượng khả dụng.

3. Manager confirm:

- Đối soát confirmed_items (blind count).
- Cập nhật tồn lot (+ với inbound, - với outbound).
- Sinh inventory transaction tương ứng (Receipt/Usage).
- Chuyển trạng thái phiếu sang Confirmed.

4. Manager reject:

- Chuyển trạng thái phiếu sang Rejected, lưu lý do.

### 5.2 Luồng QC cho lô hàng

1. QC tạo test hoặc khởi tạo test từ production batch.
2. QC submit decision theo lot:

- Accepted -> lot status = Accepted.
- Rejected -> lot status = Rejected (yêu cầu reject_reason).
- Hold/Pending -> giữ trạng thái quarantine/pending.

3. Re-test:

- extend: cập nhật expiry mới, lot về Accepted.
- discard: lot về Depleted.

4. QC/Manager có thể bulk-quarantine nhiều lot khi cần.

### 5.3 Luồng production batch - inventory lot - transaction

1. Tạo production batch (thường bắt đầu On Hold) để đại diện cho một lần sản xuất thành phẩm.
2. Thêm danh sách batch component theo từng material, mỗi component gắn với inventory lot nguyên liệu cụ thể và số lượng cần dùng.
3. Khi chuyển batch sang Complete:

- Verify từng inventory lot nguyên liệu đủ số lượng khả dụng.
- Trừ kho theo đúng số lượng material thực tế đã lấy từ từng inventory lot nguyên liệu.
- Sinh inventory transaction loại Usage cho từng dòng tiêu hao (thể hiện rõ material nào, lấy từ lot nào, số lượng bao nhiêu, thuộc batch nào).
- Tạo inventory lot mới cho thành phẩm (product lot) với trạng thái Quarantine.
- Sinh inventory transaction loại Receipt cho inventory lot thành phẩm mới.

4. Truy vết hai chiều sau sản xuất:

- Từ production batch có thể biết đã dùng bao nhiêu loại material, lấy từ các inventory lot nào.
- Từ inventory transaction có thể biết lịch sử tiêu hao nguyên liệu và thời điểm tạo ra inventory lot thành phẩm.

### 5.4 Luồng điều chỉnh tồn kho

1. Manager tạo inventory adjustment (bắt buộc reason code; reason note bắt buộc khi OTHER).
2. Hệ thống kiểm tra không làm tồn âm.
3. Sinh transaction Adjustment, lưu before/after quantity và valuation.

### 5.5 Luồng báo cáo kiểm kê chính thức

1. Manager tạo yêu cầu report (draft -> processing).
2. Hệ thống dựng snapshot dữ liệu, render PDF, ký metadata.
3. Report chuyển READY hoặc FAILED.
4. Manager tải file PDF theo report id.

### 5.6 Luồng báo cáo phân tích qua ES

1. analytics-indexer-service sync dữ liệu định kỳ sang Elasticsearch (mặc định 10 phút).
2. metrics-service tổng hợp:

- inventory status
- material usage
- qc performance
- audit report

3. api-gateway expose nhóm /reports cho Manager và IT Administrator.

### 5.7 Mối quan hệ dữ liệu cốt lõi (rút gọn)

- inventory lot: bao gồm cả lot nguyên liệu đầu vào và lot thành phẩm đầu ra.
- production batch: chứa thông tin sản phẩm được tạo, cùng danh sách material đã sử dụng để tạo sản phẩm đó.
- inventory transaction: nhật ký biến động tồn kho theo từng lot, đóng vai trò chứng từ truy vết cho cả chiều tiêu hao nguyên liệu và chiều nhập kho thành phẩm.

---

## 6. Luồng liên vai trò (handoff)

- Receiving -> Manager Approval: Operator tạo phiếu, Manager xác nhận để ghi nhận tồn thực tế chính thức.
- Receiving/Stock -> QC: lot được đưa vào trạng thái phù hợp để QC kiểm định trước khi khai thác tiếp.
- QC Reject -> Manager/Operator: lot bị chặn theo trạng thái, cần quyết định xử lý trả hàng/hủy.
- Inventory Count/Adjustment -> Manager: điều chỉnh tồn phải do Manager thực hiện/phê duyệt.
- Incident -> IT Admin -> Manager/QA: IT xử lý hệ thống, lưu log và phối hợp đánh giá ảnh hưởng nghiệp vụ.

---

## 7. Quy trình nghiệp vụ thủ công (vẫn cần song hành)

1. Biên bản kiểm nhận hàng hóa khi có chênh lệch hoặc hư hỏng.
2. Phiếu giấy dự phòng khi thiết bị scan hoặc mạng gián đoạn.
3. Niêm phong/quarantine vật lý cho lot lỗi hoặc lot nghi ngờ.
4. Lưu chứng từ gốc (invoice, COA, PO) theo quy định pháp lý.
5. Ký tay hoặc ký số nội bộ cho các báo cáo/biên bản bắt buộc.

---

## 8. Tiêu chí chấp nhận

Functional (đã có trong code):

- RBAC(Role-based Access Control) cho 4 vai trò chính.
- Luồng import-export pending -> confirmed/rejected có kiểm soát blind count(đếm số hàng hóa thực tế mà không biết trước số lượng theo chứng từ/hệ thống).
- Inventory lot lifecycle cơ bản: Quarantine/Accepted/Rejected/Depleted.
- QC workflow: decision, retest, supplier performance.
- Inventory adjustment có reason và transaction liên kết.
- Audit logs, system logs, monitoring metrics.
- Báo cáo inventory/qc/audit qua metrics-service.

Functional (đang là mục tiêu mở rộng hoặc mới một phần):

- Backup/restore end-to-end tự động theo chuẩn vận hành doanh nghiệp.
- Offline workflow hoàn chỉnh cho toàn bộ tác vụ kho.
- Một số cảnh báo realtime cấp UI nâng cao.

KPI mục tiêu:

- Thời gian tạo báo cáo: < 30s (dataset chuẩn).
- API response: < 20s cho truy vấn chuẩn.
- Uptime: >= 99.9%.
- Tỷ lệ hài lòng người dùng: >= 90%.

Lưu ý: báo cáo analytics hiện tại mang tính near-real-time theo chu kỳ sync, không phải streaming real-time.

---

## 9. Kết luận

Inventory Management System hiện đã triển khai được các chuỗi nghiệp vụ cốt lõi cho quản trị kho theo lô và kiểm soát chất lượng theo vai trò, đồng thời giữ khả năng mở rộng cho báo cáo và vận hành hệ thống.
