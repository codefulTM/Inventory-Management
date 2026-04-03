# QC List Pagination Audit

Ngày kiểm tra: 2026-04-03
Phạm vi: các màn hình QC hiển thị danh sách trong frontend + API backend liên quan phân trang.

## Màn hình đã kiểm tra
- frontend/src/pages/qc/DashboardQC.tsx
- frontend/src/pages/qc/InboundControl.tsx
- frontend/src/pages/qc/InventoryQC.tsx
- frontend/src/pages/qc/ProductInspection.tsx
- frontend/src/pages/qc/ReportTraceability.tsx
- frontend/src/pages/qc/BarcodeOperations.tsx

## Kết luận nhanh
Đang có lỗi đúng như mô tả: nhiều màn hình QC hiển thị danh sách theo dữ liệu từ API có phân trang mặc định, nhưng frontend không có state page/limit và không có nút điều hướng trang. Kết quả là người dùng chỉ thấy một phần dữ liệu (thường là trang đầu), dễ hiểu nhầm rằng danh sách đã đầy đủ.

## Bằng chứng chính

### 1) Inventory lots: backend phân trang mặc định, frontend không điều hướng
- Backend endpoint có page/limit mặc định:
  - backend/src/inventory-lot/inventory-lot.controller.ts:45
  - backend/src/inventory-lot/inventory-lot.controller.ts:47
  - backend/src/inventory-lot/inventory-lot.controller.ts:48
- Frontend gọi API inventory lots nhưng không truyền page/limit và chỉ nhận list:
  - frontend/src/services/qcServices.ts:59
  - frontend/src/services/qcServices.ts:61
  - frontend/src/services/qcServices.ts:69
- Màn hình bị ảnh hưởng trực tiếp:
  - frontend/src/pages/qc/InboundControl.tsx:76
  - frontend/src/pages/qc/InboundControl.tsx:225
  - frontend/src/pages/qc/InventoryQC.tsx:41
  - frontend/src/pages/qc/InventoryQC.tsx:214
  - frontend/src/pages/qc/InventoryQC.tsx:314

Tác động:
- Dữ liệu > 10 bản ghi (limit mặc định backend) sẽ không thể truy cập từ UI.
- Search/filter ở frontend chỉ chạy trên tập dữ liệu đã tải, gây false negative.

### 2) Production batches: service có metadata pagination nhưng màn hình không dùng
- Service trả object có pagination:
  - frontend/src/services/productionBatchService.ts:11
  - frontend/src/services/productionBatchService.ts:16
  - frontend/src/services/productionBatchService.ts:20
- ProductInspection chỉ lấy response.data và render map, không có điều hướng trang:
  - frontend/src/pages/qc/ProductInspection.tsx:46
  - frontend/src/pages/qc/ProductInspection.tsx:47
  - frontend/src/pages/qc/ProductInspection.tsx:138

Tác động:
- Nếu tổng số batch lớn hơn limit, người dùng không thể sang trang sau.

### 3) DashboardQC cắt danh sách bằng slice(0,5) (không phải bug phân trang nhưng có rủi ro nhận thức)
- frontend/src/pages/qc/DashboardQC.tsx:32
- frontend/src/pages/qc/DashboardQC.tsx:126

Tác động:
- Đây là danh sách preview (hợp lý cho dashboard), nhưng cần hiển thị rõ là "5 mục gần nhất" hoặc "top 5" để tránh hiểu nhầm.

### 4) ReportTraceability hiển thị lịch sử theo lot không phân trang
- frontend/src/pages/qc/ReportTraceability.tsx (render qcHistory dạng danh sách timeline toàn bộ)
- API hiện dùng getQCTestsByLot trả toàn bộ theo lot (chưa có page/limit).

Tác động:
- Với lot có lịch sử QC dài, UI có thể nặng và khó thao tác.

## Danh sách vấn đề theo mức độ

### Critical
- InboundControl và InventoryQC không có cơ chế chuyển trang cho inventory lots, trong khi backend có page/limit mặc định.

### High
- ProductInspection không có chuyển trang dù service đã hỗ trợ metadata pagination.

### Medium
- Search/filter ở InboundControl và InventoryQC chỉ lọc trên dữ liệu trang hiện tại hoặc tập con đã tải.
- ReportTraceability chưa có phân trang cho lịch sử QC theo lot.

### Low
- DashboardQC nên gắn nhãn preview rõ ràng cho danh sách cắt 5 dòng.

## Hướng xử lý đề xuất

### A. Chuẩn hóa contract dữ liệu phân trang cho QC lists
- Tạo kiểu dùng chung:
  - `PaginatedResponse<T> = { data: T[]; page: number; limit: number; total: number; totalPages: number }`
- Cập nhật qcServices.getInventoryLots nhận thêm params:
  - status, page, limit, search (nếu cần)
- Không flatten mất metadata phân trang trong service layer.

### B. Bổ sung Pagination UI cho từng màn hình
- InboundControl:
  - Thêm state: page, limit, total, totalPages.
  - Khi đổi filter/status/search thì reset page = 1.
  - Hiển thị controls: Prev/Next + số trang hiện tại.
- InventoryQC:
  - Tách phân trang cho từng tab nếu cần (alert và quarantine) hoặc chuyển filter/search về backend.
- ProductInspection:
  - Dùng response.pagination để render controls.

### C. Đồng bộ search/filter với server-side
- Tránh lọc hoàn toàn phía client trên tập dữ liệu thiếu.
- Đưa search/status vào query API để trả đúng tập dữ liệu theo trang.

### D. Cải thiện UX danh sách
- Hiển thị "Đang xem X-Y / tổng Z".
- Disable nút Prev/Next đúng điều kiện.
- Giữ trạng thái trang khi quay lại từ modal thao tác.

## Tiêu chí nghiệm thu
- Người dùng có thể truy cập đầy đủ toàn bộ bản ghi thông qua điều hướng trang.
- Khi tổng số bản ghi > limit, UI luôn hiển thị pagination controls.
- Search/filter trả kết quả đúng trên toàn bộ dữ liệu (không chỉ trang đầu).
- Không còn trường hợp "không thấy dữ liệu" chỉ vì thiếu nút qua trang.

## Ưu tiên triển khai
1. InboundControl + InventoryQC (Critical).
2. ProductInspection (High).
3. ReportTraceability pagination (Medium).
4. Label preview cho DashboardQC (Low).
