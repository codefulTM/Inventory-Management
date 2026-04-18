# API Template - Hướng Dẫn Sử Dụng

Một template hoàn chỉnh để gọi API từ backend với error handling tổng quát và có thể tái sử dụng.

## 📁 File Structure

```
src/
├── services/
│   ├── api.ts                 # API client wrapper (main)
│   ├── api-examples.ts        # Ví dụ sử dụng
│   └── api.service.ts         # Service classes (Material, Inventory, etc)
├── hooks/
│   └── useApi.ts              # Custom hook để fetch data
├── utils/
│   └── error-handler.ts       # Xử lý error tổng quát
└── types/
    └── api.ts                 # Type definitions
```

---

## 🚀 Quick Start

### 1. Import API Client

```typescript
import { apiClient } from "@/services/api";
```

### 2. Gọi API - Cách Đơn Giản

```typescript
// GET
const { data, error } = await apiClient.get("/materials");
if (error) {
  console.error(error.message);
  return;
}
console.log(data);

// POST
const { data, error } = await apiClient.post("/materials", {
  name: "Paracetamol",
});

// PUT
const { data, error } = await apiClient.put("/materials/123", {
  name: "Updated Name",
});

// DELETE
const { data, error } = await apiClient.delete("/materials/123");
```

---

## 🎣 Custom Hook - useApi

### Cách Sử Dụng

```typescript
import { useApi } from '@/hooks/useApi';

function MyComponent() {
  // GET: Auto fetch khi component mount
  const { data, loading, error, refetch } = useApi('/materials');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Hook Parameters

```typescript
const { data, loading, error, refetch, setData, setError } = useApi<T>(
  "/endpoint", // URL (null = không gọi API tự động)
  "GET", // Method: GET, POST, PUT, DELETE, PATCH
  formData, // Payload (cho POST, PUT, PATCH)
  options, // FetchOptions: params, headers, timeout, etc
);
```

### Với Lazy Loading (không gọi API ngay)

```typescript
const { data, loading, error, refetch } = useApi<Material>(
  null, // không gọi API lúc mount
  "POST",
  formData,
);

// Gọi API sau khi user click button
const handleSubmit = async () => {
  await refetch();
};
```

---

## 🏗️ Service Pattern

### Tạo Service Class

```typescript
import { apiClient } from "@/services/api";
import type { Material } from "@/types/material";

export class MaterialService {
  static async getAll(page = 1, limit = 10) {
    const { data, error } = await apiClient.get("/materials", {
      params: { page, limit },
    });
    return { materials: data, error };
  }

  static async getById(id: string) {
    const { data, error } = await apiClient.get<Material>(`/materials/${id}`);
    return { material: data, error };
  }

  static async create(payload: Partial<Material>) {
    const { data, error } = await apiClient.post<Material>(
      "/materials",
      payload,
    );
    return { material: data, error };
  }

  static async update(id: string, payload: Partial<Material>) {
    const { data, error } = await apiClient.put<Material>(
      `/materials/${id}`,
      payload,
    );
    return { material: data, error };
  }

  static async delete(id: string) {
    const { data, error } = await apiClient.delete(`/materials/${id}`);
    return { success: !error, error };
  }
}
```

### Sử Dụng Service

```typescript
const { material, error } = await MaterialService.getById("123");
if (error) {
  console.error("Failed:", error.message);
  return;
}
console.log(material);
```

---

## ❌ Error Handling

### Error Object Structure

```typescript
interface ApiErrorResponse {
  type: ErrorType; // Error type enum
  message: string; // Human-readable message
  statusCode?: number; // HTTP status code
  data?: any; // API response body
  originalError?: Error; // Original axios/fetch error
}

enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}
```

### Xử Lý Error Cụ Thể

```typescript
const { data, error } = await apiClient.post("/materials", formData);

if (error) {
  switch (error.type) {
    case ErrorType.VALIDATION_ERROR:
      // Hiển thị field errors từ form
      const fieldErrors = parseValidationErrors(error);
      setFormErrors(fieldErrors);
      break;

    case ErrorType.UNAUTHORIZED:
      // Redirect to login
      window.location.href = "/login";
      break;

    case ErrorType.NETWORK_ERROR:
      // Thử lại
      const result = await retryApiCall(
        () => apiClient.post("/materials", formData),
        3,
        1000,
      );
      break;

    default:
      // Hiển thị generic error
      notify({ message: error.message, type: "error" });
  }
}
```

### Global Error Handler

```typescript
import { handleApiError, logApiError } from "@/utils/error-handler";

const { data, error } = await apiClient.get("/materials");

if (error) {
  // Auto handle error với user-friendly message
  handleApiError(error);

  // Log cho debugging
  logApiError(error, "fetch_materials");
}
```

---

## 📝 Form Submission

```typescript
import { useApi } from '@/hooks/useApi';
import { parseValidationErrors, handleApiError } from '@/utils/error-handler';

function MaterialForm() {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const { data, error } = await apiClient.post(
      '/materials',
      formData
    );

    if (error) {
      if (error.type === ErrorType.VALIDATION_ERROR) {
        setFormErrors(parseValidationErrors(error));
      } else {
        handleApiError(error);
      }
      return;
    }

    console.log('Created:', data);
    setFormData({});
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* fields */}
      {formErrors.name && <span className="error">{formErrors.name}</span>}
    </form>
  );
}
```

---

## 🔄 Auto Retry

```typescript
import { retryApiCall } from "@/utils/error-handler";

// Auto retry 3 times with exponential backoff
const material = await retryApiCall(
  () => apiClient.get("/materials/123"),
  3, // max attempts
  1000, // initial delay in ms
);

if (!material) {
  console.error("Failed after retries");
}
```

---

## 🔐 Authentication

Token được tự động thêm vào mỗi request:

```typescript
// API client auto xử lý:
// 1. Lấy token từ localStorage
const token = localStorage.getItem("auth_token");

// 2. Thêm vào Authorization header
headers.Authorization = `Bearer ${token}`;

// 3. Nếu 401 Unauthorized -> redirect to login
if (error.statusCode === 401) {
  window.location.href = "/login";
}
```

---

## 🧪 Testing

```typescript
import { apiClient } from "@/services/api";

describe("API Client", () => {
  it("should fetch materials", async () => {
    const { data, error } = await apiClient.get("/materials");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should handle errors", async () => {
    const { data, error } = await apiClient.get("/invalid-endpoint");
    expect(data).toBeNull();
    expect(error).toBeDefined();
    expect(error?.type).toBeDefined();
  });
});
```

---

## 📦 Configuration

### Environment Variables (.env)

```env
VITE_API_URL=http://localhost:3000/api
```

### Custom API Client (nếu cần)

```typescript
import ApiClient from "@/services/api";

const customApiClient = new ApiClient("https://api.example.com");

// Sử dụng
const { data, error } = await customApiClient.get("/materials");
```

---

## 📊 Response Format

### Backend API Response (expected format)

```typescript
// Success response
{
  success: true,
  data: { id: 1, name: 'Material' },
  message: 'Success'
}

// Error response
{
  success: false,
  error: 'Validation failed',
  message: 'Validation failed',
  statusCode: 400,
  details: [{
    property: 'name',
    constraints: { isNotEmpty: 'name should not be empty' }
  }]
}
```

---

## 💡 Best Practices

1. **Luôn check error** sau khi API call:

   ```typescript
   if (error) {
     /* handle */
   }
   ```

2. **Sử dụng Service classes** để reuse logic:

   ```typescript
   const { data } = await MaterialService.getAll();
   ```

3. **Type everything** với TypeScript:

   ```typescript
   const { data } = await apiClient.get<Material>("/materials/1");
   ```

4. **Xử lý loading state** khi fetch data:

   ```typescript
   if (loading) return <Loading />;
   ```

5. **Reuse hook** cho common patterns:

   ```typescript
   const { data, refetch } = useApi("/materials");
   ```

6. **Log errors** cho debugging:
   ```typescript
   if (error) logApiError(error, "context");
   ```

---

## 🎯 Summary

| Task         | How                                       |
| ------------ | ----------------------------------------- |
| Generate GET | `apiClient.get<T>('/url')`                |
| Simple POST  | `apiClient.post<T>('/url', data)`         |
| Hook fetch   | `const { data } = useApi('/url')`         |
| Service call | `const { data } = await Service.method()` |
| Handle error | `if (error) { handleApiError(error) }`    |
| Retry        | `await retryApiCall(fn, 3, 1000)`         |
| Form errors  | `parseValidationErrors(error)`            |
| Log debug    | `logApiError(error, 'context')`           |

---

Generated: 2026-03-08
