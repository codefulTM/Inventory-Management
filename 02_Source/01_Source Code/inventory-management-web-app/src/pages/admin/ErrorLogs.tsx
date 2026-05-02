/**
 * ErrorLogs - Trang nhật ký lỗi (Logs) dành cho IT Administrator
 * 
 * Chức năng chính:
 * - Hiển thị danh sách log hệ thống (error, warn, info, debug)
 * - Tìm kiếm log theo mã lỗi, module hoặc nội dung
 * - Phân trang (pagination) để duyệt log dễ dàng
 * - Hiển thị thông tin: Thời gian, Mức độ, Nội dung, Mã lỗi, Module
 * 
 * Quyền truy cập: Chỉ IT Administrator (/admin/*)
 */
import { useState, useEffect } from 'react';
import { Alert, Table, Tag, Input, Pagination } from 'antd';
import { Search, FileText } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { PageWrapper, LoadingSkeleton } from '../../components/ui';

// Kiểu dữ liệu cho một bản ghi log hệ thống
interface AppLog {
  _id: string;                              // ID duy nhất của log
  level: 'info' | 'warn' | 'error' | 'debug'; // Mức độ log
  message: string;                            // Nội dung log
  error_code?: string;                         // Mã lỗi (nếu có)
  module?: string;                             // Module phát sinh log
  created_at: string;                          // Thời gian tạo log
}

// Ánh xạ mức độ log sang màu Tag trong Ant Design
const LEVEL_COLOR: Record<string, string> = {
  error: 'red',    // Lỗi - Đỏ
  warn: 'orange',   // Cảnh báo - Cam
  info: 'blue',    // Thông tin - Xanh dương
  debug: 'default', // Debug - Xám mặc định
};

export default function ErrorLogs() {
  // State lưu danh sách log từ backend
  const [logs, setLogs] = useState<AppLog[]>([]);
  // Từ khóa tìm kiếm (mã lỗi, module, nội dung)
  const [search, setSearch] = useState('');
  // Trang hiện tại (phân trang)
  const [page, setPage] = useState(1);
  // Số lượng log trên mỗi trang (cố định 20)
  const [limit] = useState(20);
  // Tổng số trang
  const [total, setTotal] = useState(0);
  // Trạng thái đang tải dữ liệu
  const [loading, setLoading] = useState(false);
  // Thông báo lỗi
  const [error, setError] = useState('');

  // useEffect: Tự động tải lại log khi chuyển trang
  useEffect(() => {
    fetchLogs();
  }, [page]);

  // Hàm lấy danh sách log từ backend API
  // Có hỗ trợ tìm kiếm: nếu có từ khóa thì gọi /logs/search, ngược lại gọi /logs
  const fetchLogs = async (searchQuery = '') => {
    setLoading(true);
    setError('');
    try {
      const endpoint = searchQuery.trim() ? '/logs/search' : '/logs';
      const params: Record<string, any> = { page, limit };
      if (searchQuery.trim()) params.q = searchQuery; // Thêm từ khóa tìm kiếm vào params

      const { data, error: apiError } = await apiClient.get<{ data: AppLog[]; pages: number }>(endpoint, { params });

      if (apiError) throw new Error(apiError.message || 'Không thể tải logs');

      setLogs(data?.data || []);
      setTotal(data?.pages || 1); // Tổng số trang để phân trang
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải logs');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý tìm kiếm: Reset về trang 1 và gọi API với từ khóa
  const handleSearch = () => {
    setPage(1);
    fetchLogs(search);
  };

  // Cấu hình cột cho bảng log hệ thống
  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => <span className="text-xs text-gray-500">{new Date(v).toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Mức độ',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      // Hiển thị Tag với màu tương ứng (Đỏ-Error, Cam-Warn, Xanh-Info)
      render: (level: string) => <Tag color={LEVEL_COLOR[level] || 'default'}>{level.toUpperCase()}</Tag>,
    },
    {
      title: 'Nội dung',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => <span className="text-sm text-gray-800 break-all">{msg}</span>,
    },
    {
      title: 'Mã lỗi',
      dataIndex: 'error_code',
      key: 'error_code',
      width: 120,
      render: (v?: string) => v ? <code className="text-xs bg-gray-100 px-1 rounded">{v}</code> : <span className="text-gray-300">—</span>,
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 140,
      render: (v?: string) => v || <span className="text-gray-300">—</span>,
    },
  ];

  // Hiển thị skeleton loading khi mới mount và chưa có dữ liệu log
  if (loading && logs.length === 0) {
    return (
      <PageWrapper>
        <div className="p-6 space-y-3">
          <LoadingSkeleton variant="text" className="w-48 h-8" />
          <LoadingSkeleton variant="text" className="w-full h-10" />
          <LoadingSkeleton variant="card" className="h-64" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="p-6 space-y-5">
        <div className="animate-fadeInUp">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={24} className="text-primary-600" />Nhật ký lỗi
          </h1>
          <p className="text-sm text-gray-500 mt-1">Xem và tìm kiếm log hệ thống</p>
        </div>

        {error && <Alert type="error" showIcon message={error} />}

        <div className="flex gap-3">
          <Input
            placeholder="Tìm theo mã lỗi, module hoặc nội dung..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<Search size={14} className="text-gray-400" />}
            className="flex-1"
            allowClear
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all active:scale-95"
          >
            Tìm kiếm
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="_id"
            pagination={false}
            loading={loading}
            size="small"
            locale={{ emptyText: <div className="py-8 text-gray-400">Không có log nào</div> }}
          />
        </div>

        {total > 1 && (
          <div className="flex justify-center">
            <Pagination
              current={page}
              total={total * limit}
              pageSize={limit}
              onChange={p => setPage(p)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
