# 🏷️ Hướng dẫn Test PoC Barcode & QR Code

## 📋 Tổng quan

PoC Barcode & QR Code cho phép tạo, lưu trữ và tra cứu mã vạch và mã QR cho sản phẩm trong hệ thống Inventory Management.

### Công nghệ:
- **Backend**: NestJS với in-memory storage
- **Frontend**: React với `react-barcode` và `qrcode.react`
- **Authentication**: Không cần (Public endpoints để test)

---

## 🚀 Cách chạy hệ thống

### Bước 1: Khởi động Backend (NestJS)

```powershell
# Di chuyển đến thư mục backend
cd "02_Source/05_Proof of Concept/inventory-backend"

# Cài đặt dependencies (nếu chưa cài)
npm install

# Khởi động backend ở chế độ development
npm run start:dev
```

✅ Backend sẽ chạy tại: **http://localhost:3000**

**Kiểm tra backend đang hoạt động:**
```powershell
# Test Barcode API
curl http://localhost:3000/barcode

# Test QR Code API
curl http://localhost:3000/qrcode
```

---

### Bước 2: Khởi động Frontend (React)

**Mở terminal mới** (giữ backend đang chạy):

```powershell
# Di chuyển đến thư mục frontend
cd "02_Source/05_Proof of Concept/inventory-frontend"

# Cài đặt dependencies (nếu chưa cài)
npm install

# Cài đặt thư viện QR Code (MỚI!)
npm install qrcode.react

# Khởi động frontend
npm run dev
```

✅ Frontend sẽ chạy tại: **http://localhost:4000**

---

## 🧪 Cách Test Chức năng

### 1️⃣ Test Barcode qua Giao diện

1. Mở trình duyệt: **http://localhost:4000**
2. Nhấn nút **"Barcode Demo"**
3. Trên màn hình Barcode:
   - Nhấn **"Tạo Barcode"**
   - Nhập tên sản phẩm (VD: "Máy tính Dell XPS")
   - Nhập mô tả (VD: "Laptop cao cấp")
   - Nhấn **"Xác nhận"**
4. Xem kết quả:
   - Barcode CODE128 hiển thị ngay lập tức
   - Mã có dạng: `BC1234567890123`
   - Nhấn **"Copy"** để sao chép mã
5. Test tìm kiếm:
   - Nhập mã vào ô tìm kiếm
   - Nhấn **"Tìm kiếm"**
   - Xem thông tin sản phẩm hiển thị

---

### 2️⃣ Test QR Code qua Giao diện

1. Từ màn hình chính, nhấn nút **"QR Code Demo"**
2. Trên màn hình QR Code:
   - Nhấn **"Tạo QR Code"**
   - Nhập tên sản phẩm (VD: "iPhone 15 Pro")
   - Nhập mô tả (VD: "Smartphone cao cấp")
   - Nhập URL (tùy chọn, VD: "https://apple.com/iphone-15")
   - Nhấn **"Xác nhận"**
3. Xem kết quả:
   - QR Code SVG hiển thị ngay lập tức
   - Mã có dạng: `QR1234567890123`
   - URL mặc định: `https://inventory.example.com/product/QR...`
   - Dùng điện thoại quét QR Code để mở URL
4. Test tìm kiếm:
   - Nhập mã vào ô tìm kiếm
   - Nhấn **"Tìm kiếm"**
   - Xem thông tin và quét lại QR Code

---

### 3️⃣ Test qua API (curl/Postman)

#### Barcode API

**Tạo Barcode:**
```powershell
curl -X POST http://localhost:3000/barcode/generate `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Laptop Dell XPS 15",
    "description": "High-end laptop"
  }'
```

**Response:**
```json
{
  "code": "BC17096429381234",
  "name": "Laptop Dell XPS 15",
  "description": "High-end laptop"
}
```

**Lấy danh sách Barcode:**
```powershell
curl http://localhost:3000/barcode
```

**Tra cứu Barcode theo mã:**
```powershell
curl http://localhost:3000/barcode/BC17096429381234
```

---

#### QR Code API

**Tạo QR Code:**
```powershell
curl -X POST http://localhost:3000/qrcode/generate `
  -H "Content-Type: application/json" `
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Smartphone",
    "url": "https://apple.com/iphone"
  }'
```

**Response:**
```json
{
  "code": "QR17096429381234",
  "name": "iPhone 15 Pro",
  "description": "Smartphone",
  "url": "https://apple.com/iphone"
}
```

**Lấy danh sách QR Code:**
```powershell
curl http://localhost:3000/qrcode
```

**Tra cứu QR Code theo mã:**
```powershell
curl http://localhost:3000/qrcode/QR17096429381234
```

---

## 📱 Test Quét QR Code bằng Điện thoại

1. Tạo QR Code trên giao diện web
2. Mở app Camera trên iPhone hoặc app QR Scanner trên Android
3. Quét QR Code hiển thị trên màn hình
4. Điện thoại sẽ mở URL đã được mã hóa trong QR Code
5. Xác nhận URL chính xác

---

## 🎯 Các Test Cases Mẫu

### Barcode Test Cases

| Tên sản phẩm | Mô tả | Kết quả mong đợi |
|-------------|-------|------------------|
| Laptop Dell XPS | Laptop cao cấp | Barcode CODE128 hiển thị đúng |
| Mouse Logitech | Chuột không dây | Barcode có thể tra cứu được |
| Keyboard Mechanical | Bàn phím cơ | Copy mã thành công |

### QR Code Test Cases

| Tên sản phẩm | URL | Kết quả mong đợi |
|-------------|-----|------------------|
| iPhone 15 | https://apple.com | QR quét được, mở đúng URL |
| Samsung Galaxy | (để trống) | QR dùng URL mặc định |
| Headphone Sony | https://sony.com/headphones | QR Code hiển thị đúng |

---

## 🔧 Troubleshooting

### Lỗi: "Module not found: qrcode.react"
```powershell
cd inventory-frontend
npm install qrcode.react
```

### Lỗi: Backend không khởi động
```powershell
cd inventory-backend
rm -rf node_modules
npm install
npm run start:dev
```

### Lỗi: "Cannot read properties of undefined"
- Đảm bảo backend đang chạy trước khi mở frontend
- Kiểm tra URL API trong component: `http://localhost:3000`

### QR Code không quét được
- Đảm bảo màn hình đủ sáng
- Zoom QR Code lớn hơn nếu cần (tăng `size` prop)
- Kiểm tra URL có hợp lệ không

---

## 📝 Ghi chú Quan trọng

- **Dữ liệu tạm thời**: Mã Barcode và QR Code lưu trong memory, mất khi restart server
- **Không cần đăng nhập**: Endpoints là public để test nhanh
- **Phân trang**: Mỗi trang hiển thị 2 items
- **Format mã**: 
  - Barcode: `BC{timestamp}{random}` (CODE128)
  - QR Code: `QR{timestamp}{random}` (QR Code Level M)

---

## ✅ Checklist Test

- [ ] Backend khởi động thành công
- [ ] Frontend khởi động thành công
- [ ] Tạo Barcode mới
- [ ] Hiển thị Barcode CODE128
- [ ] Tra cứu Barcode
- [ ] Copy mã Barcode
- [ ] Tạo QR Code mới
- [ ] Hiển thị QR Code
- [ ] Quét QR Code bằng điện thoại
- [ ] Tra cứu QR Code
- [ ] Copy mã QR Code
- [ ] Phân trang hoạt động
- [ ] Tìm kiếm hoạt động

---

**Chúc bạn test thành công! 🎉**
