// File: components/operator/warehouse-slip/WarehouseSlipTable.tsx
// Component hiển thị danh sách phiếu nhập/xuất kho (Warehouse Slip)
// Hiển thị dạng bảng: mã phiếu, loại, kho, trạng thái, ngày tạo
// Hỗ trợ xem chi tiết, xem trước (preview) và in phiếu

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Printer } from "lucide-react";
import { fetchWarehouseSlips } from "../../../services/warehouseSlipService";
import type { WarehouseSlip } from "../../../types/warehouseSlip";

export default function WarehouseSlipTable() {
  const [items, setItems] = useState<WarehouseSlip[]>([]);

  useEffect(() => {
    fetchWarehouseSlips().then((r) => setItems(r.items ?? r));
  }, []);

  // choose link base depending on current route (manager vs operator)
  const base =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/manager")
      ? "/manager"
      : "/operator";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Phiếu
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Loại
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Kho
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Ngày tạo
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {items.map((i) => (
            <tr key={i.slip_id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                {i.slip_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{i.type}</td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {i.warehouse_id}
              </td>
              <td className="px-4 py-3 text-sm">
                {
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                      i.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {i.status}
                  </span>
                }
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(i.created_date || Date.now()).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-sm">
                <div className="inline-flex items-center gap-2">
                  <Link
                    to={`${base}/warehouse-slips/${i.slip_id}`}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-gray-100 text-sm hover:bg-gray-50"
                    title="Xem chi tiết"
                  >
                    <Eye size={16} />
                    <span>View</span>
                  </Link>
                  <Link
                    to={`${base}/in-out/${i.slip_id}/print`}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-gray-100 text-sm hover:bg-gray-50"
                    title="Xem trước (Print preview)"
                  >
                    <Printer size={16} />
                    <span>Preview</span>
                  </Link>
                  <a
                    href={`/api/warehouse/slips/${i.slip_id}/print`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                    title="Mở giao diện in"
                  >
                    <Printer size={16} />
                    <span>Print</span>
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
