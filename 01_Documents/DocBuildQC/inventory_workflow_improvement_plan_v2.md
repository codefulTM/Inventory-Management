# Kế hoạch cải thiện nghiệp vụ tồn kho (Backend + Frontend)

## 1) Mục tiêu tài liệu

Tổng hợp toàn bộ các điểm đã thảo luận và thống nhất định hướng cải thiện nghiệp vụ cho 2 vai trò chính:

- Operator: tạo phiếu nhập/xuất kho có ràng buộc dữ liệu chặt chẽ.
- Manager: xác nhận/từ chối phiếu, theo dõi tồn kho và điều chỉnh tồn kho trực tiếp.

Tài liệu này là plan triển khai và được cập nhật trạng thái thực thi theo từng phase.

---

## 2) Tổng hợp các quyết định nghiệp vụ đã thảo luận

### 2.1 Quản lý nhập/xuất kho

- Manager xử lý xác nhận hoặc từ chối phiếu tại màn hình quản lý nhập/xuất.
- Chỉ khi phiếu được xác nhận thì dữ liệu tồn kho mới thay đổi chính thức.

### 2.2 Quan hệ giữa phiếu nhập và dữ liệu lô hàng

- Phiếu xuất kho: phải tham chiếu lô đang có trong hệ thống tồn kho.
- Phiếu nhập kho: lô chưa xác nhận nhập thì không được coi là lô tồn kho hiện hữu.
- Nếu hiển thị lot_id trong phiếu nhập thì lot_id đó là mã dự kiến/reserved, chưa xuất hiện trong danh sách lô tồn kho chính thức.

### 2.3 Tồn kho và điều chỉnh tồn kho

- Màn hình Tồn kho không cần lặp lại toàn bộ danh sách lô nếu đã có màn Quản lý hàng hóa.
- Màn hình Tồn kho tập trung vào:
  - Lịch sử điều chỉnh tồn kho.
  - Thao tác điều chỉnh trực tiếp bởi Manager.
- Không cần quy trình tạo "phiếu chờ duyệt" cho điều chỉnh do Manager thực hiện.
- Tuy nhiên hệ thống vẫn phải ghi nhận bản ghi audit/transaction đầy đủ để truy vết và kiểm toán.

### 2.4 Chuẩn hóa ngôn ngữ giao diện

- Chuẩn hóa tiếng Việt có dấu cho toàn bộ input label, placeholder, thông báo lỗi, thông báo thành công.

---

## 3) Yêu cầu bổ sung mới (đợt hiện tại)

### 3.1 Operator - Phiếu nhập kho

- Không cho người dùng nhập tay "Mã lô".
- Mã lô phải auto-fill theo quy tắc tăng dần theo mã lớn nhất hiện có.
  - Ví dụ mã lớn nhất là LOT-019 thì gợi ý/điền LOT-020.
- "Mã vật tư" phải là dropdown lấy từ dữ liệu vật tư có sẵn trong DB.

### 3.2 Operator - Phiếu xuất kho

- Người dùng chọn "Mã lô" từ dropdown dữ liệu có sẵn trong DB.
- Sau khi chọn mã lô, hệ thống auto-fill "Mã vật tư" tương ứng.

### 3.3 Scan-to-fill

- Luồng quét mã phải điều chỉnh theo order type:
  - Inbound: ưu tiên nhận dạng material để điền material và gợi ý lot auto.
  - Outbound: ưu tiên nhận dạng lot để điền lot và tự điền material.

### 3.4 Manager - /manager/stock

- Trong khối tạo điều chỉnh tồn kho, LOT ID phải chọn từ dropdown dữ liệu lô sẵn có trong DB, không nhập tay tự do.

---

## 4) Đề xuất thiết kế backend

## 4.1 Quy tắc dữ liệu và trạng thái

- Inbound order item:
  - `material_id`: bắt buộc, phải tồn tại.
  - `lot_id`: không nhập tay từ UI; backend tạo/gán mã dự kiến.
- Outbound order item:
  - `lot_id`: bắt buộc, phải tồn tại và hợp lệ để xuất kho.
  - `material_id`: có thể nhận từ frontend để hiển thị, nhưng backend luôn kiểm tra khớp theo lot.

## 4.2 Sinh mã lô tự động cho Inbound

Khuyến nghị kỹ thuật:

- Dùng cơ chế sequence/counter riêng thay vì quét max string mỗi lần để tránh race condition.
- Tạo collection `counters` hoặc service sinh mã lot theo transaction lock.
- Định dạng chuẩn hóa: `LOT-001`, `LOT-002`, ...
- Tại bước tạo phiếu inbound:
  - Sinh mã lot dự kiến cho từng dòng item inbound.
  - Gắn vào item như `lot_id` dự kiến.
- Tại bước confirm inbound:
  - Tạo inventory lot chính thức (nếu chưa tồn tại).
  - Cập nhật quantity và sinh transaction theo luồng xác nhận.

## 4.3 API hỗ trợ dropdown và auto-fill

Bổ sung/chuẩn hóa endpoint:

- `GET /materials/options`
  - Trả về danh sách material tối giản cho dropdown.
- `GET /inventory-lots/options`
  - Trả về danh sách lot tối giản cho dropdown outbound và manager adjustment.
  - Hỗ trợ filter theo trạng thái, material, kho, keyword.
- `POST /import-export-orders/scan/resolve`
  - Nhận thêm context `order_type` để trả payload phù hợp inbound/outbound.

## 4.4 Ràng buộc nghiệp vụ confirm

- Confirm inbound:
  - Cho phép lot chưa tồn tại trước đó (vì là lot mới nhập).
  - Tạo lot mới từ lot_id đã reserved.
- Confirm outbound:
  - Bắt buộc lot tồn tại, đủ số lượng, trạng thái cho phép xuất.

## 4.5 Điều chỉnh tồn kho trực tiếp bởi Manager

- Giữ endpoint điều chỉnh tồn kho dạng hành động trực tiếp (single-step command).
- Không cần workflow chờ duyệt.
- Bắt buộc lưu:
  - before/after quantity
  - valuation delta
  - actor, reason, timestamp
  - linked transaction id

---

## 5) Đề xuất thiết kế frontend

## 5.1 Operator - Form Inbound

- Cột "Mã vật tư": dropdown bắt buộc (không text tự do).
- Cột "Mã lô": readonly, auto-fill từ backend hoặc từ service sinh mã.
- Nếu đổi material, lot vẫn giữ theo sequence đã cấp cho dòng đó.
- Validate rõ ràng khi chưa chọn material hoặc quantity không hợp lệ.

## 5.2 Operator - Form Outbound

- Cột "Mã lô": dropdown bắt buộc (nguồn DB).
- Cột "Mã vật tư": readonly/auto-fill theo lot đã chọn.
- Nếu đổi lot, material update theo lot tương ứng.

## 5.3 Scan-to-fill thích ứng

- Inbound scan:
  - Nếu scan ra material hoặc part number: điền material.
  - Không ghi đè lot theo mã scan; lot theo cơ chế auto.
- Outbound scan:
  - Nếu scan ra lot: điền lot + material.
  - Nếu scan ra material mà chưa có lot: hiển thị gợi ý chọn lot.

## 5.4 Manager - /manager/stock

- Khối "Tạo điều chỉnh tồn kho":
  - LOT ID dùng dropdown từ DB.
  - Các trường reason, quantity, unit cost giữ validate nghiệp vụ.
- Nội dung màn "Tồn kho":
  - Ưu tiên bảng lịch sử điều chỉnh tồn kho.
  - Không lặp lại bảng tồn kho chi tiết nếu đã có ở "Quản lý hàng hóa".

## 5.5 Chuẩn hóa tiếng Việt

- Chuẩn hóa toàn bộ label/input/message theo một glossary thống nhất.
- Không trộn tiếng Anh-Việt ở nhãn hiển thị cho người dùng nghiệp vụ.

---

## 6) Kế hoạch triển khai theo phase

## Phase 1 - Chốt rule nghiệp vụ và contract

Trạng thái: DONE (04/04/2026)

Backend:

- Chốt rule inbound/outbound cho `lot_id` và `material_id`.
- Chốt format mã lot và cơ chế sequence.
- Chốt contract endpoint options + scan resolve theo context.

Frontend:

- Chốt UX form theo order type.
- Chốt mapping field readonly/dropdown/auto-fill.

Deliverable:

- API contract v2 và field behavior matrix.
- Đã tạo API contract v2: `01_Documents/DocBuildQC/inventory_workflow_api_contract_v2.md`
- Đã tạo Field behavior matrix v2: `01_Documents/DocBuildQC/inventory_workflow_field_behavior_matrix_v2.md`

## Phase 2 - Backend nền tảng dữ liệu

Trạng thái: DONE (04/04/2026)

- Triển khai service sinh lot sequence an toàn cạnh tranh.
- Điều chỉnh create/confirm flow của import-export-order.
- Bổ sung endpoint options cho materials/lots.
- Nâng cấp scan resolve nhận `order_type`.

Deliverable:

- Unit test cho sequence, create inbound/outbound, confirm inbound/outbound.

## Phase 3 - Frontend Operator

Trạng thái: DONE (04/04/2026)

- Refactor form tạo inbound/outbound theo rule mới.
- Tích hợp dropdown material/lot.
- Tích hợp auto-fill field phụ thuộc.
- Cập nhật scan behavior phù hợp từng order type.

Deliverable:

- Trang tạo phiếu ổn định cho operator, không nhập tay field rủi ro.

## Phase 4 - Frontend Manager Stock

Trạng thái: DONE (04/04/2026)

- Cập nhật khối điều chỉnh tồn kho:
  - LOT ID dropdown từ DB.
- Tổ chức lại màn stock theo hướng lịch sử điều chỉnh.
- Chuẩn hóa tiếng Việt các nhãn liên quan.

Deliverable:

- /manager/stock đúng định hướng nghiệp vụ mới.

## Phase 5 - Kiểm thử và hardening

Backend:

- Test race condition khi tạo nhiều inbound đồng thời.
- Test dữ liệu bất nhất lot-material ở outbound.

Frontend:

- Test flow thực tế bằng keyboard/mouse/scanner.
- Test state reset, reload, submit lỗi, retry.

UAT:

- Checklist theo vai trò Operator và Manager.

---

## 7) Ma trận tiêu chí chấp nhận sau cải tiến

- Inbound:
  - Không nhập tay lot_id.
  - material_id chọn từ dropdown.
  - lot_id auto tăng đúng định dạng, không trùng.
- Outbound:
  - lot_id chọn từ dropdown dữ liệu thực.
  - material_id tự điền và khớp với lot_id.
- Manager stock adjustment:
  - lot_id chọn từ dropdown.
  - Điều chỉnh thực thi trực tiếp nhưng có audit đầy đủ.
- UI:
  - Label/placeholder/thông báo chuẩn tiếng Việt có dấu.

---

## 8) Rủi ro và biện pháp giảm thiểu

- Rủi ro trùng mã lô khi concurrent create inbound.
  - Giảm thiểu: sequence atomic bằng transaction/counter.
- Rủi ro dữ liệu cũ chưa chuẩn format LOT-xxx.
  - Giảm thiểu: migration script chuẩn hóa hoặc cơ chế parse linh hoạt.
- Rủi ro scan không đồng nhất thiết bị.
  - Giảm thiểu: chuẩn hóa parser scan input và timeout debounce.
- Rủi ro thay đổi contract gây vỡ FE cũ.
  - Giảm thiểu: version hóa contract hoặc rollout theo feature flag.

---

## 9) Phạm vi ngoài kế hoạch này

- Chưa bao gồm thay đổi báo cáo BI/dashboard tổng hợp.
- Chưa bao gồm redesign toàn bộ IA/UX các module khác ngoài nhập-xuất và stock adjustment.
- Chưa bao gồm thay đổi phân quyền đa tầng ngoài role hiện hữu.

---

## 10) Kết luận

Kế hoạch này đảm bảo:

- Tăng ràng buộc dữ liệu đầu vào, giảm lỗi nhập tay.
- Phân tách rõ inbound/outbound theo bản chất nghiệp vụ.
- Giữ thao tác điều chỉnh tồn kho nhanh cho Manager nhưng vẫn đáp ứng audit/compliance.
- Đồng bộ định hướng giữa backend và frontend để triển khai an toàn theo từng phase.
