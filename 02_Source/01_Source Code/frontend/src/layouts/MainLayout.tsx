import { useState, type ReactNode } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  ClipboardCheck,
  FileText,
  LogOut,
  Menu,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  ListChecks,
  History,
  Activity,
  Terminal,
  Database,
  ShieldCheck,
  FileBarChart,
  User as UserIcon,
  FileSearch,
  ChevronRight,
  Tag,
  FlaskConical,
} from "lucide-react";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

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
    <div className="bg-blue-50/50 rounded-2xl p-4 mb-3 border border-blue-100/50 flex items-center space-x-3">
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
        <UserIcon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-gray-900 truncate tracking-tight">
          {user?.username || "Unknown User"}
        </div>
        <div className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-widest mt-1">
          {getDisplayNameFromUsername(user?.username)}
        </div>
      </div>
    </div>
    <button
      onClick={onLogout}
      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 shadow-sm active:scale-95 font-bold text-sm"
    >
      <LogOut size={18} />
      <span>Đăng xuất</span>
    </button>
  </div>
);

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lấy user từ localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // Hàm hiển thị tên vai trò trên giao diện
  const getDisplayNameFromUsername = (username?: string) => {
    switch (username) {
      case "1":
        return "Manager";
      case "2":
        return "Quality Control";
      case "3":
        return "Operator";
      case "4":
        return "IT Admin";
      default:
        return "Staff";
    }
  };

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

  // Logic cấu trúc Navbar theo vai trò (IT Admin có đủ 5 phần)
  const getNavItems = (): NavItem[] => {
    switch (user?.role) {
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
            to: "/manager/material",
            icon: <Package size={20} />,
            label: "Quản lý vật tư",
          },
          {
            to: "/manager/in-out",
            icon: <FileText size={20} />,
            label: "Quản lý nhập/xuất kho",
          },
          {
            to: "/manager/stock",
            icon: <BarChart3 size={20} />,
            label: "Tồn kho",
          },
          {
            to: "/manager/reports",
            icon: <FileText size={20} />,
            label: "Báo cáo",
          },
          {
            to: "/manager/transaction",
            icon: <History size={20} />,
            label: "Lịch sử giao dịch",
          },
          {
            to: "/manager/users",
            icon: <FileText size={20} />,
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
          {
            to: "/manager/production-batches",
            icon: <FlaskConical size={20} />,
            label: "Lô sản xuất",
          },
        ];
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
            to: "/qc/inspection",
            icon: <FileText size={20} />,
            label: "Kiểm định sản phẩm",
          },
        ];
      case "operator":
        return [
          {
            to: "/operator/dashboard",
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard",
          },
          {
            to: "/operator/material",
            icon: <Package size={20} />,
            label: "Quản lý nguyên liệu",
          },
          {
            to: "/operator/product",
            icon: <ArrowDownCircle size={20} />,
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
            to: "/operator/labels",
            icon: <Tag size={20} />,
            label: "In nhãn",
          },
        ];
      case "it_admin":
        return [
          {
            to: "/it-admin",
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard IT",
          },
          {
            to: "/it-admin/monitoring",
            icon: <Activity size={20} />,
            label: "Giám sát hệ thống",
          },
          {
            to: "/it-admin/logs",
            icon: <Terminal size={20} />,
            label: "Nhật ký lỗi",
          },
          {
            to: "/it-admin/backup",
            icon: <Database size={20} />,
            label: "Sao lưu & Phục hồi",
          },
          {
            to: "/it-admin/reports",
            icon: <FileBarChart size={20} />,
            label: "Báo cáo hệ thống",
          },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // Thêm handleLogout
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans">
      {/* SIDEBAR DÀNH CHO DESKTOP */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full md:translate-x-0 bg-white border-r border-gray-100 shadow-xl shadow-blue-900/5">
        <div className="h-full flex flex-col">
          {/* LOGO SECTION */}
          <div className="p-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
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

          {/* NAVIGATION SECTION */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.to ||
                location.pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200 translate-x-1"
                      : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`${isActive ? "text-white" : "group-hover:text-blue-600 transition-colors"}`}
                    >
                      {item.icon}
                    </span>
                    <span className="font-bold text-sm tracking-tight">
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <ChevronRight size={14} className="text-white/50" />
                  )}
                </Link>
              );
            })}
          </nav>
          <UserProfileSection
            user={user}
            onLogout={handleLogout}
            getDisplayNameFromUsername={getDisplayNameFromUsername}
          />
        </div>
      </aside>

      {/* NÚT MOBILE MENU */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 right-4 z-50 md:hidden p-3 bg-white rounded-2xl shadow-xl border border-gray-100 active:scale-90 transition-all"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-md transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
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
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-200"
                        : "text-gray-500 hover:bg-blue-50"
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

      {/* MAIN CONTENT AREA */}
      <div className="md:ml-64 min-h-screen flex flex-col relative transition-all duration-300">
        {/* TOPBAR HEADER */}
        <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-100">
          <div className="px-8 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                Week 7 - Demo - 456
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

        {/* PAGE CONTENT */}
        <main className="p-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <Outlet />
        </main>

        {/* FOOTER GIẢ LẬP */}
        <footer className="px-8 py-6 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-[2px] flex justify-between">
          <span>PharmaWMS v2.0.1</span>
          <span className="hidden sm:inline">
            © 2026 Toàn quyền bởi IT Department
          </span>
        </footer>
      </div>
    </div>
  );
}
