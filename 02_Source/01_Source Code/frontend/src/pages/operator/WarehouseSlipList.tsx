import React from "react";
import WarehouseSlipTable from "../../components/operator/warehouse-slip/WarehouseSlipTable";

export default function WarehouseSlipList() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Danh sách phiếu</h1>
      <WarehouseSlipTable />
    </div>
  );
}
