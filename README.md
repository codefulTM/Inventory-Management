# Inventory Management

## Thông tin nhóm

Nhóm 1 - Thành viên nhóm:

| Họ và tên                     | MSSV     |
|-------------------------------|----------|
| Nguyễn Thái Tân (Nhóm trưởng) | 18127269 |
| Nguyễn Tuấn Minh              | 22127271 |
| Nguyễn Huy Tấn                | 22127380 |
| Phạm Văn Minh                 | 22127272 |
| Nguyễn Ngọc Giang             | 22127093 |
| Trần Gia Bảo                  | 22127034 |

## 1. Giới thiệu
Inventory Management Web Application là một hệ thống web dùng để **quản lý hàng tồn kho**, hỗ trợ theo dõi **nhập – xuất – tồn**, quản lý **sản phẩm, kho, giao dịch mua bán**, phân quyền người dùng và cung cấp **báo cáo – thống kê** cho quản lý.

Hệ thống được xây dựng theo mô hình **Web Application hiện đại**, phù hợp cho cửa hàng, doanh nghiệp vừa và nhỏ hoặc làm đồ án môn **Công nghệ phần mềm / Web nâng cao**.

---

## 2. Mục tiêu hệ thống
### Các roles chính - pain points:
- Manager - Quản lý toàn bộ hệ thống, theo dõi báo cáo, inventory status
- Quality Control Technician - Thay thế công việc giấy tờ thủ công, đảm bảo tuân thủ quy định
- Operator - Nhân viên kho, nhập xuất hàng hóa
- IT Administrator - Quản trị hệ thống, phân quyền người dùng, system maintenance, data backup

### Objectives:
- Thay thế các công việc bằng giấy tờ thủ công
- Đảm bảo tuân thủ các quy định của pháp luật
- Theo dõi quản lý các nguyên vật liệu từ lúc nhận đến chuyển giao
- Chặn các lô hàng bị reject, hết hạn
- Báo cáo
- 99.9% là uptime
- 90% người dùng đánh giá good/excellent
- Hệ thống có thể chạy trên dữ liệu lớn (scale)
---

## 3. Các khái niệm chính
- Supply chain: Chuỗi cung ứng
- Material management: Nguyên vật liệu, hàng hóa
- Inventory lot tracking & control: Theo dõi lô hàng tồn kho
- Inventory transactions: Giao dịch tồn kho (nhập, xuất, điều chuyển)
- Quality control testing: Kiểm tra chất lượng
- Label generation & printing: Tạo và in nhãn
- Reporting & analytics: Báo cáo và phân tích

## 4. Out of scope 
- Financial
- Customer Relationship Management (CRM)
- Supplier Chain Management (SCM)
- Mobile app

## 5. Requirements
### Functional requirements
- Quản lý Identify, name, description, đặc tả, thông tin quy định pháp luật.
- Khả năng phân loại
- Control version (change history)
- Tạo Lot (unique ids, nhà cung cấp, số lượng, ngày sản xuất/hết hạn, status)
  - Lot Status: Quarantine, Accepted, Rejected, Depleted
- Label generation khi nhận 1 lô hàng (ngày nhận, số lượng, thông tin nhà cung cấp, thông tin kiểm tra chất lượng)
  - Barcode
  - QR code
- Reporting:
  - Inventory status: tồn kho hiện tại, sắp hết hạn, đã hết hạn
  - Báo cáo việc sử dụng: nguyên vật liệu, nhập xuất
  - Kiểm soát chất lượng
  - Báo cáo tuân thủ quy định (audit)
- Security:
  - Đăng nhập password, các role quản lý
- Wish:
  - API luôn có rate limiting
  - API có documentation
  - Có Import & Export CSV/Excel (validate)

### Non-functional requirements
- mong muốn có thể 100 user cùng truy cập hệ thống
- api trả lời trong vòng 20s
- report phải tạo ra trong vòng 30s
- 1 ngày xử lý tối thiểu 10000 transactions
- 99.9% uptime
- hỗ trợ backup & recover dữ liệu
- hệ thống phải cung cấp scalability (Docker, Kubernetes)
- hệ thống phải encrypt dữ liệu nhạy cảm (mật khẩu, thông tin cá nhân)
- hệ thống phải được bảo vệ CSRF protection, DDoS protection, Caching
- Database min 1.000.000 records
- Helps
