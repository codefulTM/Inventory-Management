import React from "react";
import { Link } from "react-router-dom";
import WarehouseSlipTable from "../../components/operator/warehouse-slip/WarehouseSlipTable";

export default function WarehouseSlipList() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Danh sách phiếu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Xem, in và quản lý phiếu kho.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/operator/warehouse-slips/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
          >
            Tạo phiếu
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <WarehouseSlipTable />
      </div>
    </div>
  );
}
