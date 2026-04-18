import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Package, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthService } from "../../services/auth.service";

// Mock users for local development (bypass Keycloak)
const MOCK_USERS: Record<string, { username: string; email: string; role: string; user_id: string }> = {
  "admin-it": { username: "admin-it", email: "admin-it@test.com", role: "it_admin", user_id: "mock-it-001" },
  "admin-qc": { username: "admin-qc", email: "admin-qc@test.com", role: "quality-control", user_id: "mock-qc-001" },
  "admin-manager": { username: "admin-manager", email: "admin-manager@test.com", role: "manager", user_id: "mock-manager-001" },
  "admin-operator": { username: "admin-operator", email: "admin-operator@test.com", role: "operator", user_id: "mock-operator-001" },
};
const MOCK_PASSWORD = "Admin@123456";
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lockMessage = (location.state as any)?.lockMessage ?? null;
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Mock login for local development
    if (password === MOCK_PASSWORD && MOCK_USERS[username]) {
      const mockUser = MOCK_USERS[username];
      localStorage.setItem("auth_token", MOCK_TOKEN);
      localStorage.setItem("refresh_token", MOCK_TOKEN);
      localStorage.setItem("user", JSON.stringify(mockUser));
      const dashboardMap: Record<string, string> = {
        it_admin: "/admin/dashboard",
        manager: "/manager/dashboard",
        operator: "/operator/dashboard",
        "quality-control": "/qc/dashboard",
      };
      navigate(dashboardMap[mockUser.role] || "/", { replace: true });
      return;
    }

    try {
      const { data, error } = await AuthService.login(username, password);
      setLoading(false);
      if (error) {
        const msg = error.message || "";
        if (msg.includes("ACCOUNT_LOCKED:")) {
          const reason = msg.split("ACCOUNT_LOCKED:")[1] || "";
          setError(`Tài khoản của bạn đã bị khóa tạm thời.\n${reason ? `Lý do: ${reason}\n` : ""}Chúng tôi sẽ xem xét và liên hệ lại với bạn.\nĐể được hỗ trợ, vui lòng liên hệ: pharmaWMS@gmail.com`);
        } else if (msg.includes("ACCOUNT_DEACTIVATED:")) {
          const reason = msg.split("ACCOUNT_DEACTIVATED:")[1] || "";
          setError(`Tài khoản của bạn đã bị vô hiệu hóa vĩnh viễn.\n${reason ? `Lý do: ${reason}\n` : ""}Để được hỗ trợ, vui lòng liên hệ: pharmaWMS@gmail.com`);
        } else {
          setError(msg || "Đăng nhập thất bại");
        }
        return;
      }
      if (data) {
        localStorage.setItem("auth_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        const mapRole = (backendRole: string): string => {
          const roleMap: Record<string, string> = {
            Manager: "manager",
            Operator: "operator",
            "Quality Control Technician": "quality-control",
            "IT Administrator": "it_admin",
          };
          return roleMap[backendRole] || "operator";
        };

        const frontendRole = mapRole(String(data.user.role));
        const user = { ...data.user, role: frontendRole };
        localStorage.setItem("user", JSON.stringify(user));

        console.log("Login success. User:", user.username, "Role:", frontendRole);

        let dashboardPath = "/operator/dashboard";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/25 mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PHARMA WMS</h1>
          <p className="text-sm text-gray-500 mt-1">Warehouse Management System</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Đăng nhập hệ thống
          </h2>

          {/* Username */}
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
              required
              autoFocus
              placeholder="Nhập tên đăng nhập"
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
                  placeholder:text-gray-400
                  transition-all duration-200 pr-12"
                required
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 
                  text-gray-400 hover:text-gray-600 p-1
                  transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="mb-5 text-right">
            <Link 
              to="/auth/forgot-password" 
              className="text-sm text-primary-600 hover:text-primary-700 
                font-medium transition-colors duration-200"
            >
              Quên mật khẩu?
            </Link>
          </div>

          {/* Error messages */}
          {lockMessage && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 
              rounded-lg text-sm text-red-700 whitespace-pre-line
              animate-fadeIn"
            >
              {lockMessage}
            </div>
          )}
          {error && (
            <div className="mb-5 text-sm text-red-600 animate-fadeIn">
              {error}
            </div>
          )}

          {/* Submit button */}
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

          {/* Register link */}
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