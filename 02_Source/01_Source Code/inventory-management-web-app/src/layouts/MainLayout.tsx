// File: layouts/MainLayout.tsx
// Layout chính của ứng dụng - Bao gồm Sidebar điều hướng, Header, và khu vực hiển thị nội dung
// Phân loại navigation items theo vai trò người dùng (Admin, Manager, Operator, QC)
// Hỗ trợ cả giao diện Desktop (sidebar cố định) và Mobile (menu overlay)
// Tích hợp widget AI Assistant cho Manager, Operator, và QC

import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard, // Icon Dashboard
  Package, // Icon Quản lý lô hàng/Nguyên liệu
  BarChart3, // Icon Báo cáo/Thống kê
  ClipboardCheck, // Icon Kiểm soát
  FileText, // Icon Phiếu kho/Tài liệu
  LogOut, // Icon Đăng xuất
  Menu, // Icon Menu mobile
  X, // Icon Đóng menu
  ArrowUpCircle, // Icon Xuất kho
  ArrowDownCircle, // Icon Nhập kho
  ListChecks, // Icon Kiểm kê
  History, // Icon Lịch sử
  Activity, // Icon Hoạt động
  Terminal, // Icon Log lỗi
  Database, // Icon Quản lý kho/DB
  ShieldCheck, // Icon Audit/QC
  FileBarChart, // Icon Báo cáo
  User as UserIcon, // Icon User
  FileSearch, // Icon Truy vết
  Bot, // Icon AI Agent
  ChevronRight, // Icon Mũi tên
  Tag, // Icon Nhãn
  FlaskConical, // Icon Sản phẩm/Tạo sản phẩm
  Barcode, // Icon Barcode
} from "lucide-react";
import MyAssistantWidget from "../components/assistant/MyAssistantWidget";
import { AuthService } from "../services/auth.service";

// Định nghĩa kiểu dữ liệu cho một mục điều hướng trong sidebar
interface NavItem {
  to: string; // Đường dẫn route
  icon: ReactNode; // Icon hiển thị
  label: string; // Tên hiển thị
}

// ===== COMPONENT USER PROFILE SECTION =====
// Hiển thị thông tin người dùng và nút đăng xuất ở cuối sidebar
const UserProfileSection = ({
  user,
  onLogout,
  getDisplayNameFromUsername,
}: {
  user: { username: string; role: string };
  onLogout: () => void;
  getDisplayNameFromUsername: (username?: string) => string;
}) => (
  <div className="p-4 border-t border-gray-100">
    {/* Thẻ thông tin người dùng */}
    <div className="bg-primary-50/50 rounded-2xl p-4 mb-3 border border-primary-100/50 flex items-center space-x-3">
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-600 shadow-sm border border-primary-100">
        <UserIcon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-gray-900 truncate tracking-tight">
          {user?.username || "Unknown User"}
        </div>
        <div className="text-[10px] font-black text-primary-600 bg-primary-100 px-2 py-0.5 rounded uppercase tracking-widest mt-1">
          {getDisplayNameFromUsername(user?.username)}
        </div>
      </div>
    </div>
    {/* Nút đăng xuất */}
    <button
      onClick={onLogout}
      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 shadow-sm active:scale-95 font-bold text-sm"
    >
      <LogOut size={18} />
      <span>Đăng xuất</span>
    </button>
  </div>
);

// ===== COMPONENT MAIN LAYOUT =====
// Layout chính chứa sidebar điều hướng và khu vực nội dung
// Tự động đồng bộ vai trò người dùng từ backend mỗi khi load
// Hỗ trợ responsive: Desktop (sidebar trái), Mobile (menu overlay)

export default function Layout() {
  const location = useLocation(); // Lấy đường dẫn hiện tại để highlight nav item
  const navigate = useNavigate(); // Điều hướng trang
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Trạng thái menu mobile

  // Lấy thông tin user từ localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const apiBaseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:3001/api";

  // ===== ĐỒNG BỘ HÓA VAI TRÒ TỪ BACKEND =====
  // Mỗi lần load layout, gọi API để lấy thông tin user mới nhất
  // Kiểm tra tài khoản bị khóa và cập nhật role nếu có thay đổi
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    // Bảng ánh xạ role từ backend sang frontend
    const roleMap: Record<string, string> = {
      Manager: "manager",
      Operator: "operator",
      "Quality Control Technician": "quality-control",
      "IT Administrator": "it_admin",
    };

    // Bảng ánh xạ role sang dashboard tương ứng
    const dashboardMap: Record<string, string> = {
      manager: "/manager/dashboard",
      operator: "/operator/dashboard",
      "quality-control": "/qc/dashboard",
      it_admin: "/admin/dashboard",
    };

    // Gọi API lấy thông tin user hiện tại
    fetch(`${apiBaseUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.role) return;

        // Kiểm tra tài khoản bị khóa (is_active = false)
        if (data.is_active === false) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          const reason = data.lock_reason ? `Lý do: ${data.lock_reason}\n` : "";
          const lockMsg =
            data.lock_type === "locked"
              ? `Tài khoản của bạn đã bị khóa tạm thời.\n${reason}Chúng tôi sẽ xem xét và liên hệ lại với bạn.\nĐể được hỗ trợ, vui lòng liên hệ: pharmaWMS@gmail.com`
              : `Tài khoản của bạn đã bị vô hiệu hóa vĩnh viễn.\n${reason}Để được hỗ trợ, vui lòng liên hệ: pharmaWMS@gmail.com`;
          navigate("/login", {
            replace: true,
            state: { lockMessage: lockMsg },
          });
          return;
        }

        // Cập nhật role mới nếu có thay đổi
        const freshRole = roleMap[data.role] ?? data.role;
        const stored = localStorage.getItem("user");
        const storedUser = stored ? JSON.parse(stored) : null;
        if (storedUser && storedUser.role !== freshRole) {
          localStorage.setItem(
            "user",
            JSON.stringify({ ...storedUser, role: freshRole }),
          );
          navigate(dashboardMap[freshRole] || "/", { replace: true });
        }
      })
      .catch(() => {});
  }, [apiBaseUrl, navigate]);

  // ===== HIỂN THỊ TÊN VAI TRÒ =====
  // Lấy tên hiển thị từ user (dùng label từ backend hoặc chuyển đổi từ role)
  const getDisplayNameFromUsername = () => {
    return user?.label ?? getRoleLabel();
  };

  // Chuyển đổi role key sang tên hiển thị tiếng Việt
  const getRoleLabel = () => {
    switch (user?.role) {
      case "manager":
        return "Quản lý";
      case "quality-control":
        return "Kiểm soát chất lượng";
      case "operator":
        return "Nhân viên kho";
      case "it_admin":
        return "Quản trị viên hệ thống";
      default:
        return "";
    }
  };

  // ===== CẤU HÌNH MENU ĐIỀU HƯỚNG THEO VAI TRÒ =====
  // Trả về danh sách các mục navigation tương ứng với role của user
  const getNavItems = (): NavItem[] => {
    switch (user?.role) {
      // ===== MENU CHO MANAGER =====
      case "manager":
        return [
          {
            to: "/manager/dashboard",
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard",
          },
          {
            to: "/manager/inventory",
            icon: <Package size={20} />,
            label: "Quản lý lô hàng",
          },
          {
            to: "/manager/materials",
            icon: <Package size={20} />,
            label: "Quản lý nguyên liệu",
          },
          {
            to: "/manager/warehouses",
            icon: <Database size={20} />,
            label: "Quản lý kho",
          },
          {
            to: "/manager/bins",
            icon: <ListChecks size={20} />,
            label: "Kiểm kê kệ",
          },
          {
            to: "/manager/in-out",
            icon: <Activity size={20} />,
            label: "Quản lý nhập/xuất kho",
          },
          // {
          //   to: "/manager/warehouse-slips",
          //   icon: <FileText size={20} />,
          //   label: "Phiếu kho",
          // },
          {
            to: "/manager/inventory-transactions",
            icon: <History size={20} />,
            label: "Lịch sử giao dịch",
          },
          {
            to: "/manager/stock",
            icon: <BarChart3 size={20} />,
            label: "Tồn kho",
          },
          {
            to: "/manager/reports",
            icon: <FileBarChart size={20} />,
            label: "Báo cáo",
          },
          // {
          //   to: "/manager/transaction",
          //   icon: <History size={20} />,
          //   label: "Lịch sử giao dịch",
          // },
          {
            to: "/manager/users",
            icon: <UserIcon size={20} />,
            label: "Quản lý Users",
          },
          {
            to: "/manager/labels",
            icon: <Tag size={20} />,
            label: "Quản lý nhãn",
          },
          {
            to: "/manager/product-creation",
            icon: <FlaskConical size={20} />,
            label: "Tạo sản phẩm",
          },
          // {
          //   to: "/manager/production-batches",
          //   icon: <FlaskConical size={20} />,
          //   label: "Lô sản xuất",
          // },
          {
            to: "/ai/console",
            icon: <Bot size={20} />,
            label: "AI Agent",
          },
        ];

      // ===== MENU CHO QUALITY CONTROL =====
      case "quality-control":
        return [
          {
            to: "/qc/dashboard",
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard",
          },
          {
            to: "/qc/inbound",
            icon: <ClipboardCheck size={20} />,
            label: "Kiểm soát đầu vào",
          },
          {
            to: "/qc/inspection",
            icon: <ShieldCheck size={20} />,
            label: "Kiểm định sản phẩm",
          },
          {
            to: "/qc/inventory",
            icon: <ShieldCheck size={20} />,
            label: "Kiểm định tồn kho",
          },
          {
            to: "/qc/traceability",
            icon: <FileSearch size={20} />,
            label: "Báo cáo & Truy vết",
          },
          {
            to: "/ai/console",
            icon: <Bot size={20} />,
            label: "AI Agent",
          },
        ];

      // ===== MENU CHO OPERATOR =====
      case "operator":
        return [
          {
            to: "/operator/dashboard",
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard",
          },
          {
            to: "/operator/inventory",
            icon: <Package size={20} />,
            label: "Quản lý lô hàng",
          },
          {
            to: "/operator/product",
            icon: <FlaskConical size={20} />,
            label: "Tạo sản phẩm",
          },
          {
            to: "/operator/stock-in",
            icon: <ArrowDownCircle size={20} />,
            label: "Nhập kho",
          },
          {
            to: "/operator/stock-out",
            icon: <ArrowUpCircle size={20} />,
            label: "Xuất kho",
          },
          // {
          //   to: "/operator/warehouse-slips",
          //   icon: <FileText size={20} />,
          //   label: "Phiếu kho",
          // },
          {
            to: "/operator/audit",
            icon: <ListChecks size={20} />,
            label: "Kiểm kê",
          },
          {
            to: "/operator/history",
            icon: <History size={20} />,
            label: "Lịch sử",
          },
          {
            to: "/operator/inventory-transactions",
            icon: <FileText size={20} />,
            label: "Lịch sử giao dịch",
          },
          {
            to: "/operator/labels",
            icon: <Tag size={20} />,
            label: "In nhãn",
          },
          {
            to: "/operator/barcodes",
            icon: <Barcode size={20} />,
            label: "Barcode",
          },
          {
            to: "/ai/console",
            icon: <Bot size={20} />,
            label: "AI Agent",
          },
        ];

      // ===== MENU CHO IT ADMIN =====
      case "it_admin":
        return [
          {
            to: "/admin/dashboard",
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard IT",
          },
          {
            to: "/admin/users",
            icon: <UserIcon size={20} />,
            label: "Quản lý tài khoản",
          },
          {
            to: "/admin/audit",
            icon: <ShieldCheck size={20} />,
            label: "Audit Trail",
          },
          {
            to: "/admin/monitoring",
            icon: <Activity size={20} />,
            label: "Giám sát hệ thống",
          },
          {
            to: "/admin/error-logs",
            icon: <Terminal size={20} />,
            label: "Nhật ký lỗi",
          },
          {
            to: "/admin/backup",
            icon: <Database size={20} />,
            label: "Sao lưu & Phục hồi",
          },
          {
            to: "/admin/reports",
            icon: <FileBarChart size={20} />,
            label: "Báo cáo hệ thống",
          },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // Kiểm tra user có quyền sử dụng AI Assistant không
  const canUseAssistant =
    user?.role === "manager" ||
    user?.role === "operator" ||
    user?.role === "quality-control";

  // ===== XỬ LÝ ĐĂNG XUẤT =====
  // Gọi API logout để thu hồi refresh token, sau đó xóa localStorage và redirect về login
  const handleLogout = async () => {
    const refresh_token = localStorage.getItem("refresh_token");
    if (refresh_token) {
      try {
        await AuthService.logout(refresh_token);
      } catch {
        // Bỏ qua lỗi API, vẫn thực hiện logout local
      }
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans">
      {/* ===== SIDEBAR DÀNH CHO DESKTOP ===== */}
      {/* Sidebar cố định bên trái, chứa logo, navigation và user profile */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full md:translate-x-0 bg-white border-r border-gray-100 shadow-xl shadow-primary-900/5">
        <div className="h-full flex flex-col">
          {/* PHẦN LOGO */}
          <div className="p-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/25">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <div className="font-black text-gray-900 leading-none text-lg tracking-tighter">
                  PHARMA
                  <span className="text-blue-600">WMS</span>
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[2px] mt-1">
                  {getRoleLabel()}
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN ĐIỀU HƯỚNG (NAVIGATION) */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item, index) => {
              // Kiểm tra route hiện tại có active không
              const isActive =
                location.pathname === item.to ||
                location.pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl 
                    transition-all duration-300 ease-out group relative
                    animate-fadeInUp
                    ${
                      isActive
                        ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-600/30"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Hiệu ứng hover */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                  )}

                  {/* Icon container */}
                  <div
                    className={`
                    w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                    transition-all duration-300
                    ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600"
                    }
                  `}
                  >
                    {item.icon}
                  </div>

                  {/* Label */}
                  <span
                    className={`
                    font-semibold text-sm tracking-tight flex-1
                    ${isActive ? "text-white" : ""}
                  `}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator (thanh trắng bên trái) */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                  )}

                  {/* Hover arrow */}
                  {!isActive && (
                    <ChevronRight
                      size={14}
                      className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* PHẦN USER PROFILE */}
          <UserProfileSection
            user={user}
            onLogout={handleLogout}
            getDisplayNameFromUsername={getDisplayNameFromUsername}
          />
        </div>
      </aside>

      {/* ===== NÚT MENU MOBILE ===== */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 right-4 z-50 md:hidden p-3 bg-white rounded-2xl shadow-xl border border-gray-100 active:scale-90 transition-all"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ===== MOBILE MENU OVERLAY ===== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop mờ */}
          <div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-md transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          {/* Slide-in menu từ trái */}
          <aside className="fixed top-0 left-0 z-50 w-72 h-screen bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="h-full flex flex-col">
              <div className="p-8 border-b border-gray-50">
                <div className="font-black text-2xl tracking-tighter italic text-blue-600">
                  MENU
                </div>
              </div>
              <nav className="flex-1 px-4 py-8 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                      location.pathname === item.to
                        ? "bg-primary-600 text-white shadow-xl shadow-primary-600/25"
                        : "text-gray-500 hover:bg-primary-50"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <UserProfileSection
                user={user}
                onLogout={handleLogout}
                getDisplayNameFromUsername={getDisplayNameFromUsername}
              />
            </div>
          </aside>
        </div>
      )}

      {/* ===== KHU VỰC NỘI DUNG CHÍNH ===== */}
      <div className="md:ml-64 min-h-screen flex flex-col relative transition-all duration-300">
        {/* HEADER (TOPBAR) */}
        <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-100">
          <div className="px-8 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                Inventory Management System
              </h1>
              <p className="text-[11px] text-gray-400 font-bold mt-2 flex items-center gap-1 uppercase tracking-widest">
                Hệ thống Quản lý Dược phẩm <ChevronRight size={10} />{" "}
                {getRoleLabel()}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter italic">
                Server Status: Online
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT - Nơi các route components được render thông qua Outlet */}
        <main className="p-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="px-8 py-6 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-[2px] flex justify-between">
          <span>PharmaWMS v2.0.1</span>
          <span className="hidden sm:inline">
            © 2026 Toàn quyền bởi IT Department
          </span>
        </footer>
      </div>

      {/* AI ASSISTANT WIDGET - Chỉ hiển thị cho Manager, Operator, QC */}
      {canUseAssistant && <MyAssistantWidget />}
    </div>
  );
}
