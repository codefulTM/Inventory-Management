/**
 * Login Page - Trang đăng nhập hệ thống
 * ==========================================
 * Chức năng chính:
 * - Xác thực người dùng qua username/password
 * - Hỗ trợ 2 chế độ đăng nhập:
 *   1. Mock login: Dành cho development (bỏ qua Keycloak)
 *      + Password chung: "Admin@123456"
 *      + Các mock user: admin-it, admin-qc, admin-manager, admin-operator
 *   2. Real login: Kết nối backend API qua AuthService (sử dụng Keycloak)
 * - Xử lý các trạng thái tài khoản: khóa tạm thời (LOCKED), vô hiệu hóa (DEACTIVATED)
 * - Tự động điều hướng về dashboard tương ứng với vai trò người dùng:
 *   + it_admin -> /admin/dashboard
 *   + manager -> /manager/dashboard
 *   + operator -> /operator/dashboard
 *   + quality-control -> /qc/dashboard
 * - Lưu trữ auth_token, refresh_token và thông tin user vào localStorage
 */

import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Package, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthService } from "../../services/auth.service";

/**
 * Dữ liệu người dùng giả lập (Mock users) cho môi trường development
 * Bỏ qua Keycloak authentication để thuận tiện cho việc phát triển
 * Tất cả mock users sử dụng chung một password: "Admin@123456"
 * Mỗi user có vai trò khác nhau để test phân quyền:
 * - admin-it: Quản trị viên hệ thống (IT Administrator)
 * - admin-qc: Nhân viên kiểm soát chất lượng (Quality Control)
 * - admin-manager: Quản lý kho (Manager)
 * - admin-operator: Nhân viên vận hành (Operator)
 */
const MOCK_USERS: Record<string, { username: string; email: string; role: string; user_id: string }> = {
  "admin-it": { username: "admin-it", email: "admin-it@test.com", role: "it_admin", user_id: "mock-it-001" },
  "admin-qc": { username: "admin-qc", email: "admin-qc@test.com", role: "quality-control", user_id: "mock-qc-001" },
  "admin-manager": { username: "admin-manager", email: "admin-manager@test.com", role: "manager", user_id: "mock-manager-001" },
  "admin-operator": { username: "admin-operator", email: "admin-operator@test.com", role: "operator", user_id: "mock-operator-001" },
};
// Password cố định cho tất cả mock users
const MOCK_PASSWORD = "Admin@123456";
// JWT token giả lập - trong thực tế token này được cấp bởi Keycloak
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";

/**
 * Component Login - Form đăng nhập
 * Xử lý: mock login, real login, account lock/deactivate messages, role-based redirect
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Lấy thông báo khóa tài khoản từ state (được redirect từ MainLayout)
  const lockMessage = (location.state as any)?.lockMessage ?? null;
  
  // State quản lý form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Xử lý submit form đăng nhập
   * =============================
   * Quy trình xử lý:
   * 1. Ngăn chặn hành vi mặc định của form (page reload)
   * 2. Kiểm tra Mock Login trước (chỉ dùng cho development)
   *    - Nếu username có trong MOCK_USERS và password = MOCK_PASSWORD
   *    - Lưu mock token và user info vào localStorage
   *    - Chuyển hướng đến dashboard tương ứng
   * 3. Nếu không phải mock login -> gọi AuthService.login() (Real Login)
   *    - Xử lý các loại lỗi đặc biệt từ backend:
   *      + ACCOUNT_LOCKED: Tài khoản bị khóa tạm thời (do nhập sai quá nhiều)
   *      + ACCOUNT_DEACTIVATED: Tài khoản bị vô hiệu hóa (do admin khóa)
   *    - Lưu access_token và refresh_token vào localStorage
   *    - Chuyển đổi role từ backend (display name) sang frontend (slug)
   *    - Lưu thông tin user vào localStorage với role đã chuẩn hóa
   *    - Chuyển hướng đến dashboard theo vai trò
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn form reload trang
    setLoading(true);
    setError(null);

    // ===== MOCK LOGIN (Chỉ dùng cho Development) =====
    // Mục đích: Bỏ qua Keycloak để test nhanh các tính năng
    // Điều kiện: password phải là MOCK_PASSWORD và username có trong MOCK_USERS
    if (password === MOCK_PASSWORD && MOCK_USERS[username]) {
      const mockUser = MOCK_USERS[username];
      // Lưu auth_token giả lập vào localStorage
      localStorage.setItem("auth_token", MOCK_TOKEN);
      localStorage.setItem("refresh_token", MOCK_TOKEN);
      localStorage.setItem("user", JSON.stringify(mockUser));
      
      // Bảng ánh xạ vai trò (role) sang đường dẫn dashboard tương ứng
      const dashboardMap: Record<string, string> = {
        it_admin: "/admin/dashboard",
        manager: "/manager/dashboard",
        operator: "/operator/dashboard",
        "quality-control": "/qc/dashboard",
      };
      // Chuyển hướng đến dashboard, replace: true để không quay lại trang login được
      navigate(dashboardMap[mockUser.role] || "/", { replace: true });
      return;
    }

    // ===== REAL LOGIN (Kết nối Backend qua Keycloak) =====
    try {
      // Gọi API đăng nhập thực tế qua AuthService
      const { data, error } = await AuthService.login(username, password);
      setLoading(false);
      
      if (error) {
        const msg = error.message || "";
        // Xử lý các loại lỗi đặc biệt từ backend
        if (msg.includes("ACCOUNT_LOCKED:")) {
          // Tài khoản bị khóa tạm thời (thường do đăng nhập sai quá số lần cho phép)
          const reason = msg.split("ACCOUNT_LOCKED:")[1] || "";
          setError(`Tài khoản của bạn đã bị khóa tạm thời.\n${reason ? `Lý do: ${reason}\n` : ""}Chúng tôi sẽ xem xét và liên hệ lại với bạn.\nĐể được hỗ trợ, vui lòng liên hệ: pharmaWMS@gmail.com`);
        } else if (msg.includes("ACCOUNT_DEACTIVATED:")) {
          // Tài khoản bị vô hiệu hóa vĩnh viễn (do admin thực hiện)
          const reason = msg.split("ACCOUNT_DEACTIVATED:")[1] || "";
          setError(`Tài khoản của bạn đã bị vô hiệu hóa vĩnh viễn.\n${reason ? `Lý do: ${reason}\n` : ""}Để được hỗ trợ, vui lòng liên hệ: pharmaWMS@gmail.com`);
        } else {
          // Lỗi đăng nhập thông thường (sai username/password)
          setError(msg || "Đăng nhập thất bại");
        }
        return;
      }
      
      if (data) {
        // Lưu JWT tokens vào localStorage để sử dụng cho các request sau
        localStorage.setItem("auth_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        // Chuyển đổi role từ backend format (display name) sang frontend format (slug)
        // Backend trả về: "Manager", "Operator", "Quality Control Technician", "IT Administrator"
        // Frontend sử dụng: "manager", "operator", "quality-control", "it_admin"
        const mapRole = (backendRole: string): string => {
          const roleMap: Record<string, string> = {
            Manager: "manager",
            Operator: "operator",
            "Quality Control Technician": "quality-control",
            "IT Administrator": "it_admin",
          };
          return roleMap[backendRole] || "operator"; // Mặc định là operator nếu không khớp
        };

        const frontendRole = mapRole(String(data.user.role));
        // Tạo object user với role đã được chuẩn hóa cho frontend
        const user = { ...data.user, role: frontendRole };
        localStorage.setItem("user", JSON.stringify(user));

        console.log("Login success. User:", user.username, "Role:", frontendRole);

        // Chuyển hướng đến dashboard tương ứng với vai trò người dùng
        let dashboardPath = "/operator/dashboard"; // Mặc định
        switch (frontendRole) {
          case "manager": dashboardPath = "/manager/dashboard"; break;
          case "operator": dashboardPath = "/operator/dashboard"; break;
          case "quality-control": dashboardPath = "/qc/dashboard"; break;
          case "it_admin": dashboardPath = "/admin/dashboard"; break;
        }
        navigate(dashboardPath, { replace: true });
      }
    } catch (err) {
      setLoading(false);
      setError("Lỗi hệ thống hoặc API");
      console.error("Login error:", err);
    }
  };

  // ===== Giao diện Form Đăng nhập =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md animate-fadeInUp">
        {/* Logo và tiêu đề hệ thống */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/25 mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PHARMA WMS</h1>
          <p className="text-sm text-gray-500 mt-1">Warehouse Management System</p>
        </div>

        {/* Form đăng nhập */}
        <form
          onSubmit={handleSubmit}  // Gọi handleSubmit khi submit
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Đăng nhập hệ thống
          </h2>

          {/* Trường tên đăng nhập - bắt buộc */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
                placeholder:text-gray-400
                transition-all duration-200"
              required    // HTML5 validation: bắt buộc nhập
              autoFocus   // Tự động focus khi load trang
              placeholder="Nhập tên đăng nhập"
            />
          </div>

          {/* Trường mật khẩu - có nút ẩn/hiện mật khẩu */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}  // Toggle hiển thị mật khẩu
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
                  placeholder:text-gray-400
                  transition-all duration-200 pr-12"
                required
                placeholder="Nhập mật khẩu"
              />
              {/* Nút ẩn/hiện mật khẩu */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 
                  text-gray-400 hover:text-gray-600 p-1
                  transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />  // Icon mắt đóng (đang hiện mật khẩu)
                ) : (
                  <Eye className="w-5 h-5" />      // Icon mắt mở (đang ẩn mật khẩu)
                )}
              </button>
            </div>
          </div>

          {/* Link quên mật khẩu - chuyển đến trang ForgotPassword */}
          <div className="mb-5 text-right">
            <Link 
              to="/auth/forgot-password" 
              className="text-sm text-primary-600 hover:text-primary-700 
                font-medium transition-colors duration-200"
            >
              Quên mật khẩu?
            </Link>
          </div>

          {/* Hiển thị thông báo tài khoản bị khóa (từ state của navigate) */}
          {lockMessage && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 
              rounded-lg text-sm text-red-700 whitespace-pre-line
              animate-fadeIn"
            >
              {lockMessage}
            </div>
          )}
          {/* Hiển thị thông báo lỗi đăng nhập */}
          {error && (
            <div className="mb-5 text-sm text-red-600 animate-fadeIn">
              {error}
            </div>
          )}

          {/* Nút đăng nhập - disabled khi đang loading */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg 
              font-semibold text-sm
              hover:bg-primary-700 active:bg-primary-800
              shadow-md shadow-primary-600/20 hover:shadow-lg hover:shadow-primary-600/30
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>

          {/* Link đăng ký tài khoản mới */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-500">Chưa có tài khoản?</span>{" "}
            <a 
              href="/auth/register" 
              className="text-sm text-primary-600 hover:text-primary-700 
                font-medium transition-colors duration-200"
            >
              Đăng ký
            </a>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 PharmaWMS. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;