# QC_details.md — Chi tiết Module Quality Control

> Tài liệu phân tích module **Quality Control Technician** của hệ thống PharmaWMS, dựa trên Product Backlog, Domain Model, Workflow và source code giao diện hiện có.

---

## 1. Tổng quan Module

Module QC (Quality Control) thuộc hệ thống PharmaWMS cung cấp bộ công cụ cho vai trò **Quality Control Technician** để kiểm soát chất lượng toàn bộ vòng đời hàng hóa trong kho dược phẩm — từ lúc nhận hàng đầu vào, kiểm định thành phẩm, giám sát tồn kho, cho đến truy xuất nguồn gốc và báo cáo nhà cung cấp.

### Điều hướng sidebar (5 mục)

| Mục điều hướng            | Component file          | Chức năng chính                              |
| :------------------------ | :---------------------- | :------------------------------------------- |
| Dashboard                 | `Dashboard.tsx`         | Tổng quan KPI & cảnh báo chất lượng          |
| Kiểm soát đầu vào         | `PendingBatch.tsx`      | Kiểm định lô nguyên liệu chờ nhập kho        |
| Kiểm định sản phẩm        | `Products.tsx`          | Kiểm định lô thành phẩm (ProductionBatch)    |
| Kiểm định tồn kho         | `InventoryQA.tsx`       | Quản lý chất lượng hàng đang lưu kho         |
| Báo cáo & Truy vết        | `Traceability.tsx`      | Truy xuất lịch sử lô & hiệu suất nhà cung cấp|

---

## 2. User Stories theo Product Backlog

| ID     | Phát biểu yêu cầu                                                                       | Ưu tiên | Màn hình liên quan               |
| :----- | :-------------------------------------------------------------------------------------- | :------ | :------------------------------- |
| US-QC01 | Đánh giá các lô hàng chờ nhập để quyết định hàng có đủ tiêu chuẩn nhập kho hay không  | **P0**  | PendingBatch                     |
| US-QC02 | Xử lý lô hàng không đạt chuẩn (Rejected): nhập lý do, upload ảnh bằng chứng           | **P0**  | PendingBatch (modal Reject)      |
| US-QC03 | Nhận cảnh báo và thực hiện tái kiểm tra định kỳ (Re-test) hàng đang lưu kho            | **P1**  | InventoryQA (tab Alert)          |
| US-QC04 | Cách ly hàng hóa (Quarantine) hàng loạt khi xảy ra sự cố môi trường kho               | **P1**  | InventoryQA (tab Quarantine)     |
| US-QC05 | Truy xuất nguồn gốc & vòng đời chất lượng lô hàng, xuất COA (PDF)                     | **P1**  | Traceability (tab History)       |
| US-QC06 | Xem báo cáo hiệu suất nhà cung cấp, lọc theo thời gian                                 | **P2**  | Traceability (tab Supplier)      |

---

## 3. Chi tiết từng chức năng

---

### 3.1 Dashboard — Bảng điều khiển

**Mục tiêu:** Cung cấp cái nhìn tổng quan tức thời về tình trạng chất lượng trong ngày/tháng.

#### 3.1.1 KPI Cards (4 thẻ số liệu)

| Thẻ                         | Giá trị mẫu | Icon         | Màu sắc     | Ghi chú                            |
| :-------------------------- | :---------- | :----------- | :---------- | :--------------------------------- |
| Chờ lấy mẫu                 | 12          | Clock        | Amber       | Yêu cầu mới từ Inbound             |
| Đạt chuẩn (Approved)        | 145         | CheckCircle  | Emerald     | Trong tháng này                    |
| Từ chối (Rejected)          | 08          | XCircle      | Red         | Cần lập biên bản lỗi               |
| Tỷ lệ lỗi trung bình        | 1.2%        | ShieldAlert  | Blue        | Giảm 0.4% so với tháng trước       |

#### 3.1.2 Bảng lô hàng chờ kiểm định

- Cột: Mã lô / Sản phẩm, Nhà cung cấp, Số lượng, Mức độ ưu tiên (HIGH / NORMAL), Thao tác
- Hiển thị 3 lô mới nhất, có link "Xem tất cả yêu cầu"
- Nút **"LẤY MẪU NGAY"** → điều hướng sang PendingBatch

#### 3.1.3 Cảnh báo chất lượng (panel phải)

- Card cảnh báo đỏ: hiện thông tin NCC cần tái đánh giá (ví dụ: "Mekophar có 3 lô bị từ chối liên tiếp")
- Card tối: Link nhanh "Báo cáo & Truy vết" → `Traceability`
- Card xanh nhạt: Lời nhắc quy trình lấy mẫu

---

### 3.2 PendingBatch — Kiểm định lô hàng đầu vào

**Mục tiêu:** QC tiến hành kiểm nghiệm các lô nguyên liệu (InventoryLot) vừa được nhận từ nhà cung cấp, đưa ra quyết định Approve / Reject / Hold, gán nhãn và cập nhật trạng thái lô.

**Liên kết domain:** `InventoryLots` → `QCTests` → cập nhật `inventory_lots.status`

#### 3.2.1 Bộ lọc & Tìm kiếm

| Thành phần    | Mô tả                                                                        |
| :------------ | :--------------------------------------------------------------------------- |
| Search input  | Tìm kiếm theo mã lô hoặc tên thuốc                                           |
| Status filter | Dropdown: Đang chờ (Pending) / Đã duyệt (Approved) / Đã từ chối (Rejected) / Tạm giữ (Hold) / Tất cả |

#### 3.2.2 Danh sách lô hàng

Bảng hiển thị: Mã lô | Tên nguyên liệu | Nhà cung cấp | Trạng thái (badge) | Nút "Tiến hành kiểm định"

**Trạng thái badge:**
- `pending` → Vàng
- `approved` → Xanh lá
- `rejected` → Đỏ
- `hold` → Xám/Tím

#### 3.2.3 Modal: Tiến hành kiểm định lô

Modal 2-phần (dark header + scrollable body):

**Phần thông tin Spec (chỉ đọc):**
- Số lượng lô
- Tiêu chuẩn kỹ thuật (Target Specs): Độ ẩm ≤ X% | Tinh khiết ≥ Y%

**Phần 1 — Nhập kết quả phân tích thực tế:**

| Field          | Loại input | Validation                                        |
| :------------- | :--------- | :------------------------------------------------ |
| Độ ẩm (%)      | number     | Cảnh báo nếu vượt ngưỡng spec                    |
| Tinh khiết (%) | number     | Cảnh báo nếu thấp hơn ngưỡng spec                |
| Cảm quan       | select     | Đạt chuẩn / Không đạt / Cần kiểm tra thêm        |

- **Auto-check:** Nếu `moisture > spec.moisture` hoặc `purity < spec.purity` → hiện banner cảnh báo đỏ: "CẢNH BÁO: KẾT QUẢ NẰM NGOÀI PHẠM VI CHO PHÉP!"
- `isAutoPass` = `moisture ≤ spec.moisture && purity ≥ spec.purity`

**Phần 2 — Quyết định & Gán nhãn hệ thống:**

| Field                           | Loại       | Ghi chú                                               |
| :------------------------------ | :--------- | :---------------------------------------------------- |
| Quyết định trạng thái lô hàng   | select     | --Chọn quyết định-- / APPROVE / REJECT / HOLD         |
| Chọn nhãn cho lô hàng (Labeling)| select     | --Chọn nhãn--                                         |

**Điều kiện bổ sung khi chọn REJECT:**
- Hiện thêm field: **"Nhập lý do từ chối (bắt buộc)"** — Textarea placeholder: "VD: Độ ẩm vượt ngưỡng cho phép 0.5%, có mùi lạ..."
- Hiện nút: **"Tải ảnh bằng chứng kiểm nghiệm"** — upload file ảnh/video

**Nút hành động:**
- `Hủy bỏ` → đóng modal
- `XÁC NHẬN & CẬP NHẬT HỆ THỐNG` → gọi `handleFinalSubmit()`

**Validation khi submit:**
1. Phải chọn `decision`
2. Phải chọn `label`
3. Nếu `decision === "rejected"` → phải có `rejectReason`

**Kết quả sau submit:** Cập nhật `batches[id].status` → giá trị `decision`

---

### 3.3 Products — Kiểm định lô thành phẩm

**Mục tiêu:** QC kiểm định các `ProductionBatch` (lô thành phẩm đã sản xuất xong) trước khi đưa vào kho thương mại. Sau khi duyệt, hệ thống tự động tạo bản ghi trong `InventoryLots`.

**Liên kết domain:** `ProductionBatches` → `QCTests` → tạo `InventoryLots`

#### 3.3.1 Thanh tìm kiếm & Thống kê nhanh

- Search bằng Batch Number
- Nút Bộ lọc
- Card xanh hiển thị: số lô đang chờ xử lý (dynamic)

#### 3.3.2 Danh sách ProductionBatch

Bảng: Mã lô sản xuất | Tên sản phẩm (+ Product ID) | Số lượng SX | Ngày sản xuất | Nút "Tiến hành kiểm định"

**Mock data mẫu:**
- PB-2026-001 — Paracetamol 500mg — 10,000 Vỉ — 2026-02-01
- PB-2026-002 — Decolgen Forte — 5,000 Hộp — 2026-02-01

#### 3.3.3 Modal: Quy trình kiểm định lô (3-phần)

**Header:** "QUY TRÌNH KIỂM ĐỊNH LÔ: [batch_number]" — icon FlaskConical

**Phần thông tin lô (chỉ đọc):**
- Sản phẩm | Số lượng kiểm mẫu | Ngày sản xuất

**Phần 1 — Kết quả phân tích thí nghiệm:**

| Field                | Loại   | Options                                         |
| :------------------- | :----- | :---------------------------------------------- |
| Độ tinh khiết (%)    | number | —                                               |
| Vi sinh vật          | select | Âm tính (Âm tính) / Dương tính (Cảnh báo)      |
| Cảm quan thành phẩm  | select | Đạt tiêu chuẩn / Không đạt (Lỗi màu)           |

**Phần 2 — Đánh giá cuối & Phân loại nhãn:**

| Field                            | Loại   | Style động                                              |
| :------------------------------- | :----- | :------------------------------------------------------ |
| Quyết định trạng thái (Decision) | select | approved → xanh lá / rejected → đỏ / hold → amber      |
| Gán nhãn sản phẩm (Labeling)     | select | —                                                       |

- Note info: "Hệ thống sẽ tự động ghi nhận Metadata cho InventoryLots bao gồm: Trạng thái, Nhãn dán và kết quả phân tích kỹ thuật sau khi bạn nhấn lưu."

**Nút hành động:**
- `Quay lại` → đóng modal
- `HOÀN TẤT KIỂM ĐỊNH` → `handleFinalSubmit()`

**Kết quả sau submit:** Lô được xóa khỏi danh sách chờ, hệ thống sinh bản ghi `InventoryLots`.

---

### 3.4 InventoryQA — Kiểm soát chất lượng tồn kho

**Mục tiêu:** Giám sát chất lượng các hàng đang lưu kho — xử lý hàng sắp hết hạn, hàng cần tái kiểm tra, và cách ly hàng loạt khi có sự cố.

**Liên kết domain:** `InventoryLots` (status: near-expiry, retest, quarantine)

#### Tab 1: Cảnh báo chất lượng (Quality Alert)

**Danh sách hàng sắp hết hạn / Tái kiểm tra:**

Mỗi item hiển thị:
- Tên sản phẩm + Badge trạng thái (`Near Expiry` vàng / `Retest Due` tím)
- Mã sản phẩm (Lock icon) | Vị trí kho (MapPin icon) | Ngày hết hạn (Calendar icon)
- Nút **"Thực hiện Re-test"** (icon RefreshCw)

**Mock data:**
| ID   | Tên hàng          | Batch    | Vị trí  | Hạn SD     | Trạng thái   |
| :--- | :---------------- | :------- | :------ | :--------- | :----------- |
| P001 | Paracetamol 500mg | LOT-001  | Kho A-1 | 2026-03-01 | near-expiry  |
| P002 | Vitamin C 1000mg  | LOT-005  | Kho B-3 | 2026-02-15 | retest       |

**Modal: Kết quả tái kiểm định (Re-test Decision)**

Card thông tin lô (item ID + tên + vị trí hiện tại):

2 nút quyết định:
- **GIA HẠN (Extend)** — xanh lá: Cập nhật HSD mới (extend expiryDate → "2027-03-01", status → "normal")
- **HỦY BỎ (Discard)** — đỏ: Hàng đã hỏng/hết hạn (status → "retest" hoặc disposal)

Nút `Đóng` để thoát không hành động.

#### Tab 2: Cách ly hàng hóa (Quarantine)

**Bulk Quarantine:**
- Search theo khu vực (Ví dụ: "Kho A-1")
- Nút Bộ lọc
- Nút **"Cách ly hàng loạt (N)"** → active khi có item được chọn, disabled + xám khi không có

**Bảng danh sách:**
- Checkbox chọn từng item (hoặc chọn tất cả header)
- Cột: Lô hàng / Tên hàng | Vị trí Bin | Trạng thái (badge)

**Logic `handleBulkQuarantine()`:**
- Validate có item được chọn
- Cập nhật tất cả `selectedItems` → `status: "quarantine"`
- Alert: "Đã chuyển N lô hàng sang trạng thái Quarantine. Hệ thống đã tạm khóa xuất kho."
- **Nghiệp vụ:** Hàng Quarantine bị chặn mọi lệnh lấy hàng (Picking) và điều chuyển (Transfer)

---

### 3.5 Traceability — Báo cáo & Truy vết

**Mục tiêu:** Truy xuất toàn bộ lịch sử của một lô hàng (timeline từ nhập kho đến hiện tại) và phân tích hiệu suất chất lượng theo từng nhà cung cấp.

#### Tab 1: Truy xuất lô hàng (Batch History)

**Tìm kiếm:**
- Search input: tìm theo mã lô hoặc tên hàng
- Nút **"Quét mã QR"** (icon QrCode) — hỗ trợ scan nhanh

**Grid lô hàng (3 cột):**

Mỗi card hiển thị:
- Icon Package (xanh)
- Badge trạng thái: `Active` xanh lá / `Rejected` đỏ
- Tên sản phẩm + ID
- Nút **"Xem Timeline"** (icon Eye)

**Mock data:**
| ID   | Tên hàng          | Nhà CC         | Ngày nhập  | Trạng thái |
| :--- | :---------------- | :------------- | :--------- | :--------- |
| B001 | Paracetamol 500mg | Dược Hậu Giang | 15/01/2026 | Active     |
| B002 | Amoxicillin 250mg | Mekophar       | 18/01/2026 | Rejected   |

**Modal: Lịch sử lô hàng (Timeline)**

Header tối: "Lịch sử lô hàng — [ID] - [Tên sản phẩm]"

Timeline dọc (mỗi bước có dot tròn xanh / xám nếu pending):

| Thời gian            | Sự kiện                                  | Thực hiện bởi |
| :------------------- | :--------------------------------------- | :------------ |
| 15/01/2026 - 08:30   | Ngày nhập kho (Inbound)                  | Operator A    |
| 15/01/2026 - 10:00   | QC lấy mẫu kiểm tra                     | John123       |
| 15/01/2026 - 14:00   | Kết quả test: Đạt chuẩn (Độ ẩm 4.2%)   | John123       |
| 15/01/2026 - 15:30   | Ngày duyệt nhập kho                      | Manager A     |
| 25/01/2026 - 09:00   | Tái kiểm tra định kỳ (Re-test Date)     | John123       |

- Bước `status: "pending"` hiển thị dot xám (chưa xảy ra)
- Nút **"Xuất COA (PDF)"** (đỏ, full-width) — xuất Certificate of Analysis
- Nút `Đóng`

#### Tab 2: Hiệu suất Nhà cung cấp (Supplier Performance)

**Header + Công cụ:**
- Tiêu đề: "Tỷ lệ đạt chuẩn theo Nhà cung cấp"
- Dropdown lọc thời gian: Tháng 1/2026 / Quý 4/2025 / Cả năm 2025
- Nút **"Xuất báo cáo"** (xanh lá, icon Download)

**3 KPI Summary cards:**
- Nhà cung cấp ổn định nhất: Traphaco (98.9%) — TrendingUp xanh
- Cảnh báo chất lượng: Mekophar (17.7% tỷ lệ lỗi) — TrendingDown đỏ
- Tổng số lô hàng kiểm định: 360 (tăng 12%)

**Bảng nhà cung cấp:**

Cột: Nhà cung cấp (+ ngày giao cuối) | Tổng Batch | Approved | Rejected | Chỉ số chất lượng (progress bar + %) | Thao tác

**Progress bar màu:**
- `qualityRate > 90%` → Xanh lá
- `qualityRate > 85%` → Vàng
- `qualityRate ≤ 85%` → Đỏ

**Mock data nhà cung cấp:**
| Nhà CC           | Tổng | Approved | Rejected | Tỷ lệ |
| :--------------- | :--- | :------- | :------- | :----- |
| Dược Hậu Giang   | 120  | 118      | 2        | 98.3%  |
| Mekophar         | 85   | 70       | 15       | 82.3%  |
| Traphaco         | 95   | 94       | 1        | 98.9%  |
| Sanofi Việt Nam  | 60   | 59       | 1        | 98.3%  |

**Nút "Chi tiết lỗi" cho từng nhà cung cấp:**

Modal: "Chi tiết lỗi: [Tên NCC]" — Header đỏ, hiển thị tổng số lô bị từ chối.

Mỗi rejected lot card:
- Badge mã lô (ví dụ: "LÔ HÀNG: B099") + Ngày
- Lý do từ chối (text)
- Bằng chứng hình ảnh (image placeholder)
- Mức độ: **Cao** (đỏ) / **Trung bình** (cam)

Nút `Đóng cửa sổ`

---

## 4. Data Model liên quan

### Entities chính

| Entity              | Các trường quan trọng cho QC                                                                               |
| :------------------ | :--------------------------------------------------------------------------------------------------------- |
| `InventoryLots`     | `id`, `lot_code`, `material_id`, `quantity`, `available_quantity`, `status` (Quarantine/Accepted/Rejected), `expiry_date`, `is_sample`, `parent_lot_id` |
| `QCTests`           | `id`, `inventory_lot_id`, `test_type`, `test_results` (JSON), `status` (Pass/Fail/Pending), `verified_by`, `verified_at` |
| `ProductionBatches` | `id`, `batch_code`, `product_id`, `planned_qty`, `produced_qty`, `status`, `mfg_date`, `expiry_date`      |
| `Labels`            | `id`, `template_id`, `inventory_lot_id`, `production_batch_id`, `rendered_content`, `barcode_value`       |
| `AuditLogs`         | `id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `timestamp`                             |

### Các loại QCTest hỗ trợ

- Identity (kiểm tra định danh)
- Potency / Assay (hàm lượng)
- Microbial (vi sinh vật)
- Growth Promotion
- Physical (cảm quan, ngoại quan)
- Chemical (hóa học: LOD, tạp chất, pH...)

### Trạng thái InventoryLot (vòng đời)

```
Nhập kho → [Quarantine] → QC Pass → [Accepted] → Sử dụng → [Depleted]
                       ↘ QC Fail → [Rejected]
                       ↘ Sự cố kho → [Quarantine] (bulk action)
```

---

## 5. Luồng nghiệp vụ (Workflow) QC

### Workflow A: Kiểm định lô nguyên liệu đầu vào

```
Operator nhận hàng (Inbound)
    → InventoryLot.status = "Quarantine"
    → QC nhận thông báo "Lô hàng chờ lấy mẫu"
    → QC tiến hành kiểm định (PendingBatch modal):
        - Nhập kết quả: Độ ẩm, Tinh khiết, Cảm quan
        - Hệ thống auto-check vs Target Specs
        - QC chọn Decision + Nhãn
    → Nếu APPROVED:
        - inventory_lots.status → "Accepted"
        - Operator có thể thực hiện Put-away
    → Nếu REJECTED:
        - Nhập lý do + upload bằng chứng (bắt buộc)
        - inventory_lots.status → "Rejected"
        - Tự động khởi tạo Return Request gửi Manager
        - Hard-lock: không cho di chuyển vào khu vực thương mại
    → Nếu HOLD:
        - inventory_lots.status → "Hold" (chờ xử lý thêm)
```

### Workflow B: Kiểm định lô thành phẩm

```
Sản xuất hoàn thành (ProductionBatch.status = "Complete")
    → QC nhận batch vào màn hình Products
    → QC tiến hành kiểm định:
        - Nhập: Độ tinh khiết, Vi sinh vật, Cảm quan thành phẩm
        - Chọn Decision + Nhãn sản phẩm
    → Khi HOÀN TẤT:
        - Hệ thống tự động tạo InventoryLot cho thành phẩm
        - Metadata: Trạng thái, Nhãn, Kết quả phân tích được lưu
```

### Workflow C: Tái kiểm tra định kỳ (Re-test)

```
Hệ thống cảnh báo khi:
    - inventory_lots.expiry_date sắp đến (Near Expiry)
    - inventory_lots.retest_date đã đến hạn
    → Hiển thị trong InventoryQA tab "Cảnh báo chất lượng"
    → QC nhấn "Thực hiện Re-test"
    → Modal quyết định:
        - GIA HẠN (Extend): cập nhật HSD mới, status → "normal"
        - HỦY BỎ (Discard): tạo phiếu tiêu hủy, status → "disposal"
```

### Workflow D: Cách ly hàng hóa (Quarantine)

```
Xảy ra sự cố môi trường kho (nhiệt độ, độ ẩm bất thường...)
    → QC vào tab Quarantine (InventoryQA)
    → Tìm kiếm theo khu vực (Zone/Bin)
    → Checkbox chọn hàng loạt các lô liên quan
    → Nhấn "Cách ly hàng loạt"
    → Tất cả item selected → status: "quarantine"
    → Hệ thống khóa: chặn Picking + Transfer lệnh
    → Ghi nhật ký sự cố vào audit_logs
```

### Workflow E: Truy xuất nguồn gốc & Xuất COA

```
Yêu cầu truy xuất theo lô (thanh tra, kiểm toán, khiếu nại)
    → QC vào Traceability
    → Tìm theo Mã lô / Tên hàng hoặc Quét QR Code
    → Mở Timeline lô hàng (toàn bộ lịch sử từ nhập kho)
    → Nhấn "Xuất COA (PDF)"
    → Thời gian truy xuất yêu cầu < 3 giây
```

---

## 6. Các quy tắc nghiệp vụ quan trọng

| Quy tắc                          | Mô tả                                                                                            |
| :------------------------------- | :----------------------------------------------------------------------------------------------- |
| **Khóa nhập kho**                | Lô `Quarantine` chưa được QC duyệt → Operator không thể thực hiện Put-away                      |
| **Bắt buộc lý do từ chối**       | Decision = Rejected → trường `rejectReason` bắt buộc điền, không được để trống                  |
| **Hard-lock hàng Rejected**      | Hàng Rejected bị khóa cứng, không cho phép di chuyển vào khu vực kho thương mại                 |
| **Hard-lock hàng Quarantine**    | Hàng Quarantine bị chặn mọi lệnh Picking và Transfer                                            |
| **Cảnh báo out-of-spec**         | Khi giá trị nhập vượt ngưỡng spec → hiện banner đỏ CẢNH BÁO ngay lập tức (client-side validate) |
| **Bắt buộc chọn nhãn**          | Phải chọn Label trước khi submit quyết định kiểm định                                            |
| **Auto tạo InventoryLot**       | Sau khi duyệt ProductionBatch → hệ thống tự tạo bản ghi InventoryLot cho thành phẩm             |
| **Audit Trail**                  | Mọi hành động QC (verify, approve, reject) đều ghi vào `audit_logs`                             |
| **Xuất COA**                     | Được xuất dưới dạng PDF từ dữ liệu QCTests đã được verify                                       |

---

## 7. Trạng thái & Màu sắc chuẩn UI

| Trạng thái   | Màu badge          | Ý nghĩa                              |
| :----------- | :----------------- | :----------------------------------- |
| Pending      | Vàng (yellow)      | Đang chờ QC xử lý                   |
| Approved     | Xanh lá (green)    | Đạt chuẩn, được nhập kho            |
| Rejected     | Đỏ (red)           | Không đạt chuẩn, cần trả nhà cung cấp |
| Hold         | Xám / Tím          | Tạm giữ, chờ xử lý thêm            |
| Quarantine   | Đỏ đậm             | Bị cách ly, khóa mọi thao tác       |
| Near Expiry  | Vàng cam (amber)   | Cảnh báo sắp hết hạn                |
| Retest Due   | Tím (purple)       | Đến hạn tái kiểm tra                |
| Active       | Xanh lá nhạt       | Đang trong kho, bình thường         |

---

## 8. Cấu trúc file source code

```
src/app/pages/QualityControl/
├── Dashboard.tsx       — KPI Dashboard, bảng lô chờ, cảnh báo chất lượng
├── PendingBatch.tsx    — Kiểm định lô nguyên liệu đầu vào (Input QC)
├── Products.tsx        — Kiểm định lô thành phẩm (Finished Product QC)
├── InventoryQA.tsx     — Kiểm soát tồn kho: Re-test + Quarantine
└── Traceability.tsx    — Truy xuất lô hàng + Báo cáo hiệu suất NCC
```

---

*Tài liệu được tổng hợp từ: `04_Product Backlog.md`, `02_Domain Model.md`, `Workflow.md`, và source code `src/app/pages/QualityControl/`.*
