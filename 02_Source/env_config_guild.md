## HƯỚNG DẪN CHI TIẾT THIẾT LẬP CẤU HÌNH MÔI TRƯỜNG (.ENV)

Tài liệu này cung cấp các bước thực hiện chi tiết để lấy thông tin cấu hình cho các dịch vụ tích hợp trong hệ thống. Các giá trị này sẽ được điền vào file `.env` để ứng dụng có thể kết nối với các dịch vụ tương ứng.

---

### 1. Dịch vụ AI & Google (Cloud Services)

#### 1.1. HuggingFace API Key

Dùng để kết nối với các mô hình ngôn ngữ và trí tuệ nhân tạo từ nền tảng HuggingFace.

1.  Truy cập vào trang chủ [HuggingFace](https://huggingface.co/) và đăng nhập tài khoản.
2.  Nhấp vào ảnh đại diện ở góc trên bên phải, chọn **Settings** (Cài đặt).
3.  Ở cột bên trái, chọn mục **Access Tokens** (Mã thông báo truy cập - một chuỗi ký tự dùng để xác thực quyền hạn thay cho mật khẩu).
4.  Nhấn nút **New token**. Tại mục **Name**, đặt tên bất kỳ (ví dụ: "MyProject"). Tại mục **Type**, chọn **Read**.
5.  Nhấn **Generate a token**. Sao chép đoạn mã vừa hiện ra và dán vào biến `HUGGINGFACE_API_KEY`.

#### 1.2. Google API Key

Dùng cho các dịch vụ như bản đồ (Maps) hoặc nhận diện hình ảnh (Vision) của Google.

1.  Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2.  Nhấp vào danh sách dự án ở thanh trên cùng và chọn **New Project** (Dự án mới - một không gian làm việc riêng biệt cho ứng dụng) nếu chưa có.
3.  Mở menu điều hướng (ba dấu gạch ngang), chọn **APIs & Services** > **Library**. Tìm và kích hoạt (Enable) dịch vụ cần thiết cho dự án.
4.  Quay lại menu, chọn **APIs & Services** > **Credentials** (Thông tin xác thực - bằng chứng số để hệ thống nhận diện và cho phép truy cập tài nguyên).
5.  Nhấn **Create Credentials** > **API Key**. Sao chép khóa này dán vào biến `GOOGLE_API_KEY`.

---

### 2. Dịch vụ Cơ sở dữ liệu (Chạy qua Docker)

#### 2.1. Elasticsearch (Username/Password/TLS CA)

Dựa trên tệp cấu hình thực tế của hệ thống hiện tại đang chạy dưới dạng **Container** (Môi trường ảo hóa siêu nhẹ giúp đóng gói phần mềm):

1.  **Username/Password**: Kiểm tra thông số khởi tạo trong hệ thống. Hiện tại, biến `xpack.security.enabled` đang đặt là `false`.
    - **Thao tác**: Vì chế độ bảo mật đang tắt, hệ thống không yêu cầu xác thực. Để trống cả hai trường `ELASTICSEARCH_USERNAME` và `ELASTICSEARCH_PASSWORD`.
2.  **TLS CA**: Đây là chứng chỉ bảo mật giúp mã hóa dữ liệu truyền tải giữa máy chủ và máy khách.
    - **Thao tác**: Do hệ thống đang chạy ở chế độ không bảo mật (Security Off) trên môi trường nội bộ, để trống trường `ELASTICSEARCH_TLS_CA`.

#### 2.2. Redis Password

Dùng cho hệ thống lưu trữ dữ liệu tạm thời trên bộ nhớ RAM (bộ nhớ truy xuất dữ liệu tốc độ cao).

1.  **Trạng thái kiểm tra**: Kết quả truy vấn cấu hình từ lệnh `CONFIG GET requirepass` cho thấy giá trị trả về là chuỗi trống `""`.
2.  **Thao tác**: Không cần thiết lập mật khẩu cho dịch vụ này. Để trống trường `REDIS_PASSWORD`.

---

### 3. Dịch vụ gửi Email (SMTP)

Sử dụng giao thức **SMTP** (Giao thức truyền tải thư tín đơn giản - quy tắc tiêu chuẩn để gửi email qua mạng Internet) của Gmail.

1.  Truy cập vào [Tài khoản Google](https://myaccount.google.com/).
2.  Vào mục **Security** (Bảo mật). Đảm bảo đã kích hoạt **2-Step Verification** (Xác thực 2 lớp).
3.  Tìm kiếm cụm từ "App Passwords" (Mật khẩu ứng dụng - mật khẩu riêng biệt dành cho các ứng dụng không hỗ trợ đăng nhập thông thường hoặc xác thực 2 lớp) trong thanh tìm kiếm của trang tài khoản.
4.  Tại mục đặt tên, nhập tên gợi nhớ (ví dụ: "Easyconf Server"). Nhấn **Create**.
5.  Hệ thống sẽ cấp một mã gồm 16 ký tự.
    - **MAIL_USER**: Nhập địa chỉ Gmail sử dụng để gửi thư.
    - **MAIL_PASS**: Nhập mã 16 ký tự vừa nhận được.

---

### TÓM TẮT THAO TÁC FILE `.ENV`

1.  Tìm file mẫu có tên `.env.example` trong thư mục gốc của dự án.
2.  Tạo một bản sao của file đó và đổi tên thành `.env`.
3.  Mở file `.env` bằng phần mềm soạn thảo văn bản (như VS Code hoặc Notepad).
4.  Điền các giá trị tương ứng vào sau dấu `=` của từng biến đã nêu ở trên.
5.  Lưu file và đảm bảo không đẩy file này lên các hệ thống quản lý mã nguồn công khai (**VCS** - Hệ thống quản lý phiên bản giúp theo dõi các thay đổi của mã nguồn như Git).
