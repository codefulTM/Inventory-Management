/**
 * WarehouseSlipList Page (Operator)
 * Trang danh sách các phiếu nhập/xuất kho
 * 
 * Chức năng chính:
 * - Hiển thị danh sách tất cả phiếu kho (Warehouse Slips)
 * - Lọc phiếu theo trạng thái: PENDING, APPROVED, REJECTED
 * - Tìm kiếm phiếu theo mã phiếu hoặc nhà cung cấp/khách hàng
 * - Nút tạo phiếu mới chuyển hướng đến form tạo phiếu
 * - Click vào phiếu để xem chi tiết hoặc thực hiện hành động (xác nhận/từ chối/in)
 * 
 * Bảng hiển thị: mã phiếu, loại phiếu, ngày tạo, trạng thái, người tạo
 */
import React from "react";
import { Link } from "react-router-dom";
import WarehouseSlipTable from "../../components/operator/warehouse-slip/WarehouseSlipTable";

export default function WarehouseSlipList() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Danh Sách Phiếu Kho</h1>
          <p className="text-sm text-gray-500 mt-1">
            Xem, in và quản lý phiếu nhập/xuất kho.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/operator/warehouse-slips/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
          >
            Tạo Phiếu Mới
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <WarehouseSlipTable />
      </div>
    </div>
  );
}
