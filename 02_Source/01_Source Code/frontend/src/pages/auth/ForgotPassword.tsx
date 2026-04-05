import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await apiClient.post("/auth/forgot-password", { email });
    setLoading(false);
    if (error) {
      setError(error.message || "Có lỗi xảy ra");
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-center">Quên mật khẩu</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>

        {sent ? (
          <div className="text-center">
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
              Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.
            </div>
            <Link to="/login" className="text-blue-600 hover:underline text-sm">
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="email@company.com"
                required
                autoFocus
              />
            </div>
            {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Đang gửi..." : "Gửi link đặt lại"}
            </button>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-gray-500 hover:underline text-sm">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
