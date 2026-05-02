## Coding Standards - Inventory Management System (IMS)

### 1. Mục tiêu và phạm vi
Tài liệu này định nghĩa chuẩn mã nguồn áp dụng cho hệ thống hiện tại, tập trung vào:

- `02_Source/01_Source Code/*` (các service chính đang vận hành)
- `02_Source/05_Proof of Concept/*` (POC, áp dụng mức linh hoạt hơn)

Mục tiêu là đảm bảo tính nhất quán, dễ bảo trì, và phù hợp với hiện trạng triển khai thực tế.

### 2. Chuẩn bắt buộc áp dụng ngay

#### 2.1 Quy ước chung

- Code phải rõ ràng, ưu tiên dễ đọc và dễ bảo trì.
- Tuân thủ DRY, KISS, Single Responsibility.
- Không hard-code secrets trong mã nguồn runtime.
- Biến môi trường phải được đọc qua config layer (`@nestjs/config`, `import.meta.env`, `.env`).
- Mọi thay đổi phải qua Git và Pull Request.

#### 2.2 Naming conventions

- Biến/hàm/thuộc tính: `camelCase`.
- Class/React component/type/interface/enum: `PascalCase`.
- Tên file backend: `kebab-case` (theo convention NestJS).
- Tên file React component: `PascalCase.tsx` hoặc theo convention thư mục hiện có, nhưng phải nhất quán trong cùng module.

#### 2.3 TypeScript

- Không dùng `var`; dùng `const` mặc định, `let` khi cần thay đổi giá trị.
- Dùng `async/await` cho xử lý bất đồng bộ.
- Bắt buộc validate input API qua DTO + validation pipes.
- Không lạm dụng `any`; nếu bắt buộc phải dùng thì ghi rõ lý do.

#### 2.4 Backend (NestJS)

- Tách lớp rõ ràng: controller -> service -> repository/data-access.
- Xử lý lỗi có chủ đích (exception phù hợp), có logging đầy đủ ở luồng lỗi.
- Không log dữ liệu nhạy cảm (password/token/secret/authorization header).

#### 2.5 Frontend (React/Vite)

- Ưu tiên functional components + hooks.
- Quản lý gọi API tập trung qua `services/*` và interceptor.
- Tránh business logic phức tạp trong component render.
- Styling: ưu tiên theo hệ hiện có (CSS hiện tại + UI library đang dùng). Không ép buộc SCSS/CSS Modules nếu module đó không dùng.

#### 2.6 Dữ liệu và persistence

- Hệ thống hiện tại dùng MongoDB, Redis, Elasticsearch (không chuẩn hóa theo MySQL trong tài liệu này).
- Đặt tên fields/collections rõ nghĩa, nhất quán theo module.
- Các trường truy vấn nhiều phải có index phù hợp.

---

### 3. Tooling tiêu chuẩn

#### 3.1 Bắt buộc cho code TypeScript

- **ESLint:** Kiểm tra lỗi cú pháp và quy tắc viết code.
- **Prettier:** Tự động format layout (khoảng cách, dấu ngoặc...) để code đồng nhất.
- **TypeScript compiler (`tsc`):** Kiểm tra lỗi kiểu dữ liệu (type) trước khi chạy.
- **Jest:** Chạy các bài test unit cho backend để đảm bảo logic đúng.

#### 3.2 Trạng thái áp dụng theo repository hiện tại

- `inventory-management-service`: có cấu hình lint rõ ràng, có test và đang là trọng tâm trong Jenkins pipeline.
- `inventory-management-web-app`: có ESLint config, chưa có test runner trong scripts.
- Một số microservices khác: có script lint/test nhưng cần chuẩn hóa thêm cấu hình lint để đồng nhất enforcement.

#### 3.3 Mức khuyến nghị (roadmap)

- **`.editorconfig` ở root repo:** File cấu hình chung để đồng bộ cài đặt editor (tab size, charset...) giữa các lập trình viên, giúp code không bị lệch định dạng.
- **`.husky` + `lint-staged` + `ESLint`:** Tự động chạy kiểm tra trước khi commit:
  - **ESLint:** Là "cảnh sát" thực sự, đứng ra kiểm tra mã nguồn theo các quy tắc (quy ước đặt tên, lỗi cú pháp...).
  - **Husky:** Là "người gác cổng". Khi bạn gõ `git commit`, Husky sẽ chặn lại và ra lệnh: "Chạy kiểm tra nhé!".
  - **lint-staged:** Là "bộ lọc thông minh". Nó chỉ bảo ESLint kiểm tra những file bạn đang sửa (staged files), chứ không quét toàn bộ dự án -> giúp chạy nhanh hơn.
  - **Tóm lại:** `Husky` bảo chạy, `lint-staged` lọc file, và `ESLint` thực hiện kiểm tra.
- **Chuẩn hóa ESLint config:** Đồng bộ quy tắc viết code cho toàn bộ các microservices để mọi service đều có chung một chuẩn.
- **Bổ sung test runner frontend (Vitest + React Testing Library):** Thêm công cụ test chuyên dụng cho phần React frontend để đảm bảo UI hoạt động đúng.

---

### 4. Chính sách bảo mật trong mã nguồn và tài liệu

- Không commit secrets thật (API keys, client secrets, mật khẩu production).
- Ví dụ credentials trong docs/compose chỉ dùng cho local/dev phải được ghi nhãn rõ `example only`.
- Không để connection string production hoặc thông tin truy cập thật trong tài liệu kiến trúc.
- Ưu tiên dùng `.env.example` để mô tả biến cấu hình thay vì ghi trực tiếp giá trị thật.

---

### 5. Quy trình kiểm tra trước merge

1. Chạy lint cho package bị thay đổi.
2. Chạy test cho package bị thay đổi (ít nhất unit test liên quan).
3. Nếu thay đổi API/backend logic: cập nhật test hoặc giải trình lý do chưa có test.
4. PR phải được review bởi ít nhất 1 thành viên khác.
5. Không merge khi còn lỗi lint/test ở phạm vi thay đổi.

---

### 6. Quy tắc theo ngôn ngữ ngoài phạm vi chính

- Python: hiện chưa là ngôn ngữ chính trong source production. Nếu bổ sung Python service mới thì áp dụng PEP8, type hints, và linter tương ứng.
- SQL: chỉ áp dụng cho thành phần nào thực sự dùng SQL trong tương lai.

---

### 7. Chính sách cập nhật tài liệu chuẩn

- Tài liệu này được review định kỳ theo mốc release.
- Khi stack/tooling thay đổi, phải cập nhật chuẩn trong cùng sprint hoặc ngay sau release gần nhất.
- Mọi rule mới nên ghi rõ trạng thái: `Bắt buộc ngay` hoặc `Khuyến nghị / roadmap`.
