import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../services/auth.service";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            required
          />
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
