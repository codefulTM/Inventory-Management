# Vibe Coding — Công cụ và Prompts tạo tài liệu Deployment

> Tài liệu này ghi lại các công cụ AI và các prompts chính nhóm đã sử dụng để tạo và cập nhật các sản phẩm trong thư mục `03_Deployment`.

---

## 1. Công cụ sử dụng

| Công cụ | Vai trò |
|---|---|
| **GitHub Copilot (Claude Sonnet 4.5)** | Trợ lý AI chính — sinh nội dung tài liệu, chỉnh sửa Markdown trực tiếp trong VS Code |
| **VS Code** | Môi trường soạn thảo, tích hợp GitHub Copilot Chat |
| **Git / GitHub** | Quản lý phiên bản tài liệu |

---

## 2. Các sản phẩm được tạo/cập nhật

| File | Mô tả |
|---|---|
| `02_Deployment Guide.md` | Hướng dẫn triển khai cho IT Administrator |
| `03_User Guide.md` | Hướng dẫn sử dụng cho người dùng cuối |
| `04_Deployment_Vibe Coding.md` | Tài liệu này — ghi lại quy trình Vibe Coding |

---

## 3. Prompts chính đã sử dụng

### 3.1 Tạo `02_Deployment Guide.md`

**Prompt 1 — Tạo hướng dẫn deploy từ lịch sử thực tế trên VPS:**

- **Context đính kèm:** Toàn bộ thư mục `01_Deployment_Package` (docker-compose, nginx config, base services, .env.example, ...) + lịch sử lệnh thực tế đã chạy trên VPS

> Dựa vào lịch sử command thực tế trên Vps (bỏ qua các bước thất bại hoặc lỗi sau đó thực hiện lại), hãy viết cho tôi hướng dẫn deploy VPS + Docker + Nginx chi tiết nhất có thể

Kết quả AI tạo ra tài liệu gốc gồm 10 mục:
- Cấu trúc thư mục VPS
- Cài đặt hệ thống cơ bản (Node.js, fail2ban, locale)
- Cài đặt Docker và Docker Compose plugin
- Clone code và cấu hình file `.env`
- Cài đặt Nginx và cấp SSL (Certbot)
- Khởi động từng base service: MongoDB, Redis, Elasticsearch, Keycloak
- Cấu hình Keycloak (realm, client secret)
- Cài đặt Jenkins (Docker run, plugin, pipeline job, SSH credentials)
- Deploy ứng dụng lần đầu và qua Jenkins webhook
- Kiểm tra hệ thống, xem logs, restart

---

**Prompt 2 — Mở rộng tài liệu theo yêu cầu IT Admin:

> Bổ sung cho đúng yêu cầu: Tài liệu hướng dẫn một nhà quản trị hệ thống (IT Administrator) cách đăng ký các dịch vụ, cài đặt môi trường triển khai, cấu hình hệ thống triển khai liên tục, hệ thống chuyển giao liên tục, thực thi các kịch bản cung cấp và tài nguyên để vận hành hệ thống (IaaC). Tài liệu cũng cần mô tả từng kết quả thu được sau khi triển khai hệ thống lên môi trường Internet và thiết bị thực sự, ví dụ như web UI, APIs, databases, authentication and authorization service. Ngoài ra trong tài liệu này còn có các thông tin sau: Một đoạn riêng chứa liên kết đến video trên YouTube biểu diễn cách triển khai hệ thống của nhóm.

Kết quả AI tạo ra:
- **Mục 1** — Tổng quan hệ thống: sơ đồ kiến trúc ASCII, bảng dịch vụ, bảng phân quyền
- **Mục 2** — Đăng ký dịch vụ: VPS (DigitalOcean/Hetzner), domain, bảng DNS A records, firewall UFW, SSH key
- **Mục 8** — Giải thích IaC với Docker Compose: cấu trúc file YAML, nguyên tắc vận hành
- **Mục 10** — Giải thích kiến trúc CI/CD Jenkins: sơ đồ pipeline, bảng các stage
- **Mục 13** — Kết quả sau triển khai: Web UI, APIs, MongoDB, Keycloak, Jenkins, Redis, Elasticsearch + bảng tổng kết URLs
- **Mục 14** — Video Demo: section riêng với link YouTube placeholder

---

**Prompt 2 — Thêm link YouTube thực tế và hình ảnh sản phẩm:**

> link youtube: https://youtu.be/I9oKUKRT588?si=AYfabRE6cB7O3Z6l
> và hình ảnh sản phẩm

Kết quả AI thực hiện:
- Chèn 6 ảnh thực tế từ thư mục `product-images/`: `overview.png`, `login.png`, `jenkins.png`, `docker.png`, `kibana.png`, `gafana.png`
- Cập nhật link YouTube thực tế kèm thumbnail preview `img.youtube.com`
- Tổ chức lại Mục 13 thành 7 tiểu mục có ảnh minh hoạ

---

### 3.2 Tạo `03_User Guide.md`

**Prompt 1 — Tạo tài liệu hướng dẫn người dùng:**

> 03_User Guide.md: Tài liệu hướng dẫn người dùng cuối (User) cách cài đặt và sử dụng sản phẩm. Ngoài ra trong tài liệu này còn có các thông tin sau: Một đoạn riêng chứa liên kết đến video trên YouTube giới thiệu cách sử dụng hệ thống của nhóm.

Kết quả AI tạo ra tài liệu 9 mục:
- Giới thiệu hệ thống, tính năng, phân quyền 4 vai trò
- Section riêng video YouTube kèm thumbnail và bảng nội dung theo thời điểm
- Yêu cầu trình duyệt và kết nối
- Hướng dẫn đăng nhập, quên mật khẩu
- Hướng dẫn chi tiết theo vai trò: Manager, Operator, QC Inspector, IT Administrator
- FAQ 8 câu hỏi thường gặp

---

**Prompt 2 — Tinh chỉnh phạm vi tài liệu:**

> Đây là md hướng dẫn user sử dụng chứ không phải hướng dẫn IT deploy

Kết quả AI thực hiện:
- Xoá toàn bộ Section 8 (IT Administrator: backup, restore, audit log, giám sát hệ thống)
- Cập nhật phần đối tượng: chỉ còn Manager, Operator, QC Inspector
- Đánh lại số mục (9 → 8), cập nhật Mục Lục và câu trả lời FAQ cuối

---

## 4. Quy trình làm việc với AI (Vibe Coding)

```
1. Nhóm xác định yêu cầu nội dung tài liệu
          │
          ▼
2. Soạn prompt mô tả rõ: đối tượng, nội dung cần có, format
          │
          ▼
3. GitHub Copilot sinh nội dung / chỉnh sửa file trực tiếp trong VS Code
          │
          ▼
4. Nhóm review kết quả, phát hiện thiếu sót hoặc sai đối tượng
          │
          ▼
5. Prompt tiếp theo để bổ sung / điều chỉnh
          │
          ▼
6. Lặp lại đến khi tài liệu đạt yêu cầu
```

---

## 5. Nhận xét về Vibe Coding cho tài liệu

| Ưu điểm | Hạn chế |
|---|---|
| Sinh nội dung nhanh, đúng cấu trúc Markdown | AI có thể đưa nội dung sai đối tượng nếu prompt chưa rõ phạm vi (ví dụ: đưa hướng dẫn IT vào User Guide) |
| Tự động tạo bảng, mục lục, sơ đồ ASCII | Cần prompt rõ ràng về đối tượng tài liệu ngay từ đầu |
| Tích hợp ảnh và link thực tế khi được cung cấp | Renumber section đôi khi cần kiểm tra lại thủ công |
| Tiết kiệm 80–90% thời gian soạn thảo so với viết tay | Nội dung nghiệp vụ cụ thể cần người có domain knowledge review và hiệu chỉnh |

---

*Tài liệu được tạo bằng GitHub Copilot (Claude Sonnet 4.5) — tháng 4/2026*