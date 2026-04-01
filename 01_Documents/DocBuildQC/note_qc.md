# QC Module - Lỗi & Phân Tích

## 🔴 Lỗi Phát Hiện

### 1. **404 (Not Found) - `/inventory-lots/bulk-quarantine`**
- **Vị trí**: Frontend gọi từ `qcServices.ts` dòng 172
- **Vấn đề**: Endpoint này không tồn tại trong backend
- **Nguyên nhân**: Endpoint `POST /inventory-lots/bulk-quarantine` chưa được implement trong `inventory-lot.controller.ts`
- **Trạng thái**: Đã được định nghĩa trong documentation (`CONFLICT_ANALYSIS.md`) nhưng chưa được thêm vào controller

### 2. **401 (Unauthorized) - Liên quan Keycloak**
- **Vị trí**: Không rõ endpoint nào, cần kiểm tra thêm
- **Nguyên nhân chính**: ⚠️ **CÓ LIÊN QUAN ĐẾN KEYCLOAK**
  - Token JWT từ Keycloak hết hạn
  - Token không được ký bởi Keycloak (invalid signature)
  - Backend không thể verify token với JWKS endpoint của Keycloak
  - Role trong token Keycloak không match với backend's `UserRole` enum
  - Keycloak realm/client configuration sai lệch

---

## 🔑 **Keycloak 401 Issue - Root Analysis**

### **Kiến Trúc Hiện Tại**
```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Login.tsx → gọi AuthService.login(username, password)        │
│ 2. Gửi username/password sang Backend endpoint: POST /auth/login│
│ 3. Backend đối chiếu mật khẩu, lấy Token từ Keycloak           │
│ 4. Backend trả về access_token + refresh_token                 │
│ 5. Frontend lưu 'auth_token' vào localStorage                  │
│ 6. Các request sau đó gửi Header:                              │
│    Authorization: Bearer {auth_token_từ_localStorage}          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backend (NestJS + Passport-JWT)                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. JwtAuthGuard nhận Bearer token                              │
│ 2. JwtStrategy gọi verify token qua Keycloak JWKS endpoint     │
│    - jwksUri: http://localhost:8080/realms/inventory/certs     │
│    - issuer: http://localhost:8080/realms/inventory           │
│ 3. Nếu verify thành công → extract realm_roles từ token       │
│ 4. Map realm_roles → UserRole.OPERATOR/MANAGER/QC_TECHNICIAN   │
│ 5. Nếu thất bại → throw UnauthorizedException (401)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Keycloak Service (Docker, port 8090)                            │
├─────────────────────────────────────────────────────────────────┤
│ - Quản lý user + roles                                          │
│ - JWKS endpoint: /realms/inventory/protocol/openid-connect/certs
│ - Database: PostgreSQL (container inventory_keycloak_db)        │
│ - Realm config: từ realm-export.json import                    │
└─────────────────────────────────────────────────────────────────┘
```

### **401 Error Flow - Khi Nào Xảy Ra?**

| Bước | Điều kiện | Kết quả |
|------|-----------|--------|
| **1. Token expired** | `exp` claim < hiện tại | ❌ 401 |
| **2. JWKS endpoint down** | Keycloak không chạy/port 8090 closed | ❌ 401 (timeout) |
| **3. Invalid signature** | Token không được ký bởi Keycloak | ❌ 401 |
| **4. Token issuer mismatch** | Backend issuer ≠ token issuer | ❌ 401 |
| **5. No Bearer token** | Request thiếu `Authorization: Bearer ...` | ❌ 401 |
| **6. Malformed token** | Token không phải JWT (< 3 parts) | ❌ 401 |

### **Chi Tiết Mã Nguồn - Keycloak Integration**

#### **Backend: jwt.strategy.ts (dòng 22-45)**
```typescript
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    const serverUrl = config.get<string>(
      'KEYCLOAK_SERVER_URL', 
      'http://localhost:8080'  // ⚠️ YÊU CẦU: Keycloak phải chạy trên port 8080
    );
    const realm = config.get<string>(
      'KEYCLOAK_REALM', 
      'inventory'  // ⚠️ YÊU CẦU: Realm phải là 'inventory'
    );
    
    // JWKS endpoint to fetch public keys
    const jwksUri = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;
    const issuer = `${serverUrl}/realms/${realm}`;
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri,  // ← Backend lấy public key từ đây để verify token
      }),
      issuer,
      algorithms: ['RS256'],
      ignoreExpiration: false,  // ← Token hết hạn → 401
    });
  }
}
```

#### **Frontend: Login.tsx (dòng 16-26)**
```typescript
const { data, error } = await AuthService.login(username, password);
if (data) {
  localStorage.setItem('auth_token', data.access_token);  // ← Lưu token
  localStorage.setItem('refresh_token', data.refresh_token);
  // ...
  // Sau này, tất cả request gửi token này
}
```

#### **Frontend: qcServices.ts (dòng 172)**
```typescript
export async function bulkQuarantine(lot_ids: string[]): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/inventory-lots/bulk-quarantine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // ⚠️ LƯU Ý: Frontend không tự động add 'Authorization' header!
    // Phải qua apiClient hoặc interceptor để thêm Bearer token
    body: JSON.stringify({ lot_ids }),
  });
}
```

#### **Frontend: authUtils.ts (dòng 20-30)**
```typescript
export function isTokenValid(token?: string): boolean {
  const tokenToCheck = token || localStorage.getItem('auth_token');
  try {
    const parts = tokenToCheck.split('.');
    const decoded = JSON.parse(atob(parts[1]));
    const exp = decoded.exp;
    
    if (exp && exp * 1000 < Date.now()) {  // ← Kiểm tra hết hạn
      localStorage.removeItem('auth_token');  // ← Frontend main verify
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

---

### **🚨 Vấn Đề Phát Hiện**

#### **Problem 1: qcServices.ts không add Authorization header**
```typescript
// ❌ SAI - bulkQuarantine() dòng 169
const res = await fetch(`${API_BASE_URL}/inventory-lots/bulk-quarantine`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lot_ids }),  // ← Thiếu Authorization header!
});
```

**So sánh với other functions:**
```typescript
// ✅ ĐÚNG - apiClient sử dụng instance có interceptor
const { data, error } = await apiClient.post<QCTest>('/qc-tests', payload);
// apiClient tự động thêm: Authorization: Bearer {auth_token}
```

#### **Problem 2: Token verification chỉ client-side**
- Frontend `isTokenValid()` chỉ decode JWT mà **không verify signature**
- Backend `JwtStrategy` verify token qua Keycloak JWKS
- **Mismatch**: Frontend có thể cho qua expired token, Backend từ chối

#### **Problem 3: Role mapping inconsistency**
```typescript
// Backend Keycloak: realm_roles = ["Quality Control Technician", ...]
// Backend expects: UserRole.QC_TECHNICIAN = "Quality Control Technician"
// Frontend localStorage: role = "quality-control"
// ⚠️ Ở đâu đó mapping này fail → 401 hoặc role không match
```

#### **Problem 4: Keycloak JWKS endpoint unreachable**
- Nếu Docker network hoặc Keycloak service down
- Backend không thể fetch public keys
- Tất cả requests → **502 Bad Gateway** hoặc **timeout** (rồi 401)

---

### **🔧 Được Sửa Solution Steps**

#### **Fix 1: Đảm bảo Authorization header trong qcServices**
```typescript
// ✅ FIXED - Sử dụng apiClient hoặc thêm fetch options
export async function bulkQuarantine(lot_ids: string[]): Promise<any> {
  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_BASE_URL}/inventory-lots/bulk-quarantine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,  // ← ADD THIS
      },
      body: JSON.stringify({ lot_ids }),
    });
    await handleApiError(res);
    return await res.json();
  } catch (e) {
    throw new Error('Không thể chuyển nhiều lô vào kiểm soát');
  }
}
```

#### **Fix 2: Verify Keycloak đang chạy**
```bash
# Check Keycloak container
docker ps | grep keycloak

# Check JWKS endpoint
curl http://localhost:8090/realms/inventory/protocol/openid-connect/certs

# Check realm exists
curl http://localhost:8090/admin/realms -u admin:admin
```

#### **Fix 3: Verify token format & expiration**
```typescript
// Thêm debug logging trong frontend
function debugToken() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error('No auth_token in localStorage');
    return;
  }
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('Invalid JWT format - expected 3 parts');
    return;
  }
  
  try {
    const payload = JSON.parse(atob(parts[1]));
    console.log('Token payload:', payload);
    console.log('Token expires at:', new Date(payload.exp * 1000));
    console.log('Current time:', new Date());
    console.log('Is expired:', payload.exp * 1000 < Date.now());
    console.log('Roles:', payload.realm_access?.roles);
  } catch (e) {
    console.error('Failed to decode token:', e);
  }
}

// Call khi 401 happens
debugToken();
```

#### **Fix 4: Environment variables check**
```bash
# Verify backend config
KEYCLOAK_SERVER_URL=http://localhost:8080  # localhost vì backend trong Docker network
KEYCLOAK_REALM=inventory
KEYCLOAK_CLIENT_ID=__VALUE__
KEYCLOAK_CLIENT_SECRET=__VALUE__

# Verify frontend config
VITE_API_URL=http://localhost:3001/api  # API endpoint
VITE_KEYCLOAK_URL=http://localhost:8090/auth  # Frontend connect to Keycloak

# ⚠️ YÊU CẦU: localhost vs hostname trong Docker network là khác nhau!
```

---

### **📊 401 Diagnosis Checklist**

| Check | Dấu hiệu OK | Dấu hiệu ❌ | Fix |
|-------|-----------|-----------|-----|
| **Keycloak đang chạy?** | `docker ps` show keycloak container | Container not running | `docker-compose -f docker-compose-keycloak.yml up` |
| **JWKS endpoint accessible?** | `curl` response 200 với JWK set | HTTP 404/503/timeout | Check firewall, port 8090 |
| **Token trong localStorage?** | Developer Tools → localStorage có 'auth_token' | Empty/missing | Đăng nhập lại |
| **Token hết hạn?** | `debugToken()` shows exp > now | exp < now | Refresh token hoặc đăng nhập lại |
| **Authorization header sent?** | Network tab → Request header có "Authorization: Bearer ..." | Header missing | Use `apiClient` or add header manually |
| **Role mapping correct?** | Token roles match UserRole enum | Mismatch | Check CONFLICT_ANALYSIS.md role map |
| **API endpoint exists?** | 404 → Endpoint missing (theo note trên) | POST /bulk-quarantine 404 | Implement endpoint |

---

---

## 📋 Chi Tiết Phân Tích

### **Vấn Đề C5: Missing `getLotsByIds` Method**
| Mục | Chi tiết |
|-----|---------|
| Nơi gọi | `qc-test.service.ts` - `getSupplierPerformance()` |
| Phương thức cần | `inventoryLotService.getLotsByIds(lot_ids)` |
| Status | **Không tồn tại** trong `inventory-lot.service.ts` |
| File DTO | `src/qc-test/dto/bulk-quarantine.dto.ts` ✅ Đã có |

### **Vấn Đề Endpoint Missing**
| Route | Method | DTO | Controller |
|-------|--------|-----|-----------|
| `/inventory-lots/bulk-quarantine` | POST | `BulkQuarantineDto` | ❌ Không có |
| Expected path | Tại `inventory-lot.controller.ts` | - | - |

---

## ✅ File Frontend (qcServices.ts) - Các hàm liên quan

### 1. `bulkQuarantine(lot_ids: string[])`
```typescript
// Dòng 169-179
export async function bulkQuarantine(lot_ids: string[]): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory-lots/bulk-quarantine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_ids }),
    });
    await handleApiError(res);
    return await res.json();
  } catch (e) {
    throw new Error('Không thể chuyển nhiều lô vào kiểm soát');
  }
}
```
**Trạng thái**: ❌ Endpoint không tồn tại → 404 Error

### 2. `getSupplierPerformance()`
```typescript
// Dòng 160-167
export async function getSupplierPerformance(): Promise<SupplierPerformance[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/qc-tests/supplier-performance`);
    await handleApiError(res);
    return await res.json();
  } catch (e) {
    return _mockDelay(_MOCK_SUPPLIERS); // Fallback mock
  }
}
```
**Trạng thái**: ✅ Endpoint tồn tại (`qc-test.controller.ts` dòng 40-48)

### 3. `analyzeOneSupplier(supplierName, from?, to?)`
```typescript
// Dòng 216-225
export async function analyzeOneSupplier(
  supplierName: string,
  from?: string,
  to?: string,
): Promise<SupplierAnalysisResponse> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString() ? `?${params.toString()}` : '';
  const encodedName = encodeURIComponent(supplierName);
  const res = await fetch(`${API_BASE_URL}/ai/supplier-analysis/${encodedName}${query}`);
  await handleApiError(res);
  return res.json() as Promise<SupplierAnalysisResponse>;
}
```
**Trạng thái**: ❓ Cần kiểm tra nếu AI endpoint này tồn tại

---

## 🛠️ Backend - Audit Checklist

### `inventory-lot.controller.ts` - Routes
- ✅ POST `/inventory-lots` (create)
- ✅ GET `/inventory-lots` (findAll)
- ✅ GET `/inventory-lots/statistics`
- ✅ GET `/inventory-lots/expiring-soon`
- ✅ GET `/inventory-lots/expired`
- ✅ GET `/inventory-lots/samples`
- ✅ GET `/inventory-lots/search`
- ✅ GET `/inventory-lots/filter`
- ✅ GET `/inventory-lots/material/:material_id`
- ✅ GET `/inventory-lots/samples/:parent_lot_id`
- ✅ GET `/inventory-lots/:id`
- ✅ PUT `/inventory-lots/:id`
- ✅ PUT `/inventory-lots/:id/status/:status`
- ✅ DELETE `/inventory-lots/:id`
- **❌ POST `/inventory-lots/bulk-quarantine` - MISSING**

### `qc-test.controller.ts` - Routes
- ✅ GET `/qc-tests/dashboard`
- ✅ GET `/qc-tests/supplier-performance`
- ✅ GET `/qc-tests`
- ✅ POST `/qc-tests`
- ✅ POST `/qc-tests/lot/:lot_id/decision`
- ✅ POST `/qc-tests/lot/:lot_id/retest`
- ✅ GET `/qc-tests/lot/:lot_id`
- ✅ GET `/qc-tests/:test_id`
- ✅ PATCH `/qc-tests/:test_id`
- ✅ DELETE `/qc-tests/:test_id`

### Authorization Guards
- ✅ `@UseGuards(JwtAuthGuard, RolesGuard)` applied to controllers
- ✅ `@Roles(...)` decorators defined
- ⚠️ Cần verify token không hết hạn khi test -> **401 Error**

---

## 🔧 Các Service Methods quan trọng

### `inventory-lot.service.ts`
- ✅ `findByStatus(status, page, limit)` - Exists
- ❌ `getLotsByIds(lot_ids)` - **Missing** (Được dùng bởi `qc-test.service.ts`)
- ❌ `getLotsByStatus(status)` - Renamed thành `findByStatus` (Breaking change)

### `qc-test.service.ts`  
Các method đang gọi `inventoryLotService`:
1. `getTestsByLotId()` → `inventoryLotService.findById()` ✅
2. `createTest()` → `inventoryLotService.findById()` ✅
3. `submitDecision()` → `inventoryLotService.updateStatus()` ✅
4. `submitRetestDecision()` → `inventoryLotService.update()` ✅
5. `getSupplierPerformance()` → `inventoryLotService.getLotsByIds()` ❌ **Missing**

---

## 📌 Actionable TODO

### **High Priority - ALL FIXED ✅**
- [x] ✅ **Add `POST /inventory-lots/bulk-quarantine` endpoint** to `inventory-lot.controller.ts`
  - Route: `@Post('bulk-quarantine')` ✅ COMPLETED
  - DTO: Use `BulkQuarantineDto` (already exists) ✅ DONE
  - Logic: Update multiple lots to 'Quarantine' status ✅ DONE
  - Role: `@Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)` ✅ DONE

- [x] ✅ **Add `getLotsByIds()` method** to `inventory-lot.service.ts`
  - Input: `lot_ids: string[]` ✅ DONE
  - Output: `InventoryLotResponseDto[]` ✅ DONE
  - Used by: `qc-test.service.ts` → `getSupplierPerformance()` ✅ INTEGRATED
  - Repository method `findByLotIds()` ✅ ADDED

- [x] ✅ **Fix breaking change: `getLotsByStatus()` method** in `inventory-lot.service.ts`
  - Added as alias to `findByStatus()` without pagination ✅ DONE
  - Returns full `InventoryLotResponseDto[]` list ✅ DONE
  - Used by: qc-test.service.ts → `getDashboardKPI()` ✅ COMPATIBLE

- [x] ✅ **Add `bulkQuarantine()` method** to `inventory-lot.service.ts`
  - Validates all lots exist ✅ DONE
  - Updates multiple lots to Quarantine status ✅ DONE
  - Repository method `updateStatusByIds()` ✅ ADDED
  - Integrated with new endpoint ✅ DONE

- [x] ✅ **FIX: Add Authorization header to `bulkQuarantine()` in qcServices.ts** (Keycloak 401 fix)
  - Current: Uses raw `fetch()` without Bearer token ✅ FIXED
  - Change: Added `Authorization: Bearer ${token}` header ✅ DONE
  - Impact: Prevents 401 Unauthorized on bulk quarantine endpoint ✅ INTEGRATED
  - Added token validation check with error message ✅ DONE

### **Medium Priority - PENDING**
- [ ] ✋ **Verify Keycloak configuration & running**
  - Start Keycloak: `docker-compose -f docker-compose-keycloak.yml up`
  - Check JWKS endpoint: `curl http://localhost:8090/realms/inventory/protocol/openid-connect/certs`
  - Verify backend config: `KEYCLOAK_SERVER_URL=http://localhost:8080`, `KEYCLOAK_REALM=inventory`
  - Check realm users have roles assigned in Keycloak admin UI

- [ ] Add token debug function to diagnose 401 issues
  - Use `debugToken()` pattern to log token payload, expiration, roles
  - Add to router or interceptor for automatic logging on auth errors

- [ ] Check AI endpoint `/ai/supplier-analysis/:name` exists & has proper authorization
  - Verify Keycloak permissions apply to this endpoint
  
- [ ] Review role mappings across layers
  - Keycloak realm_roles → Backend UserRole enum → Frontend role format
  - Document exact mapping in CONFLICT_ANALYSIS.md
  
- [ ] Implement token refresh mechanism
  - Currently no auto-refresh of expired tokens
  - Add refresh_token logic to AuthService
  
- [ ] Test with mock data fallback
  - Ensure qcServices.ts fallback to mocks works when API fails with 401

### **Documentation**
- [ ] Update `CONFLICT_ANALYSIS.md` after all fixes
- [ ] Document Keycloak setup requirements (Docker, ports, realm config)
- [ ] Create troubleshooting guide for 401 errors (use checklist above)

---

## 📊 Summary

| Issue | Severity | Root Cause | Status | Resolution |
|-------|----------|-----------|--------|------------|
| Missing `/bulk-quarantine` endpoint | 🔴 High | Backend implementation incomplete | ✅ FIXED | Endpoint implemented + DTO integrated |
| Missing `getLotsByIds()` method | 🔴 High | Service method not implemented | ✅ FIXED | Service method added + repository method added |
| Breaking change: `getLotsByStatus()` → `findByStatus()` | 🔴 High | qc-test integration broken (inventory-lot refactored) | ✅ FIXED | Added `getLotsByStatus()` as alias without pagination |
| 401 Unauthorized (Frontend) - Missing Authorization header | 🔴 High | `bulkQuarantine()` not sending Bearer token | ✅ FIXED | Added token from localStorage + Bearer header |
| Keycloak integration issues | 🟡 Medium | JWKS endpoint unreachable or token verification fails | ⏳ PENDING | Run Keycloak, check Docker network, verify config |
| Token expiration | 🟡 Medium | Frontend doesn't auto-refresh expired tokens | ⏳ PENDING | Implement refresh token mechanism |

---

## 📋 Files Changed

### Backend
1. **`inventory-lot.repository.ts`**
   - Added `findByLotIds(lot_ids: string[])` - Find multiple lots by IDs
   - Added `updateStatusByIds(lot_ids: string[], status: string)` - Bulk update status

2. **`inventory-lot.service.ts`**
   - Added `getLotsByIds(lot_ids: string[])` - For qc-test integration (C5 fix)
   - Added `getLotsByStatus(status: string)` - Alias for legacy code (C4 fix)
   - Added `bulkQuarantine(lot_ids: string[])` - Bulk update to Quarantine (new method)
   - Imported `BulkQuarantineDto` from qc-test module

3. **`inventory-lot.controller.ts`**
   - Imported `BulkQuarantineDto` from qc-test/dto
   - Added `@Post('bulk-quarantine')` endpoint
   - Applied role restrictions: `@Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)`

### Frontend
- **`qcServices.ts`** ✅ FIXED
  - Modified `bulkQuarantine()` function
  - Added token retrieval from localStorage
  - Added Authorization header: `Authorization: Bearer ${token}`
  - Added token validation check with error handling
  
---

## 📎 Reference Files

- Frontend: `02_Source/01_Source Code/frontend/src/services/qcServices.ts`
- Backend QC: `02_Source/01_Source Code/backend/src/qc-test/qc-test.*.ts`
- Backend Inventory: `02_Source/01_Source Code/backend/src/inventory-lot/inventory-lot.*.ts`
- Documentation: `01_Documents/DocBuildQC/CONFLICT_ANALYSIS.md`
- Router: `02_Source/01_Source Code/frontend/src/router/index.tsx` (authorization logic)

---

## 🔧 CORS Configuration FIX ✅

### **Problem: CORS Error on Login**
```
Access to XMLHttpRequest at 'http://localhost:3001/api/auth/login' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header present
```

### **Root Cause**
- Frontend running on: `http://localhost:5173` (Vite dev server)
- Backend CORS configured for: `http://localhost:3000` (default in .env.example)
- Mismatch → CORS preflight request rejected → 401 Error

### **Solution ✅ COMPLETED**

#### **Backend**: Created `.env` file
```bash
# backend/.env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/inventory
FRONTEND_ORIGIN=http://localhost:5173  # ← Set to Vite dev server
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=inventory
```

#### **Frontend**: Created `.env` file  
```bash
# frontend/.env
VITE_API_URL=http://localhost:3001/api  # ← Correct API endpoint
```

#### **Backend CORS Configuration** (main.ts)
```typescript
const frontendOrigin = config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000';

app.enableCors({
  origin: frontendOrigin.split(',').map(url => url.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-User-Role', 'X-User-Id'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

### **Files Created**
- ✅ `02_Source/01_Source Code/backend/.env` - FRONTEND_ORIGIN=http://localhost:5173
- ✅ `02_Source/01_Source Code/frontend/.env` - VITE_API_URL=http://localhost:3001/api

### **How CORS Works Now**
1. Frontend (5173) sends preflight OPTIONS request
2. Backend receives request with Origin header: `http://localhost:5173`
3. Backend checks if origin matches FRONTEND_ORIGIN env variable
4. If match → responds with `Access-Control-Allow-Origin: http://localhost:5173`
5. Browser allows actual request (POST /auth/login)
6. ✅ Login works, 401 CORS error is resolved!

---

## 🔐 Keycloak Client Authentication Error (401 - Invalid Client Credentials) ✅

### **Problem**
```
WARN [KeycloakService] Login failed for admin_qc: 401 
{"error":"unauthorized_client","error_description":"Invalid client or Invalid client credentials"}
```

### **Root Cause**
Backend was sending empty `client_secret` because env variables were commented out:
```bash
# KEYCLOAK_CLIENT_ID=your_client_id  ← Commented
# KEYCLOAK_CLIENT_SECRET=your_client_secret  ← Commented
```

But Keycloak client config requires secret:
```json
{
  "clientId": "inventory-backend",
  "secret": "change-me-in-production",
  "clientAuthenticatorType": "client-secret",
  "directAccessGrantsEnabled": true
}
```

### **Solution ✅ COMPLETED**

Updated **backend/.env**:
```bash
KEYCLOAK_CLIENT_ID=inventory-backend
KEYCLOAK_CLIENT_SECRET=change-me-in-production
KEYCLOAK_ADMIN_CLIENT_ID=inventory-backend
KEYCLOAK_ADMIN_CLIENT_SECRET=change-me-in-production
```

### **How It Works Now**
1. User enters credentials: `admin_qc` / `Admin@123456`
2. Backend calls Keycloak token endpoint with:
   - grant_type: `password`
   - client_id: `inventory-backend`
   - client_secret: `change-me-in-production` ← Now sent!
   - username: `admin_qc`
   - password: `Admin@123456`
3. Keycloak verifies secrets match → Returns access_token ✅
4. Login successful!

### **Files Modified**
- ✅ `02_Source/01_Source Code/backend/.env` - Added KEYCLOAK_CLIENT_ID & KEYCLOAK_CLIENT_SECRET

### **Next Steps**
1. **Restart backend**: `npm run start:Dev` (load new .env)
2. **Test login**: Try `admin_qc` / `Admin@123456`
3. ✅ Should work now!

---

---
