/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/error-boundaries */
/* eslint-disable react-refresh/only-export-components */
// File: router/index.tsx
// Cấu hình định tuyến (routing) cho toàn bộ ứng dụng frontend
// Định nghĩa tất cả các routes, phân quyền theo vai trò (role-based access control)
// Các vai trò: it_admin (IT Admin), manager (Quản lý), operator (Nhân viên), quality-control (QC)

import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout"; // Layout chính với sidebar và header

// ============================================================================
// HỆ THỐNG PHÂN QUYỀN (ROLE-BASED ACCESS CONTROL)
// ============================================================================
// Ứng dụng sử dụng 4 vai trò chính với tiền tố URL tương ứng:
//
// | Tiền tố URL   | Role Key (Frontend) | Role Name (Backend/Keycloak)  | Quyền hạn                     |
// |---------------|--------------------|------------------------------|-------------------------------|
// | /admin/*      | it_admin           | IT Administrator             | Quản trị hệ thống toàn diện   |
// | /manager/*    | manager            | Manager                      | Quản lý kho, báo cáo, user   |
// | /operator/*   | operator           | Operator                     | Nhập/xuất kho, kiểm kê       |
// | /qc/*         | quality-control    | Quality Control Technician   | Kiểm tra chất lượng, truy xuất|
//
// Token và thông tin user được lưu trong localStorage:
// - auth_token: JWT token để xác thực API calls
// | user: JSON object chứa thông tin user và role
// ============================================================================

// ===== IMPORT CÁC COMPONENTS THEO PHÂN QUYỀN =====

// Admin Pages - Trang dành cho IT Administrator
import DashboardIT from "../pages/admin/DashboardIT"; // Dashboard tổng quan hệ thống
import AuditLog from "../pages/admin/AuditLog"; // Nhật ký kiểm toán hệ thống
import SystemMonitoring from "../pages/admin/SystemMonitoring"; // Giám sát hệ thống (Prometheus/Grafana)
import BackupRestore from "../pages/admin/BackupRestore"; // Sao lưu và khôi phục dữ liệu
import ErrorLogs from "../pages/admin/ErrorLogs"; // Nhật ký lỗi hệ thống
import SystemReports from "../pages/admin/SystemReports"; // Báo cáo hệ thống
import UserManagementIT from "../pages/admin/UserManagement"; // Quản lý người dùng (IT)

// QC Pages - Trang dành cho Quality Control Technician
import DashboardQC from "../pages/qc/DashboardQC"; // Dashboard kiểm soát chất lượng
import InboundControl from "../pages/qc/InboundControl"; // Kiểm soát hàng nhập
import InventoryQC from "../pages/qc/InventoryQC"; // Kiểm kê kho (QC)
import ProductInspection from "../pages/qc/ProductInspection"; // Kiểm tra sản phẩm
import ReportTraceability from "../pages/qc/ReportTraceability"; // Báo cáo truy xuất nguồn gốc

// Manager Pages - Trang dành cho Manager (Quản lý)
import Dashboard from "../pages/manager/Dashboard"; // Dashboard quản lý
import MaterialManagementManager from "../pages/manager/MaterialManagement"; // Quản lý nguyên liệu
import BinWorklist from "../pages/manager/BinWorklist"; // Danh sách bin (vị trí lưu kho)
import WarehouseManagement from "../pages/manager/WarehouseManagement"; // Quản lý kho
import ProductManagementManager from "../pages/manager/ProductManagement"; // Quản lý sản phẩm
import ReportsManager from "../pages/manager/Reports"; // Báo cáo quản lý
import UserManagementManager from "../pages/manager/UserManagement"; // Quản lý người dùng
import InventoryTransactionListManager from "../pages/manager/InventoryTransactionListManager"; // Danh sách giao dịch kho
import LabelManagement from "../pages/manager/LabelManagement"; // Quản lý nhãn mã vạch
import ProductCreationManager from "../pages/manager/ProductCreation"; // Tạo sản phẩm mới

// Operator Pages - Trang dành cho Operator (Nhân viên kho)
import DashboardOperator from "../pages/operator/DashboardOperator"; // Dashboard nhân viên kho
import InventoryAuditOperator from "../pages/operator/InventoryAudit"; // Kiểm kê tồn kho
import MaterialManagementOperator from "../pages/operator/MaterialManagement"; // Quản lý nguyên liệu (operator)
import ProductCreationOperator from "../pages/operator/ProductCreation"; // Tạo sản phẩm (operator)
import StockInOperator from "../pages/operator/StockIn"; // Nhập kho
import StockOutOperator from "../pages/operator/StockOut"; // Xuất kho
import InventoryTransactionListOperator from "../pages/operator/InventoryTransactionListOperator"; // Danh sách giao dịch (operator)
import TransactionHistoryOperator from "../pages/operator/TransactionHistory"; // Lịch sử giao dịch
import LabelPrintOperator from "../pages/operator/LabelPrint"; // In nhãn mã vạch
import BarcodeManager from "../pages/operator/BarcodeManager"; // Quản lý mã vạch
import WarehouseSlipList from "../pages/operator/WarehouseSlipList"; // Danh sách phiếu kho
import WarehouseSlipCreate from "../pages/operator/WarehouseSlipCreate"; // Tạo phiếu kho mới
import WarehouseSlipDetailPage from "../pages/operator/WarehouseSlipDetailPage"; // Chi tiết phiếu kho
import WarehouseSlipPrint from "../pages/operator/WarehouseSlipPrint"; // In phiếu kho

// Auth Pages - Trang xác thực
import Login from "../pages/auth/Login"; // Đăng nhập
import Register from "../pages/auth/Register"; // Đăng ký
import ForgotPassword from "../pages/auth/ForgotPassword"; // Quên mật khẩu
import ResetPassword from "../pages/auth/ResetPassword"; // Đặt lại mật khẩu

// Production Batch Pages - Trang quản lý lô sản xuất (Manager & Operator)
import ApiTestProductionBatch from "../pages/operator/production-batches/ProductionBatch"; // Test API lô sản xuất
import ProductionBatchList from "../pages/manager/production-batches/List"; // Danh sách lô sản xuất (Manager)
import ProductionBatchDetail from "../pages/manager/production-batches/Detail"; // Chi tiết lô sản xuất (Manager)
import ProductionBatchForm from "../pages/manager/production-batches/FormPage"; // Form tạo/sửa lô (Manager)
import OperatorProductionBatchList from "../pages/operator/production-batches/List"; // Danh sách lô (Operator)
import OperatorProductionBatchDetail from "../pages/operator/production-batches/Detail"; // Chi tiết lô (Operator)
import OperatorProductionBatchForm from "../pages/operator/production-batches/FormPage"; // Form lô (Operator)

// Shared Pages - Trang dùng chung
import AIAgentConsole from "../pages/shared/AIAgentConsole"; // Console AI Agent hỗ trợ người dùng

// Utilities
import type { JSX } from "react";
import { isTokenValid } from "../utils/authUtils"; // Hàm kiểm tra token hợp lệ
import StockManagement from "../pages/manager/StockManagement.tsx"; // Quản lý nhập/xuất kho
import InventoryLot from "../pages/manager/inventory-lot/InventoryLot.tsx"; // Quản lý lô hàng (Inventory Lot)
import { TransactionManagementManager } from "../pages/manager/TransactionManagementManager.tsx"; // Quản lý giao dịch nâng cao

// ============================================================================
// HÀM XỬ LÝ PHÂN QUYỀN
// ============================================================================

/**
 * Lấy vai trò (role) của người dùng từ localStorage
 * Chuyển đổi định dạng role từ backend (viết hoa, đầy đủ) sang frontend (slug, viết thường)
 *
 * Ví dụ ánh xạ:
 * - "Manager" -> "manager"
 * - "Operator" -> "operator"
 * - "Quality Control Technician" -> "quality-control"
 * - "IT Administrator" -> "it_admin"
 *
 * @returns {string|null} Role key (slug) hoặc null nếu chưa đăng nhập/không tìm thấy
 */
function getUserRole(): string | null {
  try {
    const userStr =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    const role = user.role as string;

    // Bảng ánh xạ role từ backend sang frontend
    const roleMap: Record<string, string> = {
      Manager: "manager",
      Operator: "operator",
      "Quality Control Technician": "quality-control",
      "IT Administrator": "it_admin",
    };

    return roleMap[role] || role;
  } catch {
    return null;
  }
}

/**
 * Component ProtectedRoute - Cơ chế bảo vệ route (Route Guard)
 *
 * QUY TRÌNH KIỂM TRA:
 * 1. Kiểm tra DEVELOPMENT MODE: Nếu bật (isDevelopmentMode=true) thì bỏ qua mọi kiểm tra
 *    (Chỉ dùng khi phát triển, nhớ tắt khi deploy production)
 *
 * 2. Kiểm tra đăng nhập (Authentication):
 *    - Lấy auth_token từ localStorage
 *    - Gọi isTokenValid() để kiểm tra token có hết hạn không
 *    - Nếu chưa đăng nhập hoặc token hết hạn -> Redirect về /login
 *
 * 3. Kiểm tra phân quyền (Authorization):
 *    - Lấy vai trò user từ getUserRole()
 *    - So sánh với danh sách requiredRoles (truyền vào qua props)
 *    - Nếu không có quyền -> Redirect về dashboard tương ứng với vai trò của user
 *      + manager -> /manager/dashboard
 *      + operator -> /operator/dashboard
 *      + quality-control -> /qc/dashboard
 *      + it_admin -> /admin/dashboard
 *
 * @param element - Component cần render nếu hợp lệ
 * @param requiredRoles - Mảng các vai trò được phép truy cập (ví dụ: ["manager", "operator"])
 */
function ProtectedRoute({
  element,
  requiredRoles,
}: {
  element: JSX.Element;
  requiredRoles?: string[];
}) {
  // DEVELOPMENT MODE: Bỏ qua xác thực để phát triển (đặt false để enable auth)
  const isDevelopmentMode = false;
  if (isDevelopmentMode) {
    return element;
  }

  // Lấy token từ localStorage
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const userRole = getUserRole();

  // Kiểm tra token có hợp lệ không
  if (!token || !isTokenValid()) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra quyền truy cập (role)
  if (requiredRoles && requiredRoles.length > 0) {
    if (!userRole || !requiredRoles.includes(userRole)) {
      // Redirect về dashboard tương ứng với vai trò của user
      const dashboardMap: Record<string, string> = {
        manager: "/manager/dashboard",
        operator: "/operator/dashboard",
        "quality-control": "/qc/dashboard",
        it_admin: "/admin/dashboard",
      };
      const redirectUrl = userRole ? dashboardMap[userRole] || "/" : "/login";
      return <Navigate to={redirectUrl} replace />;
    }
  }

  return element;
}

/**
 * Hàm helper: Bọc component với ProtectedRoute
 *
 * Đây là hàm trung gian để dễ dàng bảo vệ các route.
 * Có thể truyền requiredRoles để giới hạn quyền truy cập.
 *
 * Cách dùng:
 * - requireAuth(<Component />, ["manager"])        → Chỉ Manager được truy cập
 * - requireAuth(<Component />, ["manager", "operator"]) → Cả Manager và Operator được truy cập
 * - requireAuth(<Component />)                     → Chỉ cần đăng nhập, không giới hạn role
 *
 * @param element - Component cần bảo vệ
 * @param requiredRoles - Danh sách các vai trò được phép truy cập (tùy chọn)
 */
function requireAuth(element: JSX.Element, requiredRoles?: string[]) {
  return <ProtectedRoute element={element} requiredRoles={requiredRoles} />;
}

/**
 * Hàm helper: Yêu cầu quyền Manager để truy cập
 *
 * Manager có quyền quản lý kho, nguyên liệu, sản phẩm, báo cáo, user (cấp quản lý)
 * Các route /manager/* sử dụng hàm này để bảo vệ
 */
function requireManagerAuth(element: JSX.Element) {
  return requireAuth(element, ["manager"]);
}

/**
 * Hàm helper: Yêu cầu quyền Operator để truy cập
 *
 * Operator là nhân viên kho, có quyền nhập/xuất kho, kiểm kê, in phiếu, quản lý mã vạch
 * Các route /operator/* sử dụng hàm này để bảo vệ
 */
function requireOperatorAuth(element: JSX.Element) {
  return requireAuth(element, ["operator"]);
}

/**
 * Hàm helper: Yêu cầu quyền Quality Control để truy cập
 *
 * QC chịu trách nhiệm kiểm tra chất lượng, kiểm soát hàng nhập, truy xuất nguồn gốc
 * Các route /qc/* sử dụng hàm này để bảo vệ
 */
function requireQCAuth(element: JSX.Element) {
  return requireAuth(element, ["quality-control"]);
}

/**
 * Hàm helper: Yêu cầu quyền IT Admin để truy cập
 *
 * IT Admin có quyền cao nhất: quản trị hệ thống, giám sát, backup, audit log, quản lý user
 * Các route /admin/* sử dụng hàm này để bảo vệ
 */
function requireAdminAuth(element: JSX.Element) {
  return requireAuth(element, ["it_admin"]);
}

// ============================================================================
// COMPONENT HOME REDIRECT - Xử lý route gốc "/"
// ============================================================================
// Khi người dùng truy cập vào trang chủ (http://localhost:5173/), component này sẽ:
// 1. Kiểm tra đã đăng nhập chưa (có token và user info trong localStorage không)
// 2. Nếu chưa đăng nhập → Redirect về /login
// 3. Nếu đã đăng nhập → Đọc vai trò và redirect về dashboard tương ứng:
//    - manager       → /manager/dashboard
//    - operator      → /operator/dashboard
//    - quality-control → /qc/dashboard
//    - it_admin      → /admin/dashboard
// ============================================================================
function HomeRedirect() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const userStr =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;

  // BƯỚC 1: Kiểm tra đã đăng nhập chưa
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    // BƯỚC 2: Chuẩn hóa role từ backend sang frontend (slug format)
    const role = typeof user.role === "string" ? user.role : "";
    const roleMap: Record<string, string> = {
      Manager: "manager",
      Operator: "operator",
      "Quality Control Technician": "quality-control",
      "IT Administrator": "it_admin",
    };
    const normalizedRole = roleMap[role] || role;

    // BƯỚC 3: Redirect về dashboard tương ứng với vai trò
    switch (normalizedRole) {
      case "manager":
        return <Navigate to="/manager/dashboard" replace />;
      case "operator":
        return <Navigate to="/operator/dashboard" replace />;
      case "quality-control":
        return <Navigate to="/qc/dashboard" replace />;
      case "it_admin":
        return <Navigate to="/admin/dashboard" replace />;
      default:
        // Role không hợp lệ → Về trang login
        return <Navigate to="/login" replace />;
    }
  } catch (e) {
    // Lỗi parse JSON → Xóa token cũ và về login
    return <Navigate to="/login" replace />;
  }
}

// ============================================================================
// CẤU HÌNH ROUTER CHÍNH - createBrowserRouter
// ============================================================================
// Định nghĩa TẤT CẢ các route của ứng dụng
//
// CẤU TRÚC CHÍNH:
// 1. Route gốc "/" → HomeRedirect (tự động redirect về login hoặc dashboard)
// 2. Route với MainLayout → Chứa tất cả các trang có layout chung (sidebar + header)
//    - IT Admin routes (/admin/*)
//    - QC routes (/qc/*)
//    - Manager routes (/manager/*)
//    - Operator routes (/operator/*)
//    - Shared routes (/ai/*)
// 3. Auth routes (/login, /register, /auth/*) → Không yêu cầu đăng nhập
// 4. Test routes (/api-test/*) → Dùng cho development
//
// CÁCH BẢO VỆ ROUTE:
// - requireAdminAuth(element)   → Chỉ IT Admin được truy cập
// - requireManagerAuth(element) → Chỉ Manager được truy cập
// - requireOperatorAuth(element) → Chỉ Operator được truy cập
// - requireQCAuth(element)      → Chỉ QC được truy cập
// - requireAuth(element, roles) → Kiểm soát linh hoạt nhiều role cùng truy cập
// ============================================================================

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeRedirect />, // Tự động redirect về login hoặc dashboard
  },
  {
    path: "",
    element: <MainLayout />, // Layout chính chứa Sidebar + Header + Content
    children: [
      // ====================================================================
      // IT ADMIN ROUTES - Tiền tố: /admin/*
      // ====================================================================
      // Chỉ dành cho vai trò 'it_admin' (IT Administrator)
      // Quyền hạn: Quản trị hệ thống, giám sát, backup, audit, quản lý user
      // ====================================================================
      { path: "/admin/dashboard", element: requireAdminAuth(<DashboardIT />) },
      {
        path: "/admin/monitoring",
        element: requireAdminAuth(<SystemMonitoring />),
      },
      { path: "/admin/backup", element: requireAdminAuth(<BackupRestore />) },
      { path: "/admin/error-logs", element: requireAdminAuth(<ErrorLogs />) },
      { path: "/admin/reports", element: requireAdminAuth(<SystemReports />) },
      { path: "/admin/users", element: requireAdminAuth(<UserManagementIT />) },
      { path: "/admin/audit", element: requireAdminAuth(<AuditLog />) },

      // ====================================================================
      // QC ROUTES - Tiền tố: /qc/*
      // ====================================================================
      // Chỉ dành cho vai trò 'quality-control' (Quality Control Technician)
      // Quyền hạn: Kiểm tra chất lượng, kiểm soát hàng nhập, truy xuất nguồn gốc
      // ====================================================================
      { path: "/qc/dashboard", element: requireQCAuth(<DashboardQC />) },
      { path: "/qc/inbound", element: requireQCAuth(<InboundControl />) },
      { path: "/qc/inventory", element: requireQCAuth(<InventoryQC />) },
      { path: "/qc/inspection", element: requireQCAuth(<ProductInspection />) },
      {
        path: "/qc/traceability",
        element: requireQCAuth(<ReportTraceability />),
      },

      // ====================================================================
      // MANAGER ROUTES - Tiền tố: /manager/*
      // ====================================================================
      // Chỉ dành cho vai trò 'manager' (Quản lý)
      // Quyền hạn: Quản lý kho, nguyên liệu, sản phẩm, báo cáo, user, nhãn, lô sản xuất
      // Lưu ý: Một số route Warehouse Slips được chia sẻ với Operator
      // ====================================================================
      {
        path: "/manager/dashboard",
        element: requireManagerAuth(<Dashboard />),
      },
      {
        path: "/manager/inventory",
        element: requireManagerAuth(<InventoryLot />),
      },
      {
        path: "/manager/materials",
        element: requireManagerAuth(<MaterialManagementManager />),
      },
      {
        path: "/manager/warehouses",
        element: requireManagerAuth(<WarehouseManagement />),
      },
      {
        path: "/manager/product",
        element: requireManagerAuth(<ProductManagementManager />),
      },
      {
        path: "/manager/reports",
        element: requireManagerAuth(<ReportsManager />),
      },
      {
        path: "/manager/transaction",
        element: requireManagerAuth(<TransactionManagementManager />),
      },
      {
        path: "/manager/in-out",
        element: requireManagerAuth(<StockManagement />),
      },
      {
        path: "/manager/bins",
        element: requireManagerAuth(<BinWorklist />),
      },
      {
        path: "/manager/stock",
        element: requireManagerAuth(<InventoryLot />),
      },
      {
        path: "/manager/users",
        element: requireManagerAuth(<UserManagementManager />),
      },
      // ====================================================================
      // LƯU Ý VỀ ĐƯỜNG DẪN (PATH)
      // ====================================================================
      // Một số route dùng đường dẫn tương đối (không có dấu / ở đầu):
      // - "manager/labels" (tương đương /manager/labels vì nằm trong parent "")
      // - "manager/product-creation" (tương đương /manager/product-creation)
      //
      // Một số route dùng đường dẫn tuyệt đối (có dấu / ở đầu):
      // - "/manager/dashboard"
      // - "/manager/warehouse-slips"
      //
      // Cả 2 cách đều hoạt động đúng trong React Router v6 với nested routes
      // ====================================================================
      {
        path: "manager/labels",
        element: requireManagerAuth(<LabelManagement />),
      },
      {
        path: "manager/product-creation",
        element: requireManagerAuth(<ProductCreationManager />),
      },
      // ====================================================================
      // PRODUCTION BATCHES - QUẢN LÝ LÔ SẢN XUẤT (MANAGER)
      // ====================================================================
      // Manager có toàn quyền quản lý lô sản xuất:
      // - Xem danh sách (List)
      // - Tạo mới (create) hoặc Chỉnh sửa (edit) - dùng chung FormPage
      // - Xem chi tiết (Detail) với tham số :id (dynamic route)
      // ====================================================================
      {
        path: "manager/production-batches",
        element: requireManagerAuth(<ProductionBatchList />),
      },
      {
        path: "manager/production-batches/create",
        element: requireManagerAuth(<ProductionBatchForm />),
      },
      {
        path: "manager/production-batches/:id",
        element: requireManagerAuth(<ProductionBatchDetail />),
      },
      {
        path: "manager/production-batches/:id/edit",
        element: requireManagerAuth(<ProductionBatchForm />),
      },
      // ====================================================================
      // WAREHOUSE SLIPS - ROUTES CHIA SẺ GIỮA MANAGER VÀ OPERATOR
      // ====================================================================
      // Manager và Operator đều có quyền truy cập Warehouse Slips
      // Sử dụng requireAuth với mảng roles để cho phép cả 2 vai trò truy cập
      // ====================================================================
      {
        path: "/manager/warehouse-slips",
        element: requireAuth(<WarehouseSlipList />, ["manager", "operator"]),
      },
      {
        path: "/manager/in-out/create",
        element: requireAuth(<WarehouseSlipCreate />, ["manager", "operator"]),
      },
      {
        path: "/manager/warehouse-slips/:id",
        element: requireAuth(<WarehouseSlipDetailPage />, [
          "manager",
          "operator",
        ]),
      },
      {
        path: "/manager/in-out/:id/print",
        element: requireAuth(<WarehouseSlipPrint />, ["manager", "operator"]),
      },
      {
        path: "manager/inventory-transactions",
        element: requireManagerAuth(<InventoryTransactionListManager />),
      },

      // ====================================================================
      // OPERATOR ROUTES - Tiền tố: /operator/*
      // ====================================================================
      // Chỉ dành cho vai trò 'operator' (Nhân viên kho)
      // Quyền hạn: Nhập/xuất kho, kiểm kê, in phiếu, quản lý mã vạch, lô sản xuất
      // Lưu ý: Các route Warehouse Slips được chia sẻ với Manager (cả 2 cùng truy cập)
      // ====================================================================
      {
        path: "/operator/dashboard",
        element: requireOperatorAuth(<DashboardOperator />),
      },
      {
        path: "/operator/audit",
        element: requireOperatorAuth(<InventoryAuditOperator />),
      },
      {
        path: "/operator/inventory",
        element: requireOperatorAuth(<InventoryLot />),
      },
      {
        path: "/operator/product",
        element: requireOperatorAuth(<ProductCreationOperator />),
      },
      {
        path: "/operator/stock-in",
        element: requireOperatorAuth(<StockInOperator />),
      },
      {
        path: "/operator/stock-out",
        element: requireOperatorAuth(<StockOutOperator />),
      },
      {
        path: "/operator/history",
        element: requireOperatorAuth(<TransactionHistoryOperator />),
      },
      // Warehouse slips - Operator có thể tạo và xem
      {
        path: "/operator/warehouse-slips",
        element: requireAuth(<WarehouseSlipList />, ["operator", "manager"]),
      },
      {
        path: "/operator/warehouse-slips/create",
        element: requireAuth(<WarehouseSlipCreate />, ["operator", "manager"]),
      },
      {
        path: "/operator/warehouse-slips/:id",
        element: requireAuth(<WarehouseSlipDetailPage />, [
          "operator",
          "manager",
        ]),
      },
      {
        path: "/operator/warehouse-slips/:id/print",
        element: requireAuth(<WarehouseSlipPrint />, ["operator", "manager"]),
      },
      {
        path: "/operator/inventory-transactions",
        element: requireOperatorAuth(<InventoryTransactionListOperator />),
      },
      {
        path: "operator/labels",
        element: requireOperatorAuth(<LabelPrintOperator />),
      },
      {
        path: "operator/barcodes",
        element: requireOperatorAuth(<BarcodeManager />),
      },
      // ====================================================================
      // PRODUCTION BATCHES - QUẢN LÝ LÔ SẢN XUẤT (OPERATOR)
      // ====================================================================
      // Operator có quyền quản lý lô sản xuất (hạn chế hơn Manager):
      // - Xem danh sách (OperatorProductionBatchList)
      // - Tạo mới (create) hoặc Chỉnh sửa (edit) - dùng OperatorProductionBatchForm
      // - Xem chi tiết (Detail) với tham số :id
      // Lưu ý: Operator dùng các component riêng (khác với Manager)
      // ====================================================================
      {
        path: "operator/production-batches",
        element: requireOperatorAuth(<OperatorProductionBatchList />),
      },
      {
        path: "operator/production-batches/create",
        element: requireOperatorAuth(<OperatorProductionBatchForm />),
      },
      {
        path: "operator/production-batches/:id",
        element: requireOperatorAuth(<OperatorProductionBatchDetail />),
      },
      {
        path: "operator/production-batches/:id/edit",
        element: requireOperatorAuth(<OperatorProductionBatchForm />),
      },

      // ====================================================================
      // SHARED ROUTES - AI AGENT CONSOLE
      // ====================================================================
      // Route: /ai/console
      // Dành cho: Manager, Operator, QC (3 vai trò cùng truy cập được)
      // Chức năng: Console AI Agent hỗ trợ người dùng với các tác vụ kho bãi
      // Sử dụng requireAuth với mảng roles thay vì hàm helper đơn role
      // ====================================================================
      {
        path: "/ai/console",
        element: requireAuth(<AIAgentConsole />, [
          "manager",
          "operator",
          "quality-control",
        ]),
      },

      // ====================================================================
      // CATCH-ALL ROUTE - XỬ LÝ 404 NOT FOUND
      // ====================================================================
      // Khi người dùng truy cập vào route không tồn tại (ví dụ: /abc/xyz)
      // Hiển thị thông báo "Page not found" thay vì để trang trắng
      // Path "*" khớp với mọi route không được định nghĩa ở trên
      // ====================================================================
      {
        path: "*",
        element: <div className="p-10 text-gray-400 text-lg">Page not found</div>,
      },
    ],
  },

  // ====================================================================
  // AUTH ROUTES - Không yêu cầu đăng nhập (Public Routes)
  // ====================================================================
  // Các trang xác thực KHÔNG được bảo vệ bởi ProtectedRoute
  // Người dùng chưa đăng nhập hoàn toàn có thể truy cập
  // ====================================================================
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/auth/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/auth/reset-password",
    element: <ResetPassword />,
  },

  // ====================================================================
  // TEST ROUTES - Dùng cho development (có thể xóa khi deploy production)
  // ====================================================================
  {
    path: "/api-test/batches",
    element: <ApiTestProductionBatch />,
  },

  // ====================================================================
  // KẾT THÚC CẤU HÌNH ROUTER
  // ====================================================================
 ]);
