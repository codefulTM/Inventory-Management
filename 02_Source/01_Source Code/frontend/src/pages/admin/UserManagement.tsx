import { useEffect, useState } from "react";
import { UserService, type User, type UserRole, type UpdateUserPayload } from "../../services/user.service";

const ROLES: UserRole[] = [
  "Manager",
  "Operator",
  "Quality Control Technician",
  "IT Administrator",
];

const ROLE_BADGE: Record<UserRole, string> = {
  Manager: "bg-purple-100 text-purple-700",
  Operator: "bg-blue-100 text-blue-700",
  "Quality Control Technician": "bg-yellow-100 text-yellow-700",
  "IT Administrator": "bg-red-100 text-red-700",
};

const defaultForm = { username: "", email: "", role: "Operator" as UserRole };
const defaultEditForm: UpdateUserPayload = { email: "", role: "Operator" };

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserPayload>(defaultEditForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await UserService.getAll();
    if (data) setUsers(data.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      fetchUsers();
      return;
    }
    const { data } = await UserService.search(q);
    if (data) setUsers(data.data);
  };

  const handleOpenEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ email: user.email, role: user.role });
    setEditError(null);
  };

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
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    }
  };

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
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div>
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

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm theo username hoặc email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Table */}
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
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chưa có tài khoản nào</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.user_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ROLE_BADGE[user.role] || "bg-gray-100 text-gray-600"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {user.is_active ? "Hoạt động" : "Bị khóa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {user.created_date ? new Date(user.created_date).toLocaleDateString("vi-VN") : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                    >
                      Chỉnh sửa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
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

      {/* Create Modal */}
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
