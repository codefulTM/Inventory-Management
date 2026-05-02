/**
 * Forgot Password Page - Trang quên mật khẩu
 * ===========================================
 * Chức năng chính:
 * - Người dùng nhập địa chỉ email đã đăng ký
 * - Gửi yêu cầu đặt lại mật khẩu tới backend API (/auth/forgot-password)
 * - Backend gửi email chứa link đặt lại mật khẩu (có chứa token)
 * 
 * Bảo mật (Security):
 * - Không tiết lộ email có tồn tại trong hệ thống hay không
 * - Dù email không tồn tại, vẫn hiển thị thông báo "Nếu email tồn tại..."
 * - Ngăn chặn attacker dò tìm danh sách email hợp lệ
 * 
 * Luồng xử lý:
 * 1. Người dùng nhập email -> nhấn "Gửi link đặt lại"
 * 2. Gọi API forgot-password
 * 3. Hiển thị thông báo xác nhận (không phân biệt thành công/thất bại)
 * 4. Người dùng check email và click vào link (chuyển đến ResetPassword)
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

/**
 * ForgotPassword Component - Form yêu cầu đặt lại mật khẩu
 * ========================================================
 * Xử lý gửi yêu cầu reset password qua email
 * Sử dụng apiClient để gọi trực tiếp API (không qua AuthService)
 * Bảo vệ tính riêng tư: luôn hiển thị thông báo thành công dù email có tồn tại hay không
 */
const ForgotPassword = () => {
  // ===== State quản lý form =====
  const [email, setEmail] = useState("");           // Email đăng ký
  const [loading, setLoading] = useState(false);     // Trạng thái đang gửi yêu cầu
  const [sent, setSent] = useState(false);          // Đã gửi yêu cầu thành công (dù email có tồn tại hay không)
  const [error, setError] = useState<string | null>(null); // Thông báo lỗi (lỗi hệ thống, mạng, etc.)

  /**
   * Xử lý submit form quên mật khẩu
   * ===============================
   * Quy trình:
   * 1. Ngăn form reload trang
   * 2. Gọi API /auth/forgot-password với email người dùng nhập
   * 3. Backend sẽ gửi email chứa link đặt lại mật khẩu (có chứa token)
   * 4. Hiển thị thông báo xác nhận (không quan tâm email có tồn tại hay không)
   * 
   * Bảo mật:
   * - Luôn hiển thị thông báo thành công để tránh lộ thông tin email có tồn tại
   * - Ngăn chặn attacker dùng tính năng này để dò email hợp lệ trong hệ thống
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn form reload trang
    setLoading(true);
    setError(null);
    
    // Gọi API quên mật khẩu - backend sẽ gửi email reset nếu email tồn tại
    const { error } = await apiClient.post("/auth/forgot-password", { email });
    setLoading(false);
    
    if (error) {
      // Lỗi hệ thống (mạng, server down, etc.) - không phải lỗi email không tồn tại
      setError(error.message || "Có lỗi xảy ra");
      return;
    }
    
    // Đánh dấu đã gửi yêu cầu (dù email có tồn tại hay không - bảo mật)
    setSent(true);
  };

  // ===== Giao diện Form Quên mật khẩu =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-center">Quên mật khẩu</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>

        {/* Hiển thị thông báo đã gửi (dù email có tồn tại hay không - bảo mật) */}
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
          // Form nhập email để gửi link đặt lại mật khẩu
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"  // HTML5 validation: kiểm tra định dạng email
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="email@company.com"
                required    // Bắt buộc nhập
                autoFocus   // Tự động focus khi load trang
              />
            </div>
            {/* Hiển thị lỗi hệ thống (mạng, server, etc.) */}
            {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
            {/* Nút gửi link đặt lại mật khẩu */}
            <button
              type="submit"
              disabled={loading}  // Vô hiệu hóa khi đang gửi
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Đang gửi..." : "Gửi link đặt lại"}
            </button>
            {/* Link quay lại trang đăng nhập */}
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
