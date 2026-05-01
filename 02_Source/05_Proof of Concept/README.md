# 🚀 Inventory Management - Proof of Concepts (PoC)

Thư mục này chứa các **Proof of Concept** đã được triển khai để kiểm chứng tính khả thi của các tính năng quan trọng trong hệ thống Inventory Management.

---

## 📁 Cấu trúc Thư mục

```
05_Proof of Concept/
├── inventory-backend/          # NestJS Backend
│   └── src/
│       ├── ai/                 # AI Analysis Module
│       ├── auth/               # Authentication Module
│       ├── barcode/            # Barcode Module (MỚI!)
│       ├── qrcode/             # QR Code Module (MỚI!)
│       └── test/               # Test Module
├── inventory-frontend/         # React Frontend
│   └── src/
│       └── components/
│           ├── BarcodeDemo.jsx # Barcode Component (MỚI!)
│           ├── QRCodeDemo.jsx  # QR Code Component (MỚI!)
│           └── QCTestList.jsx  # AI QC Component
├── AI_ANALYSIS_GUIDE.md        # Hướng dẫn PoC AI
├── BARCODE_QRCODE_GUIDE.md     # Hướng dẫn PoC Barcode & QR (MỚI!)
├── README_AI.md                # Quick start AI
├── docker-compose.yml
└── README.md                   # File này
```

---

## 🎯 Danh sách các PoC

### 1️⃣ PoC Authentication với Keycloak ✅
**Trạng thái:** Hoàn thành  
**Mục tiêu:** Kiểm chứng xác thực người dùng với Keycloak (OAuth2/OIDC)

**Tính năng:**
- ✅ Đăng nhập/Đăng ký qua Keycloak
- ✅ Access Token (JWT) management
- ✅ Role-based authorization (Manager, Operator, QC, IT Admin)
- ✅ Token refresh tự động

**Hướng dẫn:** Xem tài liệu chính tại `01_Documents/06_Proof of Concept.md`

---

### 2️⃣ PoC AI Analysis cho Quality Control ✅
**Trạng thái:** Hoàn thành  
**Mục tiêu:** Sử dụng AI (HuggingFace) để phân tích kết quả kiểm định chất lượng

**Tính năng:**
- ✅ Phân tích 5 loại QC test (Vi sinh vật, Độ tinh khiết, Kim loại nặng, Độ ẩm, pH)
- ✅ AI đưa ra nhận xét và khuyến nghị
- ✅ Response time: 3-5 giây
- ✅ Sử dụng model Qwen/Qwen2.5-72B-Instruct

**Hướng dẫn:**
- Quick Start: [README_AI.md](./README_AI.md)
- Chi tiết: [AI_ANALYSIS_GUIDE.md](./AI_ANALYSIS_GUIDE.md)

**Test nhanh:**
```powershell
.\start-dev.ps1
# Mở http://localhost:5173
# Nhấn "🤖 AI Analysis" trên bất kỳ test case nào
```

---

### 3️⃣ PoC Barcode & QR Code ✅ **[MỚI!]**
**Trạng thái:** Hoàn thành  
**Mục tiêu:** Tạo, lưu trữ và tra cứu mã Barcode và QR Code

**Tính năng:**
- ✅ Tạo Barcode CODE128 tự động
- ✅ Tạo QR Code tự động (có thể chứa URL)
- ✅ Tra cứu sản phẩm theo mã
- ✅ Hiển thị và sao chép mã
- ✅ Phân trang danh sách
- ✅ Quét QR Code bằng điện thoại

**Hướng dẫn:** [BARCODE_QRCODE_GUIDE.md](./BARCODE_QRCODE_GUIDE.md)

**Test nhanh:**
```powershell
# Terminal 1 - Backend
cd inventory-backend
npm install
npm run start:dev

# Terminal 2 - Frontend
cd inventory-frontend
npm install
npm install qrcode.react  # Cài thêm QR Code library
npm run dev

# Mở http://localhost:4000
# Nhấn "Barcode Demo" hoặc "QR Code Demo"
```

---

## ⚡ Quick Start - Chạy tất cả PoC

### Yêu cầu hệ thống
- Node.js 18+ & npm
- PowerShell (Windows) hoặc Bash (Linux/Mac)
- Trình duyệt hiện đại (Chrome, Edge, Firefox)

### Khởi động Backend
```powershell
cd inventory-backend
npm install
npm run start:dev
```
✅ Backend chạy tại: **http://localhost:3000**

### Khởi động Frontend
```powershell
cd inventory-frontend
npm install
npm install qrcode.react  # Cài thêm cho QR Code
npm run dev
```
✅ Frontend chạy tại: **http://localhost:4000**

### Test các tính năng

1. **Authentication PoC:**
   - Nhấn "Login" → Đăng nhập qua Keycloak
   - Nhấn "Call API for all users"
   - Nhấn "Call API for managers"

2. **AI Analysis PoC:**
   - Kéo xuống phần "QC Analysis"
   - Nhấn "🤖 AI Analysis" trên bất kỳ test case

3. **Barcode PoC:**
   - Nhấn "Barcode Demo"
   - Nhấn "Tạo Barcode"
   - Xem và sao chép mã

4. **QR Code PoC:**
   - Nhấn "QR Code Demo"
   - Nhấn "Tạo QR Code"
   - Quét bằng điện thoại

---

## 🧪 API Endpoints

### Authentication Endpoints
```
POST /auth/login       # Đăng nhập (nếu dùng local auth)
GET  /test/all         # API cho tất cả users (cần JWT)
GET  /test/manager     # API chỉ cho Manager (cần JWT + role)
```

### AI Endpoints
```
GET  /ai/mock-data             # Lấy mock QC data
POST /ai/analyze-mock          # Phân tích QC test
GET  /ai/test-connection       # Test kết nối HuggingFace
```

### Barcode Endpoints
```
POST /barcode/generate         # Tạo Barcode mới
GET  /barcode                  # Lấy danh sách Barcode
GET  /barcode/:code            # Tra cứu theo mã
```

### QR Code Endpoints
```
POST /qrcode/generate          # Tạo QR Code mới
GET  /qrcode                   # Lấy danh sách QR Code
GET  /qrcode/:code             # Tra cứu theo mã
```

---

## 📊 So sánh các PoC

| PoC | Độ phức tạp | Database | Authentication | Thời gian test |
|-----|------------|----------|----------------|----------------|
| Authentication | ⭐⭐⭐⭐ | MongoDB | ✅ Required | 5 phút |
| AI Analysis | ⭐⭐⭐ | None | ❌ Public | 2 phút |
| Barcode/QR | ⭐⭐ | In-memory | ❌ Public | 3 phút |

---

## 🔧 Troubleshooting

### Backend không khởi động
```powershell
cd inventory-backend
rm -rf node_modules
npm install
npm run start:dev
```

### Frontend không khởi động
```powershell
cd inventory-frontend
rm -rf node_modules
npm install
npm install qrcode.react
npm run dev
```

### Port đã được sử dụng
- Backend (port 3000): Đổi trong `main.ts`
- Frontend (port 4000): Đổi trong `package.json` script

### Module not found: qrcode.react
```powershell
cd inventory-frontend
npm install qrcode.react
```

---

## 📚 Tài liệu Chi tiết

- **Tài liệu chính:** `../../01_Documents/06_Proof of Concept.md`
- **AI Guide:** [AI_ANALYSIS_GUIDE.md](./AI_ANALYSIS_GUIDE.md)
- **Barcode/QR Guide:** [BARCODE_QRCODE_GUIDE.md](./BARCODE_QRCODE_GUIDE.md)
- **Architecture:** `../../01_Documents/05_Architecture.md`
- **Product Backlog:** `../../01_Documents/04_Product Backlog.md`

---

## 🎯 Các bước tiếp theo

### Sau khi PoC thành công:

1. **Tích hợp Database:**
   - MongoDB cho user profiles
   - PostgreSQL cho transactional data

2. **Production-ready:**
   - Thêm validation đầy đủ
   - Implement error handling
   - Thêm logging và monitoring

3. **Security Enhancement:**
   - Token rotation
   - Rate limiting
   - Input sanitization

4. **Feature Extension:**
   - Camera scanning cho Barcode/QR
   - Print labels
   - Batch operations

---

## ✨ Contributors

Được phát triển bởi nhóm Inventory Management Team để kiểm chứng tính khả thi kỹ thuật trước khi triển khai chính thức.

---

**Last Updated:** March 3, 2026  
**Version:** 1.0.0  
**Status:** All PoCs Complete ✅
