# Frontend Coding Steps — Module QC Test (UI Integration)

> **Dành cho agent thực thi code.**
> - Tham chiếu UI hiện có: `src/app/pages/QualityControl/` (5 file đã có giao diện mock)
> - Tham chiếu nghiệp vụ: `01_Documents/QC_details.md`
> - Tham chiếu API: `be_coding_step.md` (endpoints đã định nghĩa ở backend)
> - Tech stack: React 18, TypeScript, Tailwind CSS, React Router, Vite/`@/` alias
>
> **Mục tiêu tổng thể:** Chuyển toàn bộ 5 màn hình QC từ dùng mock data sang gọi API thực từ backend `http://localhost:3000`.
>
> **Sau mỗi step, dừng lại và hỏi user:**
> ```
> ✅ Step X hoàn thành.
> 1. Continue — tiếp tục step tiếp theo
> 2. Review   — xem lại code vừa viết trước khi tiếp tục
> ```

---

## Tổng quan luồng thực thi

```
Step 1 → API types + service layer (nền tảng dùng chung)
Step 2 → Dashboard.tsx (KPI + pending list từ API)
Step 3 → PendingBatch.tsx (form kiểm định + submit decision)
Step 4 → Products.tsx (ProductionBatch QC + auto InventoryLot)
Step 5 → InventoryQA.tsx (Re-test + Bulk Quarantine)
Step 6 → Traceability.tsx (Timeline + Supplier Performance)
Step 7 → Kiểm tra tích hợp toàn bộ module
```

---

## Conventions bắt buộc (đọc trước khi code)

### Patterns từ code hiện tại

| Quy tắc | Ví dụ từ code hiện có |
| :------ | :-------------------- |
| Import Layout | `import Layout from "@/app/components/Layout"` |
| Cấu trúc page | `<Layout title="..."><div className="space-y-6">...</div></Layout>` |
| Table header style | `text-[10px] font-black uppercase tracking-widest text-gray-400` |
| Badge pending | `bg-yellow-100 text-yellow-700` |
| Badge approved | `bg-green-100 text-green-700` |
| Badge rejected | `bg-red-100 text-red-700` |
| Badge hold | `bg-gray-100 text-gray-500` |
| Button primary | `bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-700 transition` |
| Card container | `bg-white rounded-xl shadow-sm border border-gray-100` |
| Search input | `pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm` |

### Xử lý loading & error (thay thế alert())

- **Loading state:** Hiện spinner hoặc text "Đang tải..." trong phần tử tương ứng
- **Error state:** Hiện banner đỏ: `bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg`
- **Submit feedback:** Thay `alert()` bằng inline state message (xanh lá hoặc đỏ)
- **Không dùng** thư viện toast bên ngoài (giữ dependencies tối thiểu)

### API Base URL

```typescript
// src/app/services/api.ts
const API_BASE = "http://localhost:3000";
```

---

## Step 1 — API Types & Service Layer

**Mục tiêu:** Tạo lớp abstraction giữa UI và backend. Mọi API call phải đi qua service layer này — không fetch trực tiếp trong component.

### 1.1 Tạo file types

**File:** `src/app/types/qc.types.ts`

```typescript
// === INVENTORY LOT ===
export type LotStatus = 'Quarantine' | 'Accepted' | 'Rejected' | 'Hold' | 'Depleted';

export interface InventoryLot {
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name?: string;
  received_date: string;       // ISO date string
  expiration_date: string;     // ISO date string
  in_use_expiration_date?: string;
  status: LotStatus;
  quantity: number;            // Decimal128 từ MongoDB → parse thành number
  unit_of_measure: string;
  storage_location?: string;
  is_sample: boolean;
  created_date: string;
  modified_date: string;
}

// === QC TEST ===
export type TestType = 'Identity' | 'Potency' | 'Microbial' | 'Growth Promotion' | 'Physical' | 'Chemical';
export type ResultStatus = 'Pass' | 'Fail' | 'Pending';

export interface QCTest {
  test_id: string;
  lot_id: string;
  test_type: TestType;
  test_method: string;
  test_date: string;
  test_result: string;
  acceptance_criteria?: string;
  result_status: ResultStatus;
  performed_by: string;
  verified_by?: string;
  reject_reason?: string;
  label_id?: string;
  created_date: string;
  modified_date: string;
}

// === PRODUCTION BATCH ===
export type BatchStatus = 'In Progress' | 'Complete' | 'On Hold' | 'Cancelled';

export interface ProductionBatch {
  batch_id: string;
  product_id: string;
  batch_number: string;
  batch_size: number;
  unit_of_measure: string;
  manufacture_date: string;
  expiration_date: string;
  status: BatchStatus;
  created_date: string;
  modified_date: string;
}

// === PAYLOADS ===
export interface CreateQCTestPayload {
  lot_id: string;
  test_type: TestType;
  test_method: string;
  test_date: string;
  test_result: string;
  acceptance_criteria?: string;
  result_status: ResultStatus;
  performed_by: string;
  verified_by?: string;
  reject_reason?: string;
  label_id?: string;
}

export interface QCDecisionPayload {
  decision: 'Accepted' | 'Rejected' | 'Hold';
  reject_reason?: string;
  label_id?: string;
  verified_by: string;
}

export interface RetestPayload {
  action: 'extend' | 'discard';
  new_expiry_date?: string;    // required nếu action = 'extend'
  performed_by: string;
}

export interface BulkQuarantinePayload {
  lot_ids: string[];
}

// === RESPONSES ===
export interface DashboardKPI {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  error_rate: number;
}

export interface SupplierPerformance {
  supplier_name: string;
  total_batches: number;
  approved: number;
  rejected: number;
  quality_rate: number;
}
```

### 1.2 Tạo API service

**File:** `src/app/services/qcService.ts`

```typescript
const BASE = "http://localhost:3000";

// Helper fetch wrapper với error handling
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
```

Implement các hàm sau trong cùng file:

```typescript
// --- DASHBOARD ---
export const getDashboardKPI = () =>
  apiFetch<DashboardKPI>("/qc-tests/dashboard");

// --- INVENTORY LOT ---
export const getLotsByStatus = (status: string) =>
  apiFetch<InventoryLot[]>(`/inventory-lots?status=${status}`);

export const getLotById = (lot_id: string) =>
  apiFetch<InventoryLot>(`/inventory-lots/${lot_id}`);

export const bulkQuarantine = (payload: BulkQuarantinePayload) =>
  apiFetch<{ updated: number }>("/inventory-lots/bulk-quarantine", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// --- QC TESTS ---
export const getQCTests = (filter?: { result_status?: string; test_type?: string }) => {
  const params = new URLSearchParams(filter as Record<string, string>).toString();
  return apiFetch<QCTest[]>(`/qc-tests${params ? `?${params}` : ""}`);
};

export const getTestsByLotId = (lot_id: string) =>
  apiFetch<QCTest[]>(`/qc-tests/lot/${lot_id}`);

export const createQCTest = (payload: CreateQCTestPayload) =>
  apiFetch<QCTest>("/qc-tests", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const submitDecision = (lot_id: string, payload: QCDecisionPayload) =>
  apiFetch<{ lot: InventoryLot; tests: QCTest[] }>(
    `/qc-tests/lot/${lot_id}/decision`,
    { method: "POST", body: JSON.stringify(payload) },
  );

export const submitRetestDecision = (lot_id: string, payload: RetestPayload) =>
  apiFetch<InventoryLot>(`/qc-tests/lot/${lot_id}/retest`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getSupplierPerformance = (from?: string, to?: string) => {
  const params = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString();
  return apiFetch<SupplierPerformance[]>(
    `/qc-tests/supplier-performance${params ? `?${params}` : ""}`,
  );
};

// --- PRODUCTION BATCH ---
export const getPendingProductionBatches = () =>
  apiFetch<ProductionBatch[]>(`/production-batches?status=In%20Progress`);

export const completeProductionBatchQC = (batch_id: string, payload: QCDecisionPayload) =>
  apiFetch<{ batch: ProductionBatch; inventoryLot?: InventoryLot }>(
    `/production-batches/${batch_id}/qc-complete`,
    { method: "POST", body: JSON.stringify(payload) },
  );
```

### 1.3 Tạo custom hook useAsync (tái sử dụng)

**File:** `src/app/hooks/useAsync.ts`

```typescript
import { useState, useCallback } from "react";

export function useAsync<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: A): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi không xác định");
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );

  return { loading, error, execute };
}
```

### 1.4 Tạo component ErrorBanner & LoadingRow (tái sử dụng)

**File:** `src/app/components/ui/ErrorBanner.tsx`

```tsx
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
      ⚠️ {message}
    </div>
  );
}
```

**File:** `src/app/components/ui/LoadingRow.tsx`

```tsx
export function LoadingRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-6 py-8 text-center text-gray-400 text-sm font-medium">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Đang tải dữ liệu...
        </div>
      </td>
    </tr>
  );
}
```

---

> **Checkpoint Step 1**
> ```
> 1. Continue
> 2. Review
> ```

---

## Step 2 — Dashboard.tsx

**File:** `src/app/pages/QualityControl/Dashboard.tsx`

**Mục tiêu:** Thay thế mock data `stats` và `pendingBatches` bằng dữ liệu thực từ API. Giữ nguyên toàn bộ JSX/Tailwind đang hoạt động — chỉ thay nguồn data.

### 2.1 Thêm state & API call

Thêm imports:
```tsx
import { useEffect, useState } from "react";
import { getDashboardKPI, getLotsByStatus } from "@/app/services/qcService";
import type { DashboardKPI, InventoryLot } from "@/app/types/qc.types";
import { ErrorBanner } from "@/app/components/ui/ErrorBanner";
```

Thay thế toàn bộ mock `stats` và `pendingBatches` bằng:

```tsx
const [kpi, setKpi] = useState<DashboardKPI | null>(null);
const [pendingLots, setPendingLots] = useState<InventoryLot[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, lots] = await Promise.all([
        getDashboardKPI(),
        getLotsByStatus("Quarantine"),
      ]);
      setKpi(kpiData);
      setPendingLots(lots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);
```

### 2.2 Cập nhật stats array (dùng kpi state)

```tsx
const stats = [
  {
    title: "Chờ lấy mẫu",
    value: kpi ? String(kpi.pending_count) : "—",
    icon: <Clock className="w-8 h-8 text-amber-500" />,
    color: "bg-amber-50",
    subText: "Yêu cầu mới từ Inbound",
  },
  {
    title: "Đạt chuẩn (Approved)",
    value: kpi ? String(kpi.approved_count) : "—",
    icon: <CheckCircle className="w-8 h-8 text-emerald-500" />,
    color: "bg-emerald-50",
    subText: "Trong tháng này",
  },
  {
    title: "Từ chối (Rejected)",
    value: kpi ? String(kpi.rejected_count) : "—",
    icon: <XCircle className="w-8 h-8 text-red-500" />,
    color: "bg-red-50",
    subText: "Cần lập biên bản lỗi",
  },
  {
    title: "Tỷ lệ lỗi trung bình",
    value: kpi ? `${kpi.error_rate.toFixed(1)}%` : "—",
    icon: <ShieldAlert className="w-8 h-8 text-blue-500" />,
    color: "bg-blue-50",
    subText: "So với tháng trước",
  },
];
```

### 2.3 Cập nhật bảng pending batches

Thay vì render từ `pendingBatches` mock, render từ `pendingLots.slice(0, 3)`.

Mapping data:

| UI field | API field |
| :------- | :-------- |
| `batch.id` | `lot.lot_id` |
| `batch.name` | `lot.manufacturer_lot` (mã lô) — cần thêm `lot.material_id` làm sub-text |
| `batch.supplier` | `lot.supplier_name ?? lot.manufacturer_name` |
| `batch.quantity` | `` `${lot.quantity} ${lot.unit_of_measure}` `` |
| Priority | Nếu `lot.expiration_date` ≤ 30 ngày → "HIGH", ngược lại "NORMAL" |

### 2.4 Xử lý loading & error

- Khi `loading = true`: Hiện spinner thay cho bảng và KPI cards
- Khi `error != null`: Hiện `<ErrorBanner message={error} />` ở đầu trang
- Nếu `pendingLots.length === 0` và không loading: Hiện dòng empty state trong bảng

---

> **Checkpoint Step 2**
> ```
> 1. Continue
> 2. Review
> ```

---

## Step 3 — PendingBatch.tsx

**File:** `src/app/pages/QualityControl/PendingBatch.tsx`

**Mục tiêu:** Tải danh sách `InventoryLot` theo status từ API, gửi kết quả kiểm định lên backend qua `submitDecision()`. Giữ nguyên toàn bộ modal UI và form validation hiện tại.

### 3.1 Thay state dữ liệu

Xóa mock `useState<Batch[]>([...])`. Thay bằng:

```tsx
import { useEffect, useState } from "react";
import {
  getLotsByStatus,
  submitDecision,
  createQCTest,
} from "@/app/services/qcService";
import type { InventoryLot, QCDecisionPayload } from "@/app/types/qc.types";
import { ErrorBanner } from "@/app/components/ui/ErrorBanner";
import { LoadingRow } from "@/app/components/ui/LoadingRow";
```

```tsx
const [lots, setLots] = useState<InventoryLot[]>([]);
const [fetching, setFetching] = useState(true);
const [fetchError, setFetchError] = useState<string | null>(null);
const [submitting, setSubmitting] = useState(false);
const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
```

### 3.2 Load data khi mount + refetch khi filter thay đổi

```tsx
useEffect(() => {
  const load = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      // API không có filter status trên /inventory-lots — lấy tất cả rồi lọc client-side
      // HOẶC nếu backend hỗ trợ ?status= thì dùng trực tiếp
      const all = await getLotsByStatus(filterStatus === "all" ? "" : filterStatus);
      setLots(all);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Không thể tải danh sách lô hàng");
    } finally {
      setFetching(false);
    }
  };
  load();
}, [filterStatus]);
```

### 3.3 Interface mapping

Thay `Batch` interface cũ bằng dùng trực tiếp `InventoryLot` từ types:

```tsx
const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
```

Cập nhật bảng render:

| Cột UI | Field InventoryLot |
| :----- | :----------------- |
| Mã lô | `lot.lot_id` |
| Tên nguyên liệu | `lot.manufacturer_lot` (hiện `lot.material_id` bên dưới dạng badge nhỏ) |
| Nhà cung cấp | `lot.supplier_name ?? lot.manufacturer_name` |
| Trạng thái badge | `lot.status` (map sang màu như hiện tại) |
| Nút thao tác | `onClick={() => setSelectedLot(lot)}` |

### 3.4 Phần thông tin Spec (chỉ đọc) trong modal

Hiện tại dùng `selectedBatch.specs`. Khi dùng `InventoryLot` thực, không có sẵn `specs`. Xử lý như sau:

- Giữ `specs` là state local trong modal, với giá trị mặc định hợp lý: `{ moisture: 5.0, purity: 98.0 }`.
- Hiển thị: `Ngưỡng độ ẩm: ≤ 5.0% | Độ tinh khiết: ≥ 98.0%`
- Ghi chú trong code: `// TODO: Lấy specs từ Material spec khi API hỗ trợ`

### 3.5 Thay handleFinalSubmit — gọi API thực

```tsx
const handleFinalSubmit = async () => {
  if (!selectedLot) return;
  if (!decision) return setSubmitMsg({ type: "error", text: "Vui lòng chọn quyết định trạng thái lô hàng!" });
  if (!label) return setSubmitMsg({ type: "error", text: "Vui lòng chọn nhãn cho lô hàng!" });
  if (decision === "rejected" && !rejectReason)
    return setSubmitMsg({ type: "error", text: "Bắt buộc nhập lý do từ chối!" });

  setSubmitting(true);
  setSubmitMsg(null);

  try {
    // Bước 1: Tạo QCTest với kết quả đo
    await createQCTest({
      lot_id: selectedLot.lot_id,
      test_type: "Physical",
      test_method: "Manual Inspection",
      test_date: new Date().toISOString().split("T")[0],
      test_result: `Độ ẩm: ${testResults.moisture}%, Tinh khiết: ${testResults.purity}%, Cảm quan: ${testResults.sensory}`,
      result_status: "Pending",
      performed_by: "qc_user",  // TODO: lấy từ AuthContext user.username
    });

    // Bước 2: Submit quyết định
    const payload: QCDecisionPayload = {
      decision: decision === "approved" ? "Accepted" : decision === "rejected" ? "Rejected" : "Hold",
      reject_reason: rejectReason || undefined,
      label_id: label || undefined,
      verified_by: "qc_user",  // TODO: lấy từ AuthContext
    };
    await submitDecision(selectedLot.lot_id, payload);

    // Bước 3: Cập nhật UI local (không cần refetch toàn bộ)
    setLots((prev) =>
      prev.map((l) =>
        l.lot_id === selectedLot.lot_id
          ? { ...l, status: payload.decision }
          : l,
      ),
    );

    setSubmitMsg({ type: "success", text: `Lô ${selectedLot.lot_id} đã được cập nhật: ${payload.decision}` });
    setTimeout(() => {
      setSelectedLot(null);
      setDecision("");
      setLabel("");
      setRejectReason("");
      setSubmitMsg(null);
    }, 1500);
  } catch (e) {
    setSubmitMsg({ type: "error", text: e instanceof Error ? e.message : "Gửi thất bại, thử lại sau." });
  } finally {
    setSubmitting(false);
  }
};
```

### 3.6 Hiển thị inline message

Thêm trước nút hành động trong modal:

```tsx
{submitMsg && (
  <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
    submitMsg.type === "success"
      ? "bg-green-50 border border-green-200 text-green-700"
      : "bg-red-50 border border-red-200 text-red-700"
  }`}>
    {submitMsg.text}
  </div>
)}
```

Nút submit:
```tsx
<button
  onClick={handleFinalSubmit}
  disabled={submitting}
  className="... disabled:opacity-60 disabled:cursor-not-allowed"
>
  {submitting ? "Đang xử lý..." : "XÁC NHẬN & CẬP NHẬT HỆ THỐNG"}
</button>
```

---

> **Checkpoint Step 3**
> ```
> 1. Continue
> 2. Review
> ```

---

## Step 4 — Products.tsx

**File:** `src/app/pages/QualityControl/Products.tsx`

**Mục tiêu:** Load danh sách `ProductionBatch` đang chờ QC từ API, gửi quyết định kiểm định lên `POST /production-batches/:batch_id/qc-complete`.

### 4.1 Thêm imports & state

```tsx
import { useEffect, useState } from "react";
import {
  getPendingProductionBatches,
  completeProductionBatchQC,
} from "@/app/services/qcService";
import type { ProductionBatch, QCDecisionPayload } from "@/app/types/qc.types";
import { ErrorBanner } from "@/app/components/ui/ErrorBanner";
import { LoadingRow } from "@/app/components/ui/LoadingRow";
```

```tsx
const [batches, setBatches] = useState<ProductionBatch[]>([]);
const [fetching, setFetching] = useState(true);
const [fetchError, setFetchError] = useState<string | null>(null);
const [submitting, setSubmitting] = useState(false);
const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
```

### 4.2 Load data khi mount

```tsx
useEffect(() => {
  getPendingProductionBatches()
    .then(setBatches)
    .catch((e) => setFetchError(e.message))
    .finally(() => setFetching(false));
}, []);
```

### 4.3 Cập nhật bảng danh sách

Thay type `ProductBatch` (mock interface) bằng `ProductionBatch` từ API types:

| Cột UI | Field `ProductionBatch` |
| :----- | :---------------------- |
| Mã lô sản xuất | `batch.batch_number` |
| Tên sản phẩm | `batch.product_id` (hiện ID; TODO: lookup Material name) |
| Số lượng SX | `` `${Number(batch.batch_size).toLocaleString()} ${batch.unit_of_measure}` `` |
| Ngày sản xuất | `new Date(batch.manufacture_date).toLocaleDateString("vi-VN")` |

Card "Đang chờ xử lý": `batches.length` (dynamic từ state).

`selectedBatch`: đổi sang `useState<ProductionBatch | null>(null)`.

### 4.4 Thay handleFinalSubmit — gọi API

```tsx
const handleFinalSubmit = async () => {
  if (!selectedBatch) return;
  if (!decision || !productLabel)
    return setSubmitMsg({ type: "error", text: "Vui lòng chọn đầy đủ Quyết định và Nhãn sản phẩm!" });

  setSubmitting(true);
  setSubmitMsg(null);

  try {
    const payload: QCDecisionPayload = {
      decision: decision === "approved" ? "Accepted" : decision === "rejected" ? "Rejected" : "Hold",
      label_id: productLabel,
      verified_by: "qc_user",  // TODO: lấy từ AuthContext
    };
    const result = await completeProductionBatchQC(selectedBatch.batch_id, payload);

    // Sau khi duyệt Accepted → batch bị xóa khỏi danh sách chờ
    setBatches((prev) => prev.filter((b) => b.batch_id !== selectedBatch.batch_id));

    const lotInfo = result.inventoryLot
      ? ` InventoryLot ${result.inventoryLot.lot_id} đã được tạo.`
      : "";
    setSubmitMsg({
      type: "success",
      text: `Lô ${selectedBatch.batch_number} → ${payload.decision}.${lotInfo}`,
    });

    setTimeout(() => {
      setSelectedBatch(null);
      setDecision("");
      setProductLabel("");
      setSubmitMsg(null);
    }, 2000);
  } catch (e) {
    setSubmitMsg({ type: "error", text: e instanceof Error ? e.message : "Gửi thất bại." });
  } finally {
    setSubmitting(false);
  }
};
```

### 4.5 Thông báo auto-tạo InventoryLot

Trong modal, phần note info hiện có:
> "Hệ thống sẽ tự động ghi nhận Metadata cho InventoryLots..."

Giữ nguyên text này — nó đã phù hợp với backend behavior.

---

> **Checkpoint Step 4**
> ```
> 1. Continue
> 2. Review
> ```

---

## Step 5 — InventoryQA.tsx

**File:** `src/app/pages/QualityControl/InventoryQA.tsx`

**Mục tiêu:** Tab Alert — load lô cần re-test/near-expiry từ API, gọi re-test decision. Tab Quarantine — load danh sách lô, gọi bulk quarantine API.

### 5.1 Thêm imports & state

```tsx
import { useEffect, useState, useCallback } from "react";
import {
  getLotsByStatus,
  bulkQuarantine,
  submitRetestDecision,
} from "@/app/services/qcService";
import type { InventoryLot, RetestPayload } from "@/app/types/qc.types";
import { ErrorBanner } from "@/app/components/ui/ErrorBanner";
```

Xóa mock `useState<InventoryItem[]>([...])`. Thay bằng:

```tsx
// Data cho cả 2 tab (tải song song)
const [alertLots, setAlertLots] = useState<InventoryLot[]>([]);
const [quarantineLots, setQuarantineLots] = useState<InventoryLot[]>([]);
const [fetching, setFetching] = useState(true);
const [fetchError, setFetchError] = useState<string | null>(null);

// Re-test
const [retestLot, setRetestLot] = useState<InventoryLot | null>(null);
const [retestSubmitting, setRetestSubmitting] = useState(false);
const [newExpiryDate, setNewExpiryDate] = useState("");

// Bulk quarantine
const [bulkMsg, setBulkMsg] = useState<string | null>(null);
const [bulkSubmitting, setBulkSubmitting] = useState(false);
```

### 5.2 Load data

```tsx
const loadData = useCallback(async () => {
  setFetching(true);
  setFetchError(null);
  try {
    // Tab Alert: lấy lô Quarantine (chờ re-test) + Accepted sắp hết hạn
    // Backend cần endpoint ?status=Quarantine
    // Near-expiry logic: nếu backend chưa hỗ trợ riêng → lấy Accepted, filter client-side
    const [quarantined, accepted] = await Promise.all([
      getLotsByStatus("Quarantine"),
      getLotsByStatus("Accepted"),
    ]);

    // Near Expiry: hạn SD trong vòng 90 ngày
    const today = new Date();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    const nearExpiry = accepted.filter(
      (l) => new Date(l.expiration_date).getTime() - today.getTime() < ninetyDays,
    );

    setAlertLots(nearExpiry);
    setQuarantineLots(quarantined);
  } catch (e) {
    setFetchError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
  } finally {
    setFetching(false);
  }
}, []);

useEffect(() => { loadData(); }, [loadData]);
```

### 5.3 handleDecision — gọi API re-test

```tsx
const handleDecision = async (action: "extend" | "discard") => {
  if (!retestLot) return;
  if (action === "extend" && !newExpiryDate) {
    alert("Vui lòng nhập ngày hết hạn mới!");
    return;
  }

  setRetestSubmitting(true);
  try {
    const payload: RetestPayload = {
      action,
      new_expiry_date: action === "extend" ? newExpiryDate : undefined,
      performed_by: "qc_user",  // TODO: AuthContext
    };
    await submitRetestDecision(retestLot.lot_id, payload);
    await loadData(); // Refetch sau khi cập nhật
    setRetestLot(null);
    setNewExpiryDate("");
  } catch (e) {
    alert(e instanceof Error ? e.message : "Thao tác thất bại");
  } finally {
    setRetestSubmitting(false);
  }
};
```

### 5.4 handleBulkQuarantine — gọi API

```tsx
const handleBulkQuarantine = async () => {
  if (selectedItems.length === 0) {
    setBulkMsg("Vui lòng chọn các lô hàng cần cách ly!");
    return;
  }

  setBulkSubmitting(true);
  setBulkMsg(null);
  try {
    const result = await bulkQuarantine({ lot_ids: selectedItems });
    setBulkMsg(`Đã cách ly ${result.updated} lô hàng thành công.`);
    setSelectedItems([]);
    await loadData(); // Refetch
  } catch (e) {
    setBulkMsg(e instanceof Error ? e.message : "Cách ly thất bại");
  } finally {
    setBulkSubmitting(false);
  }
};
```

### 5.5 Cập nhật modal Re-test

Thêm field nhập ngày gia hạn (chỉ hiện khi cần):

```tsx
{/* Bên trong modal, trước 2 nút quyết định */}
<div className="mb-4">
  <label className="text-xs font-bold text-gray-600 mb-1 block">
    Ngày hết hạn mới (nếu Gia hạn)
  </label>
  <input
    type="date"
    value={newExpiryDate}
    onChange={(e) => setNewExpiryDate(e.target.value)}
    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
    min={new Date().toISOString().split("T")[0]}
  />
</div>
```

### 5.6 Mapping UI từ `InventoryLot`

| UI field (mock `InventoryItem`) | `InventoryLot` field |
| :------------------------------ | :------------------- |
| `item.id` | `lot.lot_id` |
| `item.name` | `lot.manufacturer_lot` |
| `item.batchNo` | `lot.lot_id` |
| `item.location` | `lot.storage_location ?? "—"` |
| `item.expiryDate` | `lot.expiration_date` |
| `item.status` | map từ `lot.status` + business logic near-expiry |

---

> **Checkpoint Step 5**
> ```
> 1. Continue
> 2. Review
> ```

---

## Step 6 — Traceability.tsx

**File:** `src/app/pages/QualityControl/Traceability.tsx`

**Mục tiêu:** Tab History — tìm kiếm lô từ API, load timeline. Tab Supplier — load supplier performance từ API với filter thời gian.

### 6.1 Thêm imports & state

```tsx
import { useEffect, useState } from "react";
import {
  getLotsByStatus,
  getTestsByLotId,
  getSupplierPerformance,
} from "@/app/services/qcService";
import type { InventoryLot, QCTest, SupplierPerformance } from "@/app/types/qc.types";
import { ErrorBanner } from "@/app/components/ui/ErrorBanner";
```

Xóa toàn bộ `mockBatches` và `mockSuppliers` const. Thay bằng:

```tsx
// Tab History
const [lots, setLots] = useState<InventoryLot[]>([]);
const [lotsLoading, setLotsLoading] = useState(true);
const [lotsError, setLotsError] = useState<string | null>(null);
const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
const [timeline, setTimeline] = useState<QCTest[]>([]);
const [timelineLoading, setTimelineLoading] = useState(false);

// Tab Supplier
const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
const [suppliersLoading, setSuppliersLoading] = useState(false);
const [suppliersError, setSuppliersError] = useState<string | null>(null);
const [periodFilter, setPeriodFilter] = useState("month"); // "month" | "quarter" | "year"
const [selectedSupplier, setSelectedSupplier] = useState<SupplierPerformance | null>(null);
```

### 6.2 Load lô hàng (Tab History)

```tsx
useEffect(() => {
  const loadLots = async () => {
    setLotsLoading(true);
    try {
      // Lấy tất cả lô (có thể dùng endpoint riêng nếu có, hoặc concat nhiều status)
      const [accepted, rejected, quarantine] = await Promise.all([
        getLotsByStatus("Accepted"),
        getLotsByStatus("Rejected"),
        getLotsByStatus("Quarantine"),
      ]);
      setLots([...accepted, ...rejected, ...quarantine]);
    } catch (e) {
      setLotsError(e instanceof Error ? e.message : "Tải danh sách lô thất bại");
    } finally {
      setLotsLoading(false);
    }
  };
  loadLots();
}, []);
```

### 6.3 Load timeline khi click "Xem Timeline"

```tsx
const handleViewTimeline = async (lot: InventoryLot) => {
  setSelectedLot(lot);
  setTimelineLoading(true);
  try {
    const tests = await getTestsByLotId(lot.lot_id);
    setTimeline(tests);
  } catch {
    setTimeline([]);
  } finally {
    setTimelineLoading(false);
  }
};
```

### 6.4 Render timeline từ QCTest[]

Timeline hiện tại dùng mock `TimelineStep[]`. Map `QCTest[]` thành format tương tự:

```tsx
// Mapping QCTest → timeline item
const timelineItems = [
  // Mục cố định đầu: ngày nhập kho từ InventoryLot
  {
    date: selectedLot ? new Date(selectedLot.received_date).toLocaleDateString("vi-VN") : "",
    event: "Ngày nhập kho (Inbound)",
    user: "Operator",
    status: "complete" as const,
  },
  // Các QCTest từ API (sort theo test_date tăng dần)
  ...timeline
    .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime())
    .map((test) => ({
      date: new Date(test.test_date).toLocaleDateString("vi-VN"),
      event: `${test.test_type} — ${test.test_result} (${test.result_status})`,
      user: test.performed_by,
      status: test.result_status === "Pending" ? ("pending" as const) : ("complete" as const),
    })),
];
```

### 6.5 Load supplier performance (Tab Supplier)

```tsx
useEffect(() => {
  if (activeTab !== "supplier") return;
  const loadSuppliers = async () => {
    setSuppliersLoading(true);
    setSuppliersError(null);
    try {
      // Tính from/to dựa theo periodFilter
      const now = new Date();
      let from: string | undefined;
      if (periodFilter === "month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      } else if (periodFilter === "quarter") {
        const q = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0];
      } else {
        from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      }
      const data = await getSupplierPerformance(from);
      setSuppliers(data);
    } catch (e) {
      setSuppliersError(e instanceof Error ? e.message : "Tải báo cáo NCC thất bại");
    } finally {
      setSuppliersLoading(false);
    }
  };
  loadSuppliers();
}, [activeTab, periodFilter]);
```

### 6.6 Cập nhật bảng supplier

Giữ nguyên UI bảng hiện tại. Thay `mockSuppliers.map(...)` thành `suppliers.map(...)`.

Mapping trực tiếp (tên field giống nhau):
- `supplier.name` → `sp.supplier_name`
- `supplier.totalBatches` → `sp.total_batches`
- `supplier.approved` → `sp.approved`
- `supplier.rejected` → `sp.rejected`
- `supplier.qualityRate` → `sp.quality_rate`

Progress bar màu:
```tsx
sp.quality_rate > 90 ? "bg-green-500" : sp.quality_rate > 85 ? "bg-yellow-500" : "bg-red-500"
```

### 6.7 Nút "Xuất COA (PDF)"

Tạm thời giữ disabled với tooltip:

```tsx
<button
  disabled
  title="Tính năng xuất PDF sẽ có trong phiên bản tiếp theo"
  className="w-full py-3 rounded-xl bg-red-500 text-white font-black text-sm opacity-60 cursor-not-allowed"
>
  Xuất COA (PDF) — Coming Soon
</button>
```

### 6.8 Filter search client-side

```tsx
const filteredLots = lots.filter((l) => {
  const q = searchTerm.toLowerCase();
  return (
    l.lot_id.toLowerCase().includes(q) ||
    l.manufacturer_lot.toLowerCase().includes(q) ||
    (l.supplier_name ?? "").toLowerCase().includes(q)
  );
});
```

---

> **Checkpoint Step 6**
> ```
> 1. Continue
> 2. Review
> ```

---

## Step 7 — Kiểm tra tích hợp toàn bộ module

**Mục tiêu:** Đảm bảo 5 màn hình QC hoạt động đúng với backend thực (hoặc kiểm tra độc lập với mock server).

### 7.1 Checklist trước khi test

- [ ] File `src/app/types/qc.types.ts` được tạo, không có lỗi TypeScript
- [ ] File `src/app/services/qcService.ts` được tạo, import đúng
- [ ] File `src/app/hooks/useAsync.ts` được tạo
- [ ] File `src/app/components/ui/ErrorBanner.tsx` được tạo
- [ ] File `src/app/components/ui/LoadingRow.tsx` được tạo
- [ ] `routes.ts` không cần thay đổi (đã đúng)
- [ ] Không còn `alert()` trong code (đã thay bằng inline message)
- [ ] Không còn mock data hardcoded trong component (đã chuyển vào hooks/state từ API)

### 7.2 Build check

```bash
# Tại thư mục gốc workspace (frontend)
npm run build
# Không được có lỗi TypeScript hoặc build error
```

Nếu lỗi: đọc message, fix theo thứ tự từ trên xuống.

### 7.3 Dev server test (cần backend đang chạy)

```bash
npm run dev
# App khởi động tại http://localhost:5173
```

Đăng nhập bằng tài khoản QC (user `2`), kiểm tra từng màn hình:

| Màn hình | URL | Kiểm tra |
| :------- | :-- | :------- |
| Dashboard | `/quality-control` | KPI cards hiện số từ API, bảng lô chờ có data |
| PendingBatch | `/quality-control/pending` | Danh sách lô Quarantine hiện từ API |
| Products | `/quality-control/products` | Danh sách batch "In Progress" hiện từ API |
| InventoryQA | `/quality-control/inventory-qa` | Tab Alert có near-expiry lots; Tab Quarantine có data |
| Traceability | `/quality-control/traceability` | Tab History search được lô; Tab Supplier có bảng NCC |

### 7.4 Test flow end-to-end (nếu backend có data)

**Flow A — Kiểm định lô đầu vào:**
1. Vào PendingBatch → chọn một lô "Quarantine" → mở modal
2. Nhập kết quả test → chọn decision = APPROVE, chọn nhãn → Submit
3. Kiểm tra: badge lô đổi sang "Accepted" trong danh sách

**Flow B — Kiểm định thành phẩm:**
1. Vào Products → chọn batch "In Progress" → mở modal
2. Nhập kết quả, chọn Approved + nhãn → HOÀN TẤT KIỂM ĐỊNH
3. Kiểm tra: batch biến mất khỏi danh sách

**Flow C — Re-test:**
1. Vào InventoryQA → Tab Alert → chọn một lô near-expiry → modal
2. Chọn GIA HẠN, nhập ngày mới → Submit
3. Kiểm tra: lô biến khỏi Alert list

**Flow D — Bulk Quarantine:**
1. Vào InventoryQA → Tab Quarantine → check nhiều lô → Cách ly hàng loạt
2. Kiểm tra: lô được cập nhật status Quarantine

### 7.5 Nếu backend chưa sẵn sàng

Giữ cơ chế fallback: trong `apiFetch`, nếu backend trả lỗi network (`TypeError: Failed to fetch`), hiện `ErrorBanner` với message:
> "Không thể kết nối đến máy chủ. Đảm bảo backend đang chạy tại http://localhost:3000"

---

> **Checkpoint Step 7 — FINAL**
> ```
> 1. Done — Module QC Frontend đã tích hợp API xong
> 2. Review — Cần xem lại một phần
> ```

---

## Tóm tắt Files cần tạo / sửa

| File | Trạng thái | Ghi chú |
| :--- | :--------- | :------ |
| `src/app/types/qc.types.ts` | **Tạo mới** | TypeScript interfaces cho toàn bộ domain QC |
| `src/app/services/qcService.ts` | **Tạo mới** | Toàn bộ API fetch functions |
| `src/app/hooks/useAsync.ts` | **Tạo mới** | Generic async hook |
| `src/app/components/ui/ErrorBanner.tsx` | **Tạo mới** | Reusable error component |
| `src/app/components/ui/LoadingRow.tsx` | **Tạo mới** | Reusable loading table row |
| `src/app/pages/QualityControl/Dashboard.tsx` | **Sửa** | Mock → API (kpi + lots) |
| `src/app/pages/QualityControl/PendingBatch.tsx` | **Sửa** | Mock → API (lots + submitDecision) |
| `src/app/pages/QualityControl/Products.tsx` | **Sửa** | Mock → API (batches + completeQC) |
| `src/app/pages/QualityControl/InventoryQA.tsx` | **Sửa** | Mock → API (retest + bulkQuarantine) |
| `src/app/pages/QualityControl/Traceability.tsx` | **Sửa** | Mock → API (lots + timeline + supplier) |
| `src/app/routes.ts` | **Không đổi** | Routes đã đúng |

---

## Dependencies giữa các Steps

```
Step 1 (types + service + hooks + UI components)
    ↓
    ├── Step 2 (Dashboard)      ← dùng getDashboardKPI, getLotsByStatus
    ├── Step 3 (PendingBatch)   ← dùng getLotsByStatus, submitDecision, createQCTest
    ├── Step 4 (Products)       ← dùng getPendingProductionBatches, completeProductionBatchQC
    ├── Step 5 (InventoryQA)    ← dùng getLotsByStatus, bulkQuarantine, submitRetestDecision
    └── Step 6 (Traceability)   ← dùng getLotsByStatus, getTestsByLotId, getSupplierPerformance
              ↓
         Step 7 (Integration Test) ← tất cả Steps trên phải xong
```

**Step 1 bắt buộc phải hoàn thành trước** tất cả steps còn lại.
Steps 2–6 có thể thực hiện độc lập song song với nhau nếu cần.
