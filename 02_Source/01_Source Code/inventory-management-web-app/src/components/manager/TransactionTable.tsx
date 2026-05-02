// File: components/manager/TransactionTable.tsx
// Component hiển thị bảng giao dịch kho (Inventory Transactions)
// Hỗ trợ phân trang, loading skeleton và hiển thị trạng thái các loại giao dịch

import React from 'react';
import type { InventoryTransaction } from '../../services/transactionService';
import { TableSkeleton, Badge } from '../../components/ui';

// Props cho component TransactionTable
interface TransactionTableProps {
  transactions: InventoryTransaction[];  // Danh sách giao dịch
  loading: boolean;                   // Trạng thái đang tải
  error: string | null;              // Lỗi nếu có
  pagination: {                      // Thông tin phân trang
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;  // Callback đổi trang
}

// Hàm format ngày tháng sang định dạng en-US
const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Component chính TransactionTable
export const TransactionTableComponent: React.FC<TransactionTableProps> = ({
  transactions,
  loading,
  error,
  pagination,
  onPageChange,
}) => {
  // Hiển thị skeleton khi đang tải
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <TableSkeleton rows={5} columns={8} />
      </div>
    );
  }

  // Hiển thị lỗi
  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-lg p-4 text-error-700">
        <p>Lỗi: {error}</p>
      </div>
    );
  }

  // Hiển thị khi không có dữ liệu
  if (transactions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        <p>Không tìm thấy giao dịch. Thử điều chỉnh bộ lọc.</p>
      </div>
    );
  }

  return (
    // Container chính hiển thị bảng
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* BẢNG GIAO DỊCH */}
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {/* Tiêu đề các cột */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lot ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Material ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Loại
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Số lượng
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Đơn vị
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ngày
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Số tham chiếu
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Người thực hiện
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ghi chú
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {/* Map qua danh sách giao dịch để hiển thị */}
          {transactions.map((transaction, index) => (
            <tr key={transaction._id} className="hover:bg-gray-50 transition-colors duration-150 stagger-item-fast" style={{ animationDelay: `${index * 30}ms` }}>
              {/* Lot ID - hiển thị 8 ký tự đầu */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.lot_id ? transaction.lot_id.substring(0, 8) : '-'}...
              </td>
              {/* Material ID - hiển thị 8 ký tự đầu */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.material_id ? transaction.material_id.substring(0, 8) : '-'}...
              </td>
              {/* Loại giao dịch - badge màu */}
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <Badge variant={transaction.transaction_type === 'Receipt' ? 'primary' : 'warning'}>
                  {transaction.transaction_type}
                </Badge>
              </td>
              {/* Số lượng */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.quantity}
              </td>
              {/* Đơn vị */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.unit_of_measure}
              </td>
              {/* Ngày giao dịch - format locale */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(transaction.transaction_date)}
              </td>
              {/* Số tham chiếu */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.reference_number || '-'}
              </td>
              {/* Người thực hiện - hiển thị 8 ký tự */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.performed_by.substring(0, 8)}...
              </td>
              {/* Ghi chú - truncate nếu dài */}
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={transaction.notes}>
                {transaction.notes || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PHÂN TRANG */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
        {/* Hiển thị thông tin phân trang */}
        <div className="text-sm text-gray-700">
          Hiển thị <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> đến{' '}
          <span className="font-medium">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{' '}
          của <span className="font-medium">{pagination.total}</span> giao dịch
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Previous */}
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>

          {/* Chỉ số trang */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Trang {pagination.page} / {pagination.pages}
            </span>
          </div>

          {/* Nút Next */}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
};
