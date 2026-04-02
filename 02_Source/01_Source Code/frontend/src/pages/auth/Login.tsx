import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthService } from "../../services/auth.service";

// Mock users for local development (bypass Keycloak)
const MOCK_USERS: Record<string, { username: string; email: string; role: string; user_id: string }> = {
  "admin-it": { username: "admin-it", email: "admin-it@test.com", role: "it_admin", user_id: "mock-it-001" },
  "admin-qc": { username: "admin-qc", email: "admin-qc@test.com", role: "quality-control", user_id: "mock-qc-001" },
  "admin-manager": { username: "admin-manager", email: "admin-manager@test.com", role: "manager", user_id: "mock-manager-001" },
  "admin-operator": { username: "admin-operator", email: "admin-operator@test.com", role: "operator", user_id: "mock-operator-001" },
};
const MOCK_PASSWORD = "Admin@123456";
// Fake JWT with exp year 2286 (won't expire)
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";

const Login = () => {
  const navigate = useNavigate();
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
        setError(error.message || "Đăng nhập thất bại");
        return;
      }
      if (data) {
        localStorage.setItem("auth_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        // Map backend role (uppercase format) to frontend format (lowercase)
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

        // Log session
        console.log(
          "Login success. User:",
          user.username,
          "Role:",
          frontendRole,
        );

        // Redirect theo role
        let dashboardPath = "/operator/dashboard"; // default to operator
        switch (frontendRole) {
          case "manager":
            dashboardPath = "/manager/dashboard";
            break;
          case "operator":
            dashboardPath = "/operator/dashboard";
            break;
          case "quality-control":
            dashboardPath = "/qc/dashboard";
            break;
          case "it_admin":
            dashboardPath = "/admin/dashboard";
            break;
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Đăng nhập hệ thống Week seven demo
        </h2>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Tên đăng nhập</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            required
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Mật khẩu</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="mb-4 text-right">
          <Link to="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
        <div className="mt-4 text-center">
          <span className="text-gray-500">Chưa có tài khoản?</span>{" "}
          <a href="/auth/register" className="text-blue-600 hover:underline">
            Đăng ký
          </a>
        </div>
      </form>
    </div>
  );
};

export default Login;
