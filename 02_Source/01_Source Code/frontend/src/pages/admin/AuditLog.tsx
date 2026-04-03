import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../services/apiClient";

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Đăng nhập thành công",
  LOGIN_FAILED: "Đăng nhập thất bại",
  LOGOUT_SUCCESS: "Đăng xuất thành công",
  LOGOUT_FAILED: "Đăng xuất thất bại",
  USER_CREATED: "Tạo tài khoản",
  USER_UPDATED: "Cập nhật tài khoản",
  USER_LOCKED: "Khóa tài khoản",
  USER_UNLOCKED: "Mở khóa tài khoản",
  PASSWORD_RESET_REQUESTED: "Yêu cầu đặt lại mật khẩu",
  PASSWORD_RESET_COMPLETED: "Đặt lại mật khẩu thành công",
};

const ACTION_BADGE: Record<string, string> = {
  LOGIN_SUCCESS: "bg-green-100 text-green-700",
  LOGIN_FAILED: "bg-red-100 text-red-600",
  LOGOUT_SUCCESS: "bg-blue-100 text-blue-700",
  LOGOUT_FAILED: "bg-red-100 text-red-600",
  USER_CREATED: "bg-blue-100 text-blue-700",
  USER_UPDATED: "bg-yellow-100 text-yellow-700",
  USER_LOCKED: "bg-orange-100 text-orange-700",
  USER_UNLOCKED: "bg-teal-100 text-teal-700",
  PASSWORD_RESET_REQUESTED: "bg-purple-100 text-purple-700",
  PASSWORD_RESET_COMPLETED: "bg-purple-100 text-purple-700",
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

interface AuditEntry {
  _id: string;
  username: string;
  action: string;
  ip?: string;
  user_agent?: string;
  details?: Record<string, any>;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function parseUA(ua?: string) {
  if (!ua) return "-";
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return "Chrome";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  if (/Edg/.test(ua)) return "Edge";
  return ua.slice(0, 30);
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState({ username: "", action: "", dateFrom: "", dateTo: "" });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: "50" };
      if (applied.username) params.username = applied.username;
      if (applied.action) params.action = applied.action;
      if (applied.dateFrom) params.date_from = new Date(applied.dateFrom).toISOString();
      if (applied.dateTo) {
        const d = new Date(applied.dateTo);
        d.setHours(23, 59, 59, 999);
        params.date_to = d.toISOString();
      }
      const { data, error: apiError } = await apiClient.get<{ data: AuditEntry[]; pagination: Pagination }>("/audit-logs", { params });
      if (apiError) {
        setError(apiError.message || "Không thể tải Audit Trail. Kiểm tra quyền truy cập.");
        setLogs([]);
        setPagination({ page: 1, limit: 50, total: 0, totalPages: 1 });
      } else if (data) {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải Audit Trail");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void fetchLogs(1);
  }, [fetchLogs]);

  const handleApply = () => {
    setApplied({ username, action, dateFrom, dateTo });
  };

  const handleReset = () => {
    setUsername("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    setApplied({ username: "", action: "", dateFrom: "", dateTo: "" });
  };

  const handleExportCSV = async () => {
    setExporting(true);
    const params = new URLSearchParams();
    if (applied.username) params.set("username", applied.username);
    if (applied.action) params.set("action", applied.action);
    if (applied.dateFrom) params.set("date_from", new Date(applied.dateFrom).toISOString());
    if (applied.dateTo) {
      const d = new Date(applied.dateTo);
      d.setHours(23, 59, 59, 999);
      params.set("date_to", d.toISOString());
    }
    const token = localStorage.getItem("auth_token");
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${baseUrl}/audit-logs/export/csv?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Audit Trail</h2>
          <p className="text-sm text-gray-400 mt-1">Lịch sử truy cập và hoạt động tài khoản</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 text-sm font-bold text-green-700 border border-green-200 rounded-xl hover:bg-green-50 transition-all disabled:opacity-50"
          >
            {exporting ? "Đang xuất..." : "Xuất CSV"}
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 text-sm font-bold text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
          >
            Xuất PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Người dùng</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username..."
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 w-44"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Loại hoạt động</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 w-52"
          >
            <option value="">Tất cả</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
        >
          Tìm kiếm
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
        >
          Đặt lại
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Thời gian</th>
              <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Người dùng</th>
              <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Hoạt động</th>
              <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">IP</th>
              <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Trình duyệt</th>
              <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Không có dữ liệu</td></tr>
            ) : logs.map((log) => (
              <tr key={log._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString("vi-VN")}
                </td>
                <td className="px-5 py-3 font-semibold text-gray-900">{log.username}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ACTION_BADGE[log.action] || "bg-gray-100 text-gray-600"}`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs font-mono">{log.ip || "-"}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{parseUA(log.user_agent)}</td>
                <td className="px-5 py-3 text-gray-400 text-xs max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {pagination.total} bản ghi · Trang {pagination.page}/{pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Trước
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
