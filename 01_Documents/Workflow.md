# Workflow chính: Quản lý sản xuất & tồn kho

## Luồng tổng quan chuẩn (theo nghiệp vụ thực tế)
1. **Manager tạo materials**: Manager tạo mới hoặc duyệt vật tư/materials chuẩn cho sản xuất.
2. **Operator nhận lô hàng (inventory lot) của material**: Operator tiếp nhận, nhập kho, tạo lô hàng inventory lot cho material đã được Manager tạo.
3. **QC kiểm tra lô hàng**: QC thực hiện kiểm tra chất lượng lô hàng, cập nhật trạng thái (Accepted/Rejected/Quarantine).
4. **Manager tạo Production Batch**: Manager khởi tạo batch sản xuất mới, xác định sản phẩm đầu ra.
5. **Operator thêm các material với số lượng cần dùng vào production batch**: Operator chọn các lô material, nhập số lượng sử dụng cho batch.
6. **Manager thay đổi trạng thái production batch để tạo ra sản phẩm (material)**: Manager xác nhận hoàn thành batch, hệ thống sinh ra sản phẩm mới (material/lô thành phẩm).
7. **Inventory Transaction luôn được tạo khi có thay đổi (nhận, sử dụng, hoàn thành, điều chỉnh, chuyển kho, v.v.)**: Mỗi thay đổi số lượng đều sinh transaction để đảm bảo traceability.

> Lưu ý: Mỗi bước đều phải ghi nhận vào bảng transaction/audit log để đảm bảo truy vết và minh bạch.

# Workflow chi tiết (theo schema)

Mục tiêu: Dựa trên schema (Materials → InventoryLots → InventoryTransactions → QCTests / ProductionBatches → BatchComponents → Labels), mô tả chi tiết từng bước workflow, liệt kê các bảng và trường liên quan, và chỉ rõ giá trị nào thay đổi (before → after) trong mỗi bước. Kèm ví dụ thực tế ngành dược: Ascorbic Acid (Vitamin C) dùng cho viên 500 mg.

Ngắn gọn về cách đọc tài liệu:
- Mỗi bước mô tả: mục tiêu → bảng được đọc (READ) → bảng được ghi/cập nhật (WRITE/UPDATE) → ví dụ giá trị (before → action → after)
- Dùng ký hiệu: table.field để chỉ trường cụ thể.

---

## 1. Bảng & trường chính (tổng quan)
Danh sách bảng/field thường dùng xuyên suốt workflow (tên trường là gợi ý; tuỳ schema thực tế có thể khác tên):
- materials: id, material_code, name, unit, default_label_template_id, specifications
- inventory_lots: id, lot_code, material_id, quantity, available_quantity, is_sample, parent_lot_id, manufacture_date, expiry_date, status
- inventory_transactions: id, inventory_lot_id, type, quantity, location_id, reference_id, performed_by, status, created_at
- qc_tests: id, inventory_lot_id, test_type, test_results (JSON), status, verified_by, verified_at
- production_batches: id, batch_code, product_id, planned_qty, produced_qty, status, started_at, finished_at
- batch_components: id, production_batch_id, inventory_lot_id, planned_quantity, actual_quantity
- label_templates: id, template_code, label_type, template_content, fields
- labels: id, template_id, inventory_lot_id, production_batch_id, rendered_content, barcode_value, created_by, created_at
- users: id, username, role_id
- audit_logs: id, user_id, action, entity_type, entity_id, details, timestamp

---

## 2. Quy ước thể hiện Before → Action → After
Khi mô tả thay đổi, tôi sẽ dùng định dạng:
- Trường: BEFORE -> (action) -> AFTER
Ví dụ: inventory_lots.available_quantity: 0.0 -> (RECEIPT +60.0) -> 60.0

---

## 3. Kịch bản thực tế mẫu (Pharmacy)
Giá trị mẫu sẽ dùng xuyên suốt: 
- Material: MAT-VC-500 (Ascorbic Acid, Vitamin C), unit = kg
- Receipt: InventoryLot lot-VC-20260115, manufacturer_lot = MFG-VC-20260115, quantity = 60.0 kg, expiry_date = 2028-01-15
- ProductionBatch: batch-TBL-1001 (Vitamin C 500 mg tablets), planned_qty = 100000 viên, API planned consumption = 50.0 kg
- Label templates: TPL-RM-01 (Raw Material), TPL-SAMPLE-01 (Sample), TPL-FIN-01 (Finished), TPL-STAT-01 (Status)

---

## 4. Quy trình chi tiết — từng bước và thay đổi bảng

### A. Tạo Material (Manager tạo vật tư chuẩn)
Mục tiêu: tạo bản ghi vật tư/sản phẩm.
- Vai trò chính: Manager (creates/approves canonical materials)
- Vai trò phụ: Operator (may create draft), IT Administrator (manages default label templates)

Hành động & trách nhiệm:
- Nhập dữ liệu vật tư trong UI (draft): Operator
- Duyệt/Phát hành material chính thức: Manager
- Gán default label template: IT Administrator (hoặc Manager)
- Lưu vào DB (materials INSERT): Hệ thống (được kích hoạt bởi Manager/Operator; field performed_by lưu user thực hiện)
- Ghi audit: Hệ thống

- ĐỌC: (tuỳ) `label_templates` để gán mặc định
- GHI: `materials`
  - `materials`: INSERT { material_code: "MAT-VC-500", name: "Ascorbic Acid (Vitamin C)", unit: "kg", default_label_template_id: "TPL-RM-01" }
- Audit: `audit_logs` INSERT

Ví dụ giá trị:
- `materials` (mới): id=mat-1, material_code=MAT-VC-500, name="Ascorbic Acid (Vitamin C)"

Kết quả: bảng `materials` thêm bản ghi mới.

---

### B. Operator nhận lô hàng (InventoryLot) → Tạo InventoryLot + InventoryTransaction + Label
Mục tiêu: ghi nhận lô nhập, sinh transaction và in nhãn raw material.
- Vai trò chính: Operator (thực hiện nhận, tạo lot, tạo transaction, in nhãn ban đầu)
- Vai trò phụ: Quality Control Technician (QC) (được kích hoạt để test), Manager (xem xét/duyệt các trường hợp ngoại lệ), IT Administrator (quản lý template/in cấu hình in)

Hành động & trách nhiệm chi tiết:
- Tạo `InventoryLot` (INSERT): Operator
- Tạo `InventoryTransaction` (RECEIPT INSERT): Operator
- Chọn `LabelTemplate` và render nhãn (INSERT `labels`): Operator (IT Admin quản lý template/printer)
- Cập nhật `inventory_lots.available_quantity` sau khi xác nhận: Hệ thống (do Operator kích hoạt; Manager xem nếu có ngoại lệ)
- Kích hoạt workflow QC / tạo công việc QC: Hệ thống (khởi tạo bởi Operator); sau đó Quality Control Technician thực hiện kiểm tra
- Ghi `audit_logs`: Hệ thống (performed_by = Operator)

ĐỌC:
- `materials` (material_code, name, unit)
- `label_templates` (template_content)

GHI/CẬP NHẬT:
- `inventory_lots`: INSERT record mới
- `inventory_transactions`: INSERT transaction loại RECEIPT
- `labels`: INSERT rendered label
- `inventory_lots.available_quantity`: UPDATE khi transaction được xác nhận
- `audit_logs`: INSERT

Các trường thay đổi (ví dụ Vitamin C):
- `inventory_lots.quantity`: (N/A) -> (create) -> 60.0
- `inventory_lots.available_quantity`: 0.0* -> (RECEIPT +60.0) -> 60.0
  * lưu ý: theo chính sách, available có thể để 0 cho tới khi QC pass; ở ví dụ này giả sử transaction tự xác nhận và available = quantity.
- `inventory_transactions`: INSERT { id: tx-1, inventory_lot_id: lot-VC-20260115, type: 'RECEIPT', quantity: +60.0, location_id: 'WH-PHARMA-01', reference_id: 'PO-VC-9876', performed_by: 'operator_vn', status: 'Confirmed' }
- `labels`: INSERT { template_id: 'TPL-RM-01', inventory_lot_id: lot-VC-20260115, rendered_content: 'Ascorbic Acid - lot-VC-20260115 - Exp: 2028-01-15 - 60.0 kg', barcode_value: 'BC-...' }
- `audit_logs`: INSERT (ghi nhận hành động nhận hàng)

Before → Action → After (ví dụ trường):
- `inventory_lots` (trước): không có record cho lot-VC-20260115 → (tạo lot) → `inventory_lots.quantity` = 60.0, `inventory_lots.available_quantity` = 60.0, `inventory_lots.status` = 'Quarantine'
- `inventory_transactions` (trước): none → (insert) → TX record +60.0
- `labels` (trước): none → (generate) → Raw Material label

Ghi chú:
- Nếu chính sách yêu cầu QC trước khi tính available, thì `available_quantity` giữ 0.0 cho đến khi QC set `status` = 'Accepted'.

---

### C. QC kiểm tra lô hàng (QCTests)
### D. Manager tạo Production Batch
Mục tiêu: Manager khởi tạo batch sản xuất mới, xác định sản phẩm đầu ra.
- Vai trò chính: Manager (tạo batch, xác định sản phẩm, batch size)
- Vai trò phụ: Operator (có thể đề xuất batch draft)

Hành động & trách nhiệm:
- Tạo record production_batches (INSERT): Manager
- Gán product_id, planned_qty, unit, ngày bắt đầu, trạng thái ban đầu = 'In Progress'
- Ghi nhận audit_logs

GHI:
- production_batches: INSERT
- audit_logs: INSERT

Ví dụ:
- production_batches: batch_code=batch-TBL-1001, product_id=MAT-VC-500, planned_qty=100000, status='In Progress'
### E. Operator thêm material vào Production Batch (BatchComponents)
Mục tiêu: Operator chọn các lô material, nhập số lượng sử dụng cho batch.
- Vai trò chính: Operator (chọn lô, nhập số lượng)
- Vai trò phụ: Manager (duyệt/kiểm tra)

Hành động & trách nhiệm:
- Tạo record batch_components (INSERT): Operator
- Gán inventory_lot_id, planned_quantity, actual_quantity (nếu có)
- Ghi nhận audit_logs

GHI:
- batch_components: INSERT
- audit_logs: INSERT

Ví dụ:
- batch_components: production_batch_id=batch-TBL-1001, inventory_lot_id=lot-VC-20260115, planned_quantity=50.0
### F. Manager thay đổi trạng thái Production Batch để tạo ra sản phẩm (material)
Mục tiêu: Manager xác nhận hoàn thành batch, hệ thống sinh ra sản phẩm mới (material/lô thành phẩm).
- Vai trò chính: Manager (xác nhận hoàn thành, chuyển trạng thái batch)
- Vai trò phụ: Operator (cập nhật số lượng thực tế)

Hành động & trách nhiệm:
- Cập nhật production_batches.status = 'Complete', produced_qty = actual
- Tạo inventory_lots mới cho thành phẩm
- Sinh inventory_transactions loại 'Usage' (trừ nguyên liệu) và 'Receipt' (nhập thành phẩm)
- Ghi nhận audit_logs

GHI/CẬP NHẬT:
- production_batches: UPDATE status, produced_qty
- inventory_lots: INSERT (thành phẩm)
- inventory_transactions: INSERT (Usage, Receipt)
- audit_logs: INSERT

Ví dụ:
- production_batches: status='Complete', produced_qty=100000
- inventory_lots: lot_code=lot-TBL-20260314, material_id=MAT-TBL-500, quantity=100000
- inventory_transactions: type='Usage', quantity=-50.0 (nguyên liệu); type='Receipt', quantity=100000 (thành phẩm)
Mục tiêu: thực hiện các phép thử trên `InventoryLot`; thay đổi trạng thái lot theo kết quả.
- Vai trò chính: Quality Control Technician (thực hiện test, verify kết quả, set status)
- Vai trò phụ: Manager (xem/duyệt các quyết định ngoại lệ), Operator (cung cấp mẫu / ghi nhận)

Hành động & trách nhiệm:
- Tạo công việc/record `qc_tests` (INSERT, status='Pending'): Operator (hoặc Hệ thống khi lot được nhận); QC Technician thực hiện test
- Thực hiện test và ghi kết quả (`qc_tests.test_results` update): QC Technician
- Xác nhận kết quả và update `qc_tests.status`: QC Technician
- Nếu pass: cập nhật `inventory_lots.status` = 'Accepted' (có thể cần Manager approve theo SOP)
- Nếu fail: cập nhật `inventory_lots.status` = 'Rejected', khởi tạo `inventory_transactions` (RETURN/ADJUSTMENT) tùy quyết định, Manager phê duyệt nếu cần
- Tạo Status label nếu cần: Operator hoặc hệ thống/IT Admin với in tự động
- Ghi `audit_logs` cho các hành động verify/approve

ĐỌC:
- `inventory_lots` (status, quantity)
- `qc_tests` (các test hiện tại)

GHI/CẬP NHẬT:
- `qc_tests`: INSERT per test; UPDATE on verify
- `inventory_lots.status`: UPDATE → 'Accepted' / 'Rejected' / 'On Hold'
- (tuỳ) `inventory_transactions`: INSERT RETURN/ADJUSTMENT
- (tuỳ) `labels`: INSERT Status label
- `audit_logs`: INSERT

Ví dụ (lot-VC-20260115):
- `qc_tests` created:
  - QC1: { id: qc-1, inventory_lot_id: lot-VC-20260115, test_type: 'Identity', test_results: { method: 'HPLC', result: 'Match' }, status: 'Pass', verified_by: 'qc_user_vn' }
  - QC2: { test_type: 'Assay', test_results: { assay_percent: 99.2 }, status: 'Pass' }
  - QC3: { test_type: 'LOD', test_results: { value: 0.3 }, status: 'Pass' }
  - QC4: { test_type: 'Impurities', test_results: { total_impurities: 0.05 }, status: 'Pass' }

Before → Action → After (status):
- `inventory_lots.status`: 'Quarantine' → (all QC Pass) → 'Accepted'

Nếu có test fail (ví dụ):
- `inventory_lots.status`: 'Quarantine' → (Assay 95.0% < spec 98.0%) → 'Rejected'
- Hệ thống thực hiện:
  - `inventory_transactions`: INSERT RETURN/ADJUSTMENT (có thể set quantity -60.0 hoặc điều chỉnh available về 0)
  - `labels`: INSERT Status label (TPL-STAT-01) ghi rõ lý do
  - `audit_logs`: ghi nhận hành động và lý do

Quy tắc nghiệp vụ gợi ý:
- Nếu `lot.status` != 'Accepted', chặn việc tiêu thụ cho ProductionBatch (không cho tạo USAGE hoặc không cho allocate BatchComponent).

---

### D. Tạo mẫu (Sample) từ InventoryLot (Split)
Mục tiêu: lấy một phần lot làm sample; ghi transaction và tạo sample lot
- Vai trò chính: Operator (tạo sample và transaction SPLIT)
- Vai trò phụ: Quality Control Technician (thực hiện test trên sample), Manager (duyệt mẫu đặc biệt), IT Administrator (quản lý template nhãn sample)

Hành động & trách nhiệm:
- Yêu cầu/duyệt lấy mẫu (tuỳ SOP): Operator yêu cầu, Manager duyệt nếu cần
- Tạo `InventoryLot` sample (INSERT với is_sample=true): Operator
- Tạo `InventoryTransaction` type='SPLIT' trên parent (negative quantity): Operator
- In nhãn Sample: Operator / IT Admin
- Thực hiện QCTest trên sample: QC Technician
- Ghi `audit_logs`

ĐỌC:
- `inventory_lots` (parent.available_quantity)

GHI/CẬP NHẬT:
- `inventory_lots`: INSERT sample; UPDATE parent.available_quantity khi split được xác nhận
- `inventory_transactions`: INSERT SPLIT (negative qty) cho parent
- `labels`: INSERT sample label
- `audit_logs`: INSERT

Ví dụ:
- Parent before: `inventory_lots.available_quantity` = 60.0
- Action: tạo sample 0.1 kg
  - `inventory_lots` (new sample): sample-VC-20260115-1 quantity=0.1, is_sample=true, parent_lot_id=lot-VC-20260115
  - `inventory_transactions`: INSERT { type: 'SPLIT', inventory_lot_id: lot-VC-20260115, quantity: -0.1 }
- After confirmation:
  - parent.available_quantity: 60.0 -> (SPLIT -0.1) -> 59.9

---

### E. Lập kế hoạch sản xuất (Create ProductionBatch & BatchComponents)
Mục tiêu: tạo lô sản xuất, gán nguồn nguyên liệu theo lot.
- Vai trò chính: Operator (tạo batch và components) hoặc Production Planner
- Vai trò phụ: Manager (duyệt kế hoạch), IT Administrator (tích hợp/ quản lý template batch)

Hành động & trách nhiệm:
- Tạo `production_batches` (INSERT): Operator / Planner
- Thêm `batch_components` (INSERT) liên kết lot nguyên liệu: Operator / Planner
- (Tuỳ) Reserve quantities: hệ thống thực hiện theo yêu cầu Operator/Planner; Manager duyệt các reserve lớn
- Ghi `audit_logs`

ĐỌC:
- `materials` (product)
- `inventory_lots` (available lots, quantities)

GHI/CẬP NHẬT:
- `production_batches`: INSERT
- `batch_components`: INSERT per component
- `audit_logs`: INSERT

Ví dụ (batch-TBL-1001):
- `production_batches` (new): { batch_code: 'batch-TBL-1001', product_id: 'PROD-VC-500', planned_qty: 100000, status: 'Planned' }
- `batch_components`: { production_batch_id: 'batch-TBL-1001', inventory_lot_id: 'lot-VC-20260115', planned_quantity: 50.0 }

Ghi chú: bước này thường không giảm `available_quantity` (chỉ ghi nhận/reserve). Nếu hệ thống hỗ trợ reservation:
- Option A: `inventory_lots.reserved_quantity`: 0 -> (reserve 50.0) -> 50.0; `inventory_lots.available_quantity`: 60.0 -> 10.0 (logical)
- Option B: không reserve; cập nhật khi thực tế tiêu thụ.

---

### F. Tiêu thụ nguyên liệu cho sản xuất (Usage / Consume)
Mục tiêu: khi thực sự dùng nguyên liệu, ghi transaction USAGE và cập nhật actual quantity trong BatchComponent
- Vai trò chính: Operator (thực hiện tiêu thụ trong sản xuất)
- Vai trò phụ: Manager (duyệt trường hợp vượt tiêu thụ), Quality Control Technician (đảm bảo lot là Accepted trước khi tiêu thụ)

Hành động & trách nhiệm:
- Kiểm tra `lot.status` = 'Accepted' trước khi tiêu thụ: Hệ thống check; QC/Operator có thể xác nhận
- Tạo `inventory_transactions` type='USAGE' (INSERT negative qty) cho mỗi lot tiêu thụ: Operator
- Cập nhật `batch_components.actual_quantity`: Operator / System
- Nếu tiêu thụ vượt kế hoạch hoặc vượt tồn, báo lỗi và gửi Manager duyệt
- Ghi `audit_logs`

ĐỌC:
- `inventory_lots` (available_quantity)
- `batch_components` (planned)

GHI/CẬP NHẬT:
- `inventory_transactions`: INSERT USAGE (negative qty)
- `batch_components.actual_quantity`: UPDATE
- `inventory_lots.available_quantity`: UPDATE after confirmation
- `audit_logs`: INSERT

Ví dụ (usage for batch-TBL-1001):
- Trước:
  - `inventory_lots.available_quantity` (lot-VC-20260115): 60.0
  - `batch_components.actual_quantity`: 0
- Hành động: tạo `inventory_transactions` USAGE -50.0
  - `inventory_transactions`: INSERT { id: tx-usage-1, inventory_lot_id: 'lot-VC-20260115', type: 'USAGE', quantity: -50.0, reference_id: 'batch-TBL-1001', performed_by: 'operator_prod1', status: 'Confirmed' }
  - `batch_components.actual_quantity`: 0 -> (apply) -> 50.0
  - `inventory_lots.available_quantity`: 60.0 -> (USAGE -50.0) -> 10.0

Trường hợp biên:
- Nếu `available_quantity` < lượng cần dùng, chặn hoặc thực hiện partial consume + allocate từ lots khác (FEFO/expiry logic)
- Nếu tiêu thụ từ nhiều lots, tạo nhiều `USAGE` transaction tương ứng

---

### G. Hoàn tất lô sản xuất (Complete ProductionBatch) → Tạo Finished InventoryLot(s) + Labels
Mục tiêu: khi batch complete, tạo lot thành phẩm, in nhãn và lưu produced_qty
- Vai trò chính: Operator (hoàn tất batch, tạo finished lot và nhãn)
- Vai trò phụ: Manager (xem xét), IT Administrator (quản lý in nhãn)

Hành động & trách nhiệm:
- Đánh dấu `production_batches.status` = 'Complete' (UPDATE): Operator/Supervisor
- Ghi `produced_qty` và `finished_at`: Operator
- Tạo finished `inventory_lots`: Operator/System
- Tạo nhãn Finished Product (labels INSERT): Operator / IT Administrator
- Ghi `audit_logs`

ĐỌC:
- `production_batches`, `batch_components`

GHI/CẬP NHẬT:
- `production_batches.status`: UPDATE -> 'Complete'
- `production_batches.produced_qty`: UPDATE
- `inventory_lots`: INSERT finished lot(s) với `production_batch_id`
- `labels`: INSERT finished product labels
- `audit_logs`: INSERT

Ví dụ:
- `production_batches.status`: 'Planned' -> (complete) -> 'Complete'
- `produced_qty`: 0 -> (set) -> 100000
- `inventory_lots` (finished): finished-lot-TBL-1001 { material_id: 'PROD-VC-500', quantity: 100000, production_batch_id: 'batch-TBL-1001', status: 'Available' }
- `labels`: tạo bằng `TPL-FIN-01` với các trường batch_number='batch-TBL-1001', product_name='Vitamin C 500 mg tablet', manufacture_date, expiry_date, batch_size=100000

---

### H. Điều chỉnh tồn kho / Trả hàng (Adjustment / Return)
Mục tiêu: khi có chênh lệch kiểm kê hoặc trả hàng, ghi ADJUSTMENT/RETURN
- Vai trò chính: Operator (ghi nhận adjustment/return)
- Vai trò phụ: Manager (duyệt), IT Administrator (giám sát hệ thống)

Hành động & trách nhiệm:
- Tạo `inventory_transactions` type='ADJUSTMENT'/'RETURN' (INSERT, có thể status='Pending'): Operator
- Manager duyệt (cập nhật `inventory_transactions.status` -> 'Confirmed'): Manager
- Áp dụng thay đổi lên `inventory_lots.available_quantity`: Hệ thống sau khi duyệt
- Tạo nhãn/thông báo nếu cần: Operator / IT Administrator
- Ghi `audit_logs`

ĐỌC:
- `inventory_lots`, `inventory_transactions`

GHI/CẬP NHẬT:
- `inventory_transactions`: INSERT ADJUSTMENT/RETURN
- `inventory_lots.available_quantity`: UPDATE sau khi duyệt
- `audit_logs`: INSERT

Ví dụ:
- `inventory_lots.available_quantity`: 10.0 -> (ADJUSTMENT -1.5) -> 8.5
- `inventory_transactions`: INSERT { type: 'ADJUSTMENT', quantity: -1.5, reason: 'count discrepancy' }

Approval flow:
- ADJUSTMENT có thể được tạo với status='Pending' và cần Manager phê duyệt → khi Approved set status='Confirmed' và áp dụng lên `inventory_lots.available_quantity`.

---

### I. Thay đổi trạng thái lot (Status change) và nhãn trạng thái
Mục tiêu: quản lý trạng thái lot và in Status label khi status thay đổi
- Vai trò chính: Quality Control Technician (thay đổi status dựa trên kết quả QC)
- Vai trò phụ: Manager (xem/override), Operator (được thông báo)

Hành động & trách nhiệm:
- Cập nhật `inventory_lots.status` (Accepted/Rejected/On Hold): Quality Control Technician (Manager có thể override)
- Nếu Rejected, tạo `RETURN`/`ADJUSTMENT`: Operator tạo, Manager phê duyệt
- Tạo Status label (labels INSERT): Operator / IT Administrator
- Ghi `audit_logs`

ĐỌC:
- `qc_tests`, `inventory_lots`

GHI/CẬP NHẬT:
- `inventory_lots.status`: UPDATE
- `labels`: optionally INSERT Status label (TPL-STAT-01)
- `inventory_transactions`: possibly INSERT adjustments/returns
- `audit_logs`: INSERT

Ví dụ:
- `inventory_lots.status`: 'Quarantine' -> (QC pass) -> 'Accepted'
- Nếu fail: 'Quarantine' -> (QC fail) -> 'Rejected' -> tạo RETURN tx
- `labels`: INSERT { template_id: 'TPL-STAT-01', inventory_lot_id: 'lot-VC-20260115', rendered_content: 'Rejected - reason: assay 95.0% < spec' }

---

### J. Truy vết (Traceability) — read-only flows
Mục tiêu: cho phép truy vết nguồn gốc nguyên liệu cho lô thành phẩm
- Vai trò chính: Manager (xem báo cáo), Quality Control Technician (điều tra), Operator (tra cứu vận hành), IT Administrator (cung cấp công cụ)

Hành động & trách nhiệm:
- Chạy truy vấn trace từ `production_batches` -> `batch_components` -> `inventory_lots` -> `inventory_transactions` & `qc_tests`: Manager / QC / Operator qua UI
- Xuất báo cáo hoặc kích hoạt điều tra: Manager / QC
- Audit việc truy cập (nếu nhạy cảm): IT Administrator

---

### K. Audit logging (central)
Mọi action quan trọng phải INSERT record vào `audit_logs`: { user_id, action, entity_type, entity_id, details, timestamp }
- Ai ghi audit logs: Hệ thống tự động ghi cho các action do Operator, QC, Manager, IT Administrator thực hiện
- Ai xem audit logs: Manager và IT Administrator thường xuyên xem để phục vụ kiểm toán và điều tra

---

## 5. Action → Role mapping (quick reference)
| Action | Responsible role(s) |
|---|---|
| Create Material | Manager (vai trò chính), Operator (draft) |
| Receive Lot / Create InventoryLot | Operator (vai trò chính) |
| Create Receipt Transaction | Operator |
| Generate Raw Material Label | Operator (in tự động do IT Admin quản lý khi có hệ thống) |
| Create QCTest task | System / Operator (khởi tạo) |
| Execute & Verify QCTest | Quality Control Technician (vai trò chính) |
| Set Lot Status (Accepted/Rejected) | Quality Control Technician (vai trò chính), Manager (override) |
| Create Sample / SPLIT | Operator |
| Create ProductionBatch | Operator / Production Planner |
| Add BatchComponent | Operator / Planner |
| Reserve Quantity | System (khởi tạo bởi Operator), Manager duyệt các reserve lớn |
| Create USAGE Transaction | Operator (vai trò chính) |
| Apply Inventory Adjustment | Operator (khởi tạo), Manager (phê duyệt) |
| Complete Production Batch | Operator (vai trò chính), Manager (xem/duyệt) |
| Generate Finished Product Label | Operator / IT Administrator |
| Manage LabelTemplates | IT Administrator |
| Review / Run Reports & Trace | Manager / QC / Operator |
| Audit Log Review | Manager / IT Administrator |

---

## 6. Recommendations for implementation details
- Dùng transaction (ràng buộc giao dịch) cho các thao tác đa bước: ví dụ tạo lot + receipt tx + labels nên là atomic.
- Phân biệt `recorded` vs `available` quantity: ghi nhận receipt transaction, rồi chỉ set available khi QC pass (nếu policy yêu cầu). Xem xét các trường: `received_quantity`, `available_quantity`, `reserved_quantity`.
- Logic reserve cho production planning: thêm `reserved_quantity` trên `inventory_lots` hoặc bảng reservations riêng để tránh double allocation.
- Lưu kết quả QC dưới dạng JSON trong `qc_tests.test_results` để phục vụ báo cáo.
- Render label: lưu `template_content` và lưu kết quả render trong `labels.rendered_content` để audit.
- Workflow phê duyệt: ADJUSTMENT và RETURN nên có trạng thái (Pending -> Approved -> Applied).
