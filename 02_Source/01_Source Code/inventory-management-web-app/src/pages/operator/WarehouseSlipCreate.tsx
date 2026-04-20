import React from "react";
import WarehouseSlipForm from "../../components/operator/warehouse-slip/WarehouseSlipForm";

export default function WarehouseSlipCreate() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Tạo phiếu nhập/xuất kho</h1>
      <WarehouseSlipForm />
    </div>
  );
}
