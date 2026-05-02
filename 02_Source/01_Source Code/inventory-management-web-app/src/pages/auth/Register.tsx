/**
 * Register Page - Trang đăng ký tài khoản mới
 * ==============================================
 * Chức năng chính:
 * - Form đăng ký gồm 4 trường: username, email, password, confirmPassword
 * - Validation phía client: kiểm tra password và confirmPassword có khớp nhau
 * - Gọi AuthService.register() để gửi yêu cầu đăng ký tới backend API
 * - Sau khi đăng ký thành công, tự động chuyển hướng về trang login sau 1.5 giây
 * - Hiển thị thông báo lỗi (error) hoặc thành công (success)
 * 
 * Lưu ý: Backend có thể yêu cầu thêm validation (độ dài password, định dạng email, etc.)
 * Tài khoản mới đăng ký có thể cần được phê duyệt bởi admin tùy cấu hình hệ thống
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';

/**
 * Register Component - Xử lý form đăng ký người dùng mới
 * =======================================================
 * Quy trình đăng ký:
 * 1. Người dùng nhập thông tin (username, email, password, confirmPassword)
 * 2. Validate phía client: kiểm tra password === confirmPassword
 * 3. Gọi API đăng ký qua AuthService.register()
 * 4. Nếu thành công: hiển thị thông báo và chuyển về trang login
 * 5. Nếu thất bại: hiển thị thông báo lỗi từ server
 */
const Register = () => {
  const navigate = useNavigate();
  
  // ===== State quản lý form đăng ký =====
  const [username, setUsername] = useState('');         // Tên đăng nhập
  const [email, setEmail] = useState('');               // Email (dùng để nhận thông báo, khôi phục mật khẩu)
  const [password, setPassword] = useState('');          // Mật khẩu
  const [confirmPassword, setConfirmPassword] = useState(''); // Xác nhận mật khẩu
  const [loading, setLoading] = useState(false);        // Trạng thái đang xử lý
  const [error, setError] = useState<string | null>(null);     // Thông báo lỗi
  const [success, setSuccess] = useState<string | null>(null); // Thông báo thành công

  /**
   * Xử lý submit form đăng ký
   * ==========================
   * Quy trình:
   * 1. Ngăn form reload trang (e.preventDefault())
   * 2. Xóa thông báo lỗi và thành công cũ
   * 3. Validate phía client: kiểm tra password === confirmPassword
   * 4. Gọi AuthService.register() để gửi yêu cầu đăng ký tới backend
   * 5. Nếu thành công: hiển thị thông báo và tự động chuyển về trang login sau 1.5s
   * 6. Nếu thất bại: hiển thị thông báo lỗi từ server
   * 
   * Lưu ý: Backend có thể thực hiện thêm validation:
   * - Độ dài tối thiểu của password
   * - Độ phức tạp của password (chữ hoa, chữ thường, số, ký tự đặc biệt)
   * - Username không được trùng lặp
   * - Email phải đúng định dạng và không được trùng lặp
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn form reload trang
    setError(null);
    setSuccess(null);
    
    // Validate phía client: kiểm tra mật khẩu xác nhận có khớp không
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    setLoading(true);
    // Gọi API đăng ký tài khoản mới
    const { data, error } = await AuthService.register(username, email, password);
    setLoading(false);
    
    if (error) {
      // Hiển thị lỗi từ server (email đã tồn tại, username không hợp lệ, etc.)
      setError(error.message || 'Đăng ký thất bại');
      return;
    }
    
    if (data) {
      // Đăng ký thành công - hiển thị thông báo và chuyển hướng về trang login
      setSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
      // Tự động chuyển về trang login sau 1.5 giây để người dùng đăng nhập
      setTimeout(() => navigate('/auth/login'), 1500);
    }
  };

  // ===== Giao diện Form Đăng ký =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
        onSubmit={handleSubmit}  // Gọi handleSubmit khi submit form
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Đăng ký tài khoản</h2>
        
        {/* Trường tên đăng nhập - bắt buộc */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Tên đăng nhập</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            required    // HTML5 validation: bắt buộc nhập
            autoFocus  // Tự động focus khi load trang
          />
        </div>
        
        {/* Trường email - bắt buộc, định dạng email */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"  // HTML5 validation: kiểm tra định dạng email
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        {/* Trường mật khẩu - bắt buộc */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        {/* Trường xác nhận mật khẩu - bắt buộc, validate khớp với password ở handleSubmit */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Xác nhận mật khẩu</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        {/* Hiển thị thông báo lỗi từ server (email trùng, username trùng, etc.) */}
        {error && (
          <div className="mb-4 text-red-600 text-sm">{error}</div>
        )}
        
        {/* Hiển thị thông báo đăng ký thành công */}
        {success && (
          <div className="mb-4 text-green-600 text-sm">{success}</div>
        )}
        
        {/* Nút submit đăng ký - disabled khi đang loading */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
        
        {/* Link chuyển đến trang đăng nhập nếu đã có tài khoản */}
        <div className="mt-4 text-center">
          <span className="text-gray-500">Đã có tài khoản?</span>{' '}
          <a href="/auth/login" className="text-blue-600 hover:underline">Đăng nhập</a>
        </div>
      </form>
    </div>
  );
};

export default Register;
