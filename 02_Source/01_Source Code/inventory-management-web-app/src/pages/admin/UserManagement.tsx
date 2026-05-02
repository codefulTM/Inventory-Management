/**
 * UserManagement - Trang quản lý tài khoản người dùng dành cho IT Administrator
 * 
 * Chức năng chính:
 * - Hiển thị danh sách tất cả user trong hệ thống (dạng bảng)
 * - Tạo mới tài khoản (modal form: username, email, role)
 * - Chỉnh sửa tài khoản (đổi email, thay đổi vai trò)
 * - Khóa tạm thời hoặc vĩnh viễn tài khoản (có lý do khóa)
 * - Mở khóa tài khoản đã bị khóa
 * - Tìm kiếm user theo username hoặc email
 * 
 * Quyền truy cập: Chỉ IT Administrator (/admin/*)
 * Các vai trò có thể gán: Manager, Operator, Quality Control Technician, IT Administrator
 */
import { useEffect, useState } from "react";
import { UserService, type User, type UserRole, type UpdateUserPayload } from "../../services/user.service";

// Danh sách các vai trò (role) có thể gán cho user trong hệ thống
const ROLES: UserRole[] = [
  "Manager",              // Quản lý kho
  "Operator",             // Nhân viên vận hành kho
  "Quality Control Technician", // Kỹ thuật viên QC
  "IT Administrator",     // Quản trị viên hệ thống
];

// Màu sắc badge hiển thị vai trò user (dùng trong bảng danh sách)
const ROLE_BADGE: Record<UserRole, string> = {
  Manager: "bg-purple-100 text-purple-700",              // Tím - Quản lý
  Operator: "bg-blue-100 text-blue-700",                 // Xanh dương - Vận hành
  "Quality Control Technician": "bg-yellow-100 text-yellow-700", // Vàng - QC
  "IT Administrator": "bg-red-100 text-red-700",         // Đỏ - IT Admin
};

// Form mặc định khi tạo tài khoản mới (role mặc định là Operator)
const defaultForm = { username: "", email: "", role: "Operator" as UserRole };
// Form mặc định khi chỉnh sửa tài khoản
const defaultEditForm: UpdateUserPayload = { email: "", role: "Operator" };

export default function UserManagement() {
  // State lưu danh sách user từ backend
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true); // Trạng thái đang tải danh sách
  const [showModal, setShowModal] = useState(false); // Hiển thị modal tạo tài khoản
  const [form, setForm] = useState(defaultForm); // Dữ liệu form tạo tài khoản
  const [submitting, setSubmitting] = useState(false); // Trạng thái đang gửi request tạo user
  const [error, setError] = useState<string | null>(null); // Lỗi khi tạo user
  const [success, setSuccess] = useState<string | null>(null); // Thông báo thành công
  const [search, setSearch] = useState(""); // Từ khóa tìm kiếm

  // State cho chức năng chỉnh sửa user
  const [editUser, setEditUser] = useState<User | null>(null); // User đang được chỉnh sửa
  const [editForm, setEditForm] = useState<UpdateUserPayload>(defaultEditForm); // Form chỉnh sửa
  const [editSubmitting, setEditSubmitting] = useState(false); // Đang gửi request cập nhật
  const [editError, setEditError] = useState<string | null>(null); // Lỗi khi cập nhật
  
  // State cho chức năng khóa/mở khóa tài khoản
  const [lockingId, setLockingId] = useState<string | null>(null); // ID user đang bị khóa (để hiển thị loading)
  const [lockTarget, setLockTarget] = useState<User | null>(null); // User mục tiêu để khóa
  const [lockType, setLockType] = useState<'locked' | 'deactivated'>('locked'); // Loại khóa: tạm thời hoặc vĩnh viễn
  const [lockReason, setLockReason] = useState(''); // Lý do khóa tài khoản

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserPayload>(defaultEditForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [lockTarget, setLockTarget] = useState<User | null>(null);
  const [lockType, setLockType] = useState<'locked' | 'deactivated'>('locked');
  const [lockReason, setLockReason] = useState('');

  // Hàm lấy danh sách tất cả user từ backend API
  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await UserService.getAll();
    if (data) setUsers(data.data);
    setLoading(false);
  };

  // useEffect: Tự động gọi API lấy danh sách user khi component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Hàm tìm kiếm user theo username hoặc email (gọi API search khi nhập >= 2 ký tự)
  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      fetchUsers(); // Nếu ít hơn 2 ký tự, hiển thị lại toàn bộ danh sách
      return;
    }
    const { data } = await UserService.search(q);
    if (data) setUsers(data.data);
  };

  // Xử lý submit form khóa tài khoản (tạm thời hoặc vĩnh viễn)
  const handleLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockTarget) return;
    setLockingId(lockTarget.user_id);
    // Gọi API deactivate với loại khóa và lý do
    const { error } = await UserService.deactivate(lockTarget.user_id, lockType, lockReason);
    setLockingId(null);
    if (error) {
      setLockTarget(null);
      return;
    }
    setSuccess(`Đã khóa tài khoản "${lockTarget.username}"`);
    setLockTarget(null);
    fetchUsers(); // Tải lại danh sách
    setTimeout(() => setSuccess(null), 3000); // Ẩn thông báo sau 3 giây
  };

  // Xử lý mở khóa tài khoản (kích hoạt lại user đã bị khóa)
  const handleUnlock = async (user: User) => {
    setLockingId(user.user_id);
    const { error } = await UserService.activate(user.user_id);
    setLockingId(null);
    if (error) return;
    setSuccess(`Đã mở khóa tài khoản "${user.username}"`);
    fetchUsers(); // Tải lại danh sách
    setTimeout(() => setSuccess(null), 3000);
  };

  // Mở modal chỉnh sửa thông tin user (điền sẵn email và role hiện tại)
  const handleOpenEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ email: user.email, role: user.role });
    setEditError(null);
  };

  // Xử lý submit form chỉnh sửa user (cập nhật email và vai trò)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSubmitting(true);
    setEditError(null);
    const { data, error } = await UserService.update(editUser.user_id, editForm);
    setEditSubmitting(false);
    if (error) {
      setEditError(error.message || "Cập nhật thất bại");
      return;
    }
    if (data) {
      setSuccess(`Cập nhật tài khoản "${data.username}" thành công`);
      setEditUser(null);
      fetchUsers(); // Tải lại danh sách
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Xử lý submit form tạo tài khoản mới
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error } = await UserService.create(form);
    setSubmitting(false);
    if (error) {
      setError(error.message || "Tạo tài khoản thất bại");
      return;
    }
    if (data) {
      setSuccess(`Tạo tài khoản "${data.username}" thành công`);
      setShowModal(false);
      setForm(defaultForm);
      fetchUsers(); // Tải lại danh sách
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div>
      {/* Phần header: Tiêu đề trang và nút tạo tài khoản mới */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý tài khoản</h2>
          <p className="text-sm text-gray-400 mt-1">Tạo và quản lý tài khoản người dùng trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          + Tạo tài khoản
        </button>
      </div>

      {/* Hiển thị thông báo thành công */}
      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold">
          {success}
        </div>
      )}

      {/* Ô tìm kiếm user theo username hoặc email */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm theo username hoặc email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Bảng hiển thị danh sách user: Username, Email, Vai trò, Trạng thái, Ngày tạo, Thao tác */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Username</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Email</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Vai trò</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Ngày tạo</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
              {loading ? (
                // Hiển thị trạng thái đang tải
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                // Không có user nào
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chưa có tài khoản nào</td></tr>
              ) : (
                // Hiển thị danh sách user
                users.map((user) => (
                  <tr key={user.user_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      {/* Badge vai trò với màu sắc tương ứng */}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ROLE_BADGE[user.role] || "bg-gray-100 text-gray-600"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {/* Trạng thái hoạt động hoặc bị khóa */}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {user.is_active ? "Hoạt động" : "Bị khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {user.created_date ? new Date(user.created_date).toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {/* Các nút thao tác: Chỉnh sửa, Khóa, Mở khóa */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                        >
                          Chỉnh sửa
                        </button>
                        {user.is_active ? (
                          <>
                            {/* Khóa tạm thời: user có thể mở khóa lại được */}
                            <button
                              onClick={() => { setLockTarget(user); setLockType('locked'); setLockReason(''); }}
                              disabled={lockingId === user.user_id}
                              className="px-3 py-1.5 text-xs font-bold text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-all disabled:opacity-50"
                            >
                              Khoá tạm thời
                            </button>
                            {/* Khóa vĩnh viễn: cần can thiệp thủ công để mở */}
                            <button
                              onClick={() => { setLockTarget(user); setLockType('deactivated'); setLockReason(''); }}
                              disabled={lockingId === user.user_id}
                              className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                              Khoá vĩnh viễn
                            </button>
                          </>
                        ) : (
                          // Nút mở khóa cho tài khoản đã bị khóa
                          <button
                            onClick={() => handleUnlock(user)}
                            disabled={lockingId === user.user_id}
                            className="px-3 py-1.5 text-xs font-bold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-all disabled:opacity-50"
                          >
                            {lockingId === user.user_id ? "..." : "Mở khóa"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>

      {/* Modal chỉnh sửa thông tin user: Email và Vai trò */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-black text-gray-900 mb-1">Chỉnh sửa tài khoản</h3>
            <p className="text-sm text-gray-400 mb-6">@{editUser.username}</p>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Vai trò</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {editError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold">
                  {editError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditUser(null); setEditError(null); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal khóa tài khoản: Chọn loại khóa và nhập lý do */}
      {lockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-black text-gray-900 mb-1">
              {lockType === 'locked' ? 'Khóa tạm thời' : 'Khóa vĩnh viễn'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">@{lockTarget.username}</p>
            <form onSubmit={handleLockSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Lý do khóa <span className="text-red-500">*</span></label>
                <textarea
                  required
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  rows={3}
                  placeholder="Nhập lý do khóa tài khoản..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLockTarget(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={lockingId === lockTarget.user_id}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {lockingId === lockTarget.user_id ? "Đang khóa..." : "Xác nhận khóa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal tạo tài khoản mới: Username, Email, Vai trò */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-black text-gray-900 mb-6">Tạo tài khoản mới</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên đăng nhập</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="VD: nguyen.van.a"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="VD: nguyen.van.a@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Vai trò</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(defaultForm); setError(null); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
