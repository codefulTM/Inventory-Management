import React, { useEffect, useState } from "react";
import { fetchWarehouseSlips } from "../../../services/warehouseSlipService";
import type { WarehouseSlip } from "../../../types/warehouseSlip";

export default function WarehouseSlipTable() {
  const [items, setItems] = useState<WarehouseSlip[]>([]);

  useEffect(() => {
    fetchWarehouseSlips().then((r) => setItems(r.items ?? r));
  }, []);

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th>Slip</th>
          <th>Type</th>
          <th>Warehouse</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={i.slip_id}>
            <td>{i.slip_number}</td>
            <td>{i.type}</td>
            <td>{i.warehouse_id}</td>
            <td>{i.status}</td>
            <td>{i.created_date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
