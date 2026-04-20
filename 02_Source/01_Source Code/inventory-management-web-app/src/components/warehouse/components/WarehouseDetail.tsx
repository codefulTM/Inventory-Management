import React from "react";
import type { Warehouse } from "../../../types/warehouse";

interface Props {
  warehouse: Warehouse;
}

export const WarehouseDetail: React.FC<Props> = ({ warehouse }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex justify-between items-center px-5 py-6 border-b-2 border-gray-200 bg-gray-50">
        <h2 className="m-0 text-2xl text-gray-800 flex-1">
          {warehouse.warehouse_name}
        </h2>
      </div>

      <div className="px-5 py-6">
        <section className="mb-6">
          <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
            Thông tin cơ bản
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Mã kho
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1.5 rounded text-xs text-red-600 font-mono break-all w-fit">
                {warehouse.warehouse_id}
              </code>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Trạng thái
              </label>
              <span
                className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${warehouse.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
              >
                {warehouse.is_active ? "Đang hoạt động" : "Không hoạt động"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Mô tả
              </label>
              <p className="m-0 text-gray-800 text-base break-words">
                {warehouse.description || "-"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-0">
          <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
            Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Ngày tạo
              </label>
              <p className="m-0 text-gray-800 text-base">
                {new Date(warehouse.created_date).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                ID
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1.5 rounded text-xs text-red-600 font-mono break-all w-fit">
                {warehouse._id}
              </code>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WarehouseDetail;
