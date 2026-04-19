import React from "react";
import type { Warehouse } from "../../../types/warehouse";

interface Props {
  warehouse: Warehouse;
}

export const WarehouseDetail: React.FC<Props> = ({ warehouse }) => {
  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="text-lg mb-2">{warehouse.warehouse_name}</h3>
      <div className="text-sm text-gray-600 mb-2">
        Mã:{" "}
        <code className="bg-gray-100 px-2 rounded">
          {warehouse.warehouse_id}
        </code>
      </div>
      <div className="mb-2">{warehouse.description}</div>
      <div className="text-sm text-gray-500">
        Đang hoạt động: {warehouse.is_active ? "Có" : "Không"}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        Ngày tạo: {new Date(warehouse.created_date).toLocaleString()}
      </div>
    </div>
  );
};

export default WarehouseDetail;
