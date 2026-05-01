Dựa trên note của bạn, giảng viên gần như chắc chắn **không hỏi trivia lặt vặt**, mà sẽ xoáy vào **hiểu hệ thống + hiểu quy trình + hiểu quyết định kỹ thuật**. Nói ngắn gọn: họ muốn biết bạn **có thực sự build cái hệ thống này không**.

Dưới đây là các **nhóm câu hỏi có thể xuất hiện**, kèm ví dụ cụ thể để bạn chuẩn bị.

---

# 1. Hiểu bài toán (Domain / Problem)

👉 Kiểm tra bạn có hiểu **Inventory Management System** không

**Dạng câu hỏi:**

- “Hệ thống của bạn giải quyết bài toán gì?”
- “Material, Lot, QC, Batch khác nhau thế nào?”
- “Tại sao cần QC trước khi tạo batch?”
- “Luồng nghiệp vụ từ tạo material → production batch?”

**Ví dụ cụ thể:**

- “Nếu một lot fail QC thì hệ thống xử lý sao?”
- “Transition state của một batch gồm những gì?”

---

# 2. Kiến trúc hệ thống (Architecture)

👉 Đây là phần **bị hỏi nhiều nhất**

**Dạng câu hỏi:**

- “Tại sao bạn dùng microservice?”
- “Các service gồm những gì?”
- “Service nào giao tiếp với service nào?”

**Ví dụ:**

- “IMS service và RAG service giao tiếp thế nào?”
- “Tại sao không làm monolith?”
- “ElasticSearch nằm ở đâu trong kiến trúc?”

---

# 3. Authentication / Security (Keycloak)

👉 Rất hay bị hỏi vì nhiều bạn làm mà không hiểu

**Dạng câu hỏi:**

- “Flow login diễn ra thế nào?”
- “Token dùng để làm gì?”
- “REST API có bảo mật không?”

**Ví dụ cụ thể:**

- “User login → redirect sang Keycloak → rồi quay về như thế nào?”
- “JWT chứa những gì?”
- “Nếu không có token thì chuyện gì xảy ra?”

---

# 4. RAG (Retrieval-Augmented Generation)

👉 Đây là phần “AI” nên giảng viên rất thích hỏi

**Dạng câu hỏi:**

- “RAG hoạt động như thế nào?”
- “Dữ liệu lấy từ đâu?”
- “Tại sao cần ElasticSearch?”

**Ví dụ:**

- “Khi user hỏi chatbot thì flow diễn ra như thế nào?”
- “Vector search vs keyword search khác nhau ra sao?”
- “Tại sao không gọi thẳng OpenAI mà cần RAG?”

---

# 5. Database & Data Model

👉 Bạn đã tự note “sai lầm: không có sẵn data model” → chắc chắn bị hỏi

**Dạng câu hỏi:**

- “Thiết kế database như thế nào?”
- “Quan hệ giữa các bảng?”

**Ví dụ:**

- “Material và Lot liên kết thế nào?”
- “Tại sao dùng PostgreSQL / Supabase?”
- “Nếu dữ liệu lớn thì scale ra sao?”

---

# 6. Testing (Unit / Integration / E2E)

👉 Vì bạn có nhắc rõ → gần như chắc chắn hỏi

**Dạng câu hỏi:**

- “Unit test vs Integration test khác nhau gì?”
- “Bạn test backend như thế nào?”

**Ví dụ:**

- “Tại sao không mock DB?”
- “Playwright test cái gì?”
- “Nếu test fail thì debug sao?”

---

# 7. Dev Workflow / AI Usage

👉 Vì bạn dùng AI để generate code → họ sẽ hỏi

**Dạng câu hỏi:**

- “Bạn dùng AI như thế nào?”
- “Làm sao đảm bảo code đúng?”

**Ví dụ:**

- “Prompt bạn dùng để generate backend?”
- “Sau khi AI generate, bạn kiểm tra gì?”
- “Nếu AI code sai logic thì sao?”

---

# 8. Deployment (rất quan trọng)

👉 Bạn đã note: “dev & deploy là quan trọng nhất”

**Dạng câu hỏi:**

- “Deploy lên cloud như thế nào?”
- “Khác nhau giữa local và production?”

**Ví dụ:**

- “Tại sao test trên Google Cloud rồi mới lên AWS?”
- “Vercel dùng để làm gì?”
- “Nếu service down thì sao?”

---

# 9. REST API & Communication

👉 Core backend knowledge

**Dạng câu hỏi:**

- “REST là gì?”
- “API của bạn thiết kế như thế nào?”

**Ví dụ:**

- “POST /materials làm gì?”
- “Idempotent là gì?”
- “Làm sao để tránh người lạ gọi API?”

---

# 10. Redis / Caching / Performance

👉 Nếu bạn có mention Redis → có thể bị hỏi

**Ví dụ:**

- “Redis dùng để làm gì?”
- “Cache giúp gì cho RAG?”
- “Nếu cache sai thì hậu quả?”

---

# 11. Quy trình làm dự án (Process)

👉 Đây là phần “Scrum / workflow”

**Dạng câu hỏi:**

- “Bạn bắt đầu từ đâu?”
- “PRD là gì?”
- “Tại sao cần product backlog?”

**Ví dụ:**

- “Từ requirement → code flow như thế nào?”
- “Bạn refine spec ra sao?”

---

# 12. Debug / Failure / Trade-off (câu hỏi gài)

👉 Đây là câu hỏi phân loại sinh viên

**Ví dụ:**

- “Nếu RAG trả sai kết quả thì xử lý sao?”
- “Nếu DB mất kết nối?”
- “Nếu Keycloak down?”
- “Tại sao không dùng Firebase cho nhanh?”

---

# 13. Câu hỏi cực kỳ phổ biến (99% sẽ gặp)

👉 Bạn nên thuộc lòng

- “Hãy mô tả toàn bộ flow khi user hỏi chatbot”
- “Hãy mô tả flow login”
- “Hãy mô tả flow tạo production batch”
- “Hãy mô tả kiến trúc hệ thống của bạn”

---

# 14. Câu hỏi về hiểu code (có thể bắt in ra)

👉 Như bạn note

**Ví dụ:**

- “Đoạn code này làm gì?”
- “Tại sao viết như vậy?”
- “Nếu sửa thì sửa gì?”

---

# Tóm lại (rất quan trọng)

Giảng viên sẽ xoay quanh 4 trục:

1. **Hiểu bài toán (business)**
2. **Hiểu kiến trúc (system design)**
3. **Hiểu flow (end-to-end)**
4. **Hiểu quyết định kỹ thuật (why, not just how)**

---

# Nếu bạn muốn chuẩn bị “chuẩn bài”

Tôi có thể giúp bạn:

- Giả lập **1 buổi vấn đáp thật** (hỏi xoáy như giảng viên)
- Hoặc tạo **cheat sheet 1 trang A4** để bạn học nhanh trước khi thi
- Hoặc kiểm tra xem kiến trúc bạn đang làm có “bị hỏi là toang” chỗ nào không

Chỉ cần nói 👍
