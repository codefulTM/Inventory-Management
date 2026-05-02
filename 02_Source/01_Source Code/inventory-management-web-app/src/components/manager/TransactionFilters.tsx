/**
 * Component TransactionFilters
 * Thanh bộ lọc giao dịch kho cho quản lý (Manager role)
 * Cho phép lọc theo Lot ID, Material ID, loại giao dịch, người thực hiện, số tham chiếu, ngày tháng
 */
import React, { useState } from 'react';
import type { TransactionFilters } from '../../services/transactionService';

/** Props cho component TransactionFilters */
interface TransactionFiltersProps {
  /** Hàm callback khi người dùng nhấn Apply Filters - trả về object chứa các điều kiện lọc */
  onApply: (filters: TransactionFilters) => void;
  /** Hàm callback khi người dùng nhấn Reset Filters - xóa tất cả bộ lọc */
  onReset: () => void;
}

/** Component chính hiển thị form bộ lọc giao dịch kho */
export const TransactionFiltersComponent: React.FC<TransactionFiltersProps> = ({
  onApply,
  onReset,
}) => {
  // Các state lưu trữ giá trị bộ lọc
  const [lotId, setLotId] = useState<string>('');           // Mã lô hàng
  const [materialId, setMaterialId] = useState<string>(''); // Mã vật tư
  const [transactionType, setTransactionType] = useState<'All' | 'Receipt' | 'Usage'>('All'); // Loại giao dịch
  const [performedBy, setPerformedBy] = useState<string>(''); // Người thực hiện
  const [referenceNumber, setReferenceNumber] = useState<string>(''); // Số tham chiếu
  const [dateFrom, setDateFrom] = useState<string>('');     // Từ ngày
  const [dateTo, setDateTo] = useState<string>('');         // Đến ngày

  /** Hàm xử lý khi người dùng nhấn Apply Filters */
  const handleApply = () => {
    const filters: TransactionFilters = {};

    // Chỉ thêm vào filters nếu người dùng có nhập giá trị (không rỗng)
    if (lotId.trim()) filters.lot_id = lotId;
    if (materialId.trim()) filters.material_id = materialId;
    if (transactionType !== 'All') filters.transaction_type = transactionType;
    if (performedBy.trim()) filters.performed_by = performedBy;
    if (referenceNumber.trim()) filters.reference_number = referenceNumber;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    // Gọi callback gửi bộ lọc lên component cha
    onApply(filters);
  };

  /** Hàm xử lý khi người dùng nhấn Reset Filters - Xóa tất cả bộ lọc */
  const handleReset = () => {
    // Reset tất cả state về giá trị rỗng/mặc định
    setLotId('');
    setMaterialId('');
    setTransactionType('All');
    setPerformedBy('');
    setReferenceNumber('');
    setDateFrom('');
    setDateTo('');
    // Gọi callback thông báo component cha đã reset
    onReset();
  };

  return (
    // Container chính chứa form bộ lọc
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Bộ lọc giao dịch</h3>

      {/* Grid chứa các trường nhập liệu bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Trường nhập Lot ID - Mã lô hàng */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lot ID
          </label>
          <input
            type="text"
            value={lotId}
            onChange={(e) => setLotId(e.target.value)}
            placeholder="Enter lot ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Trường nhập Material ID - Mã vật tư */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material ID
          </label>
          <input
            type="text"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            placeholder="Enter material ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Trường chọn loại giao dịch (Receipt/Nhập hoặc Usage/Xuất) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transaction Type
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as 'All' | 'Receipt' | 'Usage')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Receipt">Receipt</option>
            <option value="Usage">Usage</option>
          </select>
        </div>

        {/* Trường nhập người thực hiện giao dịch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Performed By
          </label>
          <input
            type="text"
            value={performedBy}
            onChange={(e) => setPerformedBy(e.target.value)}
            placeholder="User ID or name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Trường nhập số tham chiếu (PO, Batch ID,...) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Number
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="PO #, Batch ID, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Trường chọn ngày bắt đầu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Trường chọn ngày kết thúc */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Các nút hành động: Apply Filters và Reset Filters */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={handleReset}
          className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
