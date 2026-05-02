/**
 * Reset Password Page - Trang đặt lại mật khẩu
 * ===========================================
 * Chức năng chính:
 * - Cho phép người dùng đặt mật khẩu mới sau khi click link từ email
 * - Token xác thực được truyền qua URL query parameter (?token=...)
 * - Validation: 
 *   + Mật khẩu mới và xác nhận phải khớp nhau
 *   + Mật khẩu tối thiểu 8 ký tự (minLength=8)
 * - Gọi API /auth/reset-password với token và mật khẩu mới
 * - Nếu không có token hoặc token hết hạn -> hiển thị lỗi
 * 
 * Luồng xử lý:
 * 1. Người dùng click link trong email -> đến trang này kèm token
 * 2. Hệ thống kiểm tra token hợp lệ (tồn tại và chưa hết hạn)
 * 3. Người dùng nhập mật khẩu mới và xác nhận
 * 4. Gọi API để cập nhật mật khẩu mới
 * 5. Chuyển hướng về trang login với thông báo thành công
 */

import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

/**
 * ResetPassword Component - Form đặt lại mật khẩu
 * ===============================================
 * Xử lý quy trình đổi mật khẩu khi người dùng quên mật khẩu
 * Token được tạo bởi backend, gửi qua email, có thời hạn sử dụng
 * Sử dụng apiClient để gọi API trực tiếp (không qua AuthService)
 */
const ResetPassword = () => {
  // Lấy token từ URL query parameter (?token=...)
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  // ===== State quản lý form đặt lại mật khẩu =====
  const [newPassword, setNewPassword] = useState("");       // Mật khẩu mới
  const [confirmPassword, setConfirmPassword] = useState(""); // Xác nhận mật khẩu mới
  const [showPassword, setShowPassword] = useState(false);   // Ẩn/hiện mật khẩu
  const [loading, setLoading] = useState(false);             // Trạng thái đang xử lý
  const [error, setError] = useState<string | null>(null);  // Thông báo lỗi

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
          <p className="text-red-600 mb-4">Link không hợp lệ hoặc đã hết hạn.</p>
          <Link to="/login" className="text-blue-600 hover:underline text-sm">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Xử lý submit form đặt lại mật khẩu
   * ==================================
   * Quy trình:
   * 1. Validate: kiểm tra mật khẩu mới và xác nhận có khớp nhau không
   * 2. Gọi API /auth/reset-password với token (từ URL) và mật khẩu mới
   * 3. Backend kiểm tra token có hợp lệ và chưa hết hạn không
   * 4. Nếu thành công: cập nhật mật khẩu mới và chuyển về trang login
   * 5. Nếu thất bại: hiển thị lỗi (token không hợp lệ/hết hạn)
   * 
   * Lưu ý: Mật khẩu mới phải có tối thiểu 8 ký tự (minLength=8 trong input)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn form reload trang
    
    // Validate: mật khẩu xác nhận phải khớp với mật khẩu mới
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Gọi API đặt lại mật khẩu với token và mật khẩu mới
    const { error } = await apiClient.post("/auth/reset-password", {
      token,           // Token xác thực từ URL (được gửi qua email)
      new_password: newPassword,  // Mật khẩu mới
    });
    
    setLoading(false);
    
    if (error) {
      // Lỗi: token không hợp lệ, đã hết hạn, hoặc đã được sử dụng
      setError(error.message || "Token không hợp lệ hoặc đã hết hạn");
      return;
    }
    
    // Đặt lại mật khẩu thành công -> chuyển về trang login với thông báo
    navigate("/login", { state: { resetSuccess: true } });
  };

  // ===== Giao diện Form Đặt lại mật khẩu =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-center">Đặt lại mật khẩu</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Nhập mật khẩu mới cho tài khoản.</p>
        
        {/* Form đặt lại mật khẩu */}
        <form onSubmit={handleSubmit}>
          {/* Trường nhập mật khẩu mới - có nút ẩn/hiện mật khẩu */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}  // Toggle hiển thị mật khẩu
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 pr-10"
                required
                minLength={8}  // Validation: tối thiểu 8 ký tự
                autoFocus      // Tự động focus vào input này khi load trang
              />
              {/* Nút ẩn/hiện mật khẩu */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  // Icon mắt gạch chéo (ẩn mật khẩu)
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  // Icon mắt (hiện mật khẩu)
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Trường xác nhận mật khẩu mới */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Xác nhận mật khẩu</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          {/* Hiển thị thông báo lỗi nếu có */}
          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
          
          {/* Nút submit đặt lại mật khẩu */}
          <button
            type="submit"
            disabled={loading}  // Vô hiệu hóa khi đang xử lý
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
          
          {/* Link quay lại trang đăng nhập */}
          <div className="mt-4 text-center">
            <Link to="/login" className="text-gray-500 hover:underline text-sm">
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
