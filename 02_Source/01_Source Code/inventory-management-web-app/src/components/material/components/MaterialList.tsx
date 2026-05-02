// File: components/material/components/MaterialList.tsx
// Component hiển thị danh sách vật tư dưới dạng bảng có phân trang
// Sử dụng hook useMaterialList để lấy dữ liệu từ API
// Hỗ trợ chọn vật tư để xem chi tiết, highlight theo loại vật tư
// Hỗ trợ phân trang (next/previous) và thay đổi số lượng item/trang

import React, { useMemo } from "react";
import type { Material, MaterialType } from "../../../types/material";
import { useMaterialList } from "../../../hooks";

// Props cho component MaterialList
interface MaterialListProps {
  // Callback khi người dùng chọn một vật tư từ danh sách (để mở chi tiết)
  onSelectMaterial?: (material: Material) => void;
  // Loại vật tư cần làm nổi bật (highlight dòng tương ứng với màu vàng)
  highlightType?: MaterialType;
}

// Component chính MaterialList
export const MaterialList: React.FC<MaterialListProps> = ({
  onSelectMaterial,
  highlightType,
}) => {
  // Sử dụng hook useMaterialList để lấy dữ liệu và các hàm phân trang
  const {
    materials,      // Danh sách vật tư hiện tại trên trang
    total,          // Tổng số lượng vật tư trong database
    page,          // Trang hiện tại
    limit,         // Số lượng vật tư mỗi trang
    loading,       // Trạng thái đang tải dữ liệu
    error,         // Lỗi nếu có khi fetch dữ liệu
    hasNextPage,   // Có trang tiếp theo hay không
    hasPreviousPage, // Có trang trước đó hay không
    nextPage,      // Hàm chuyển sang trang tiếp theo
    previousPage,  // Hàm quay về trang trước đó
    setLimit,      // Hàm thay đổi số lượng item/trang
    refetch,       // Hàm tải lại dữ liệu
  } = useMaterialList();

  // Tính tổng số trang dựa trên total và limit
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  // Hiển thị lỗi khi tải dữ liệu (có nút thử lại)
  if (error) {
    return (
      <div className="w-full bg-white rounded-lg overflow-hidden shadow-md p-5">
        <div className="p-5 bg-red-50 border border-red-200 rounded text-red-600">
          <h3 className="m-0 mb-2.5">Tải vật tư thất bại</h3>
          <p className="m-0 mb-4 text-sm">{error.message}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded mr-1 hover:bg-red-700"
            onClick={refetch}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    // Container chính của danh sách vật tư
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      {/* HEADER: Tiêu đề và thông tin tổng số vật tư */}
      <div className="px-5 py-5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="m-0 text-2xl text-gray-800">Materials</h2>
        <div className="text-sm text-gray-600">
          Total: <strong>{total}</strong> | Showing{" "}
          {Math.min(limit, materials.length)} of {total}
        </div>
      </div>

      {/* NỘI DUNG CHÍNH: Hiển thị loading, empty state hoặc danh sách */}
      {loading && materials.length === 0 ? (
        // Đang tải dữ liệu lần đầu (chưa có dữ liệu cũ)
        <div className="p-10 text-center text-gray-400">
          <p>Loading materials...</p>
        </div>
      ) : materials.length === 0 ? (
        // Không có vật tư nào trong database
        <div className="p-10 text-center text-gray-400">
          <p>No materials found</p>
        </div>
      ) : (
        <>
          {/* BẢNG DANH SÁCH VẬT TƯ */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 font-bold text-left text-gray-800">
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Material ID
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Material Name
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Part Number
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Created Date
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
                  <tbody>
                {/* Map qua danh sách materials để hiển thị từng dòng */}
                {materials.map((material) => (
                  <tr
                    key={material._id}
                    // Highlight dòng nếu loại vật tư khớp với highlightType
                    className={`transition-colors hover:bg-gray-50 ${
                      highlightType && material.material_type === highlightType
                        ? "bg-yellow-100"
                        : ""
                    }`}
                  >
                    {/* Cột Mã vật tư */}
                    <td className="px-4 py-3 border-b border-gray-200">
                      <code className="bg-gray-100 px-1.5 py-1 rounded text-xs font-mono text-red-600">
                        {material.material_id}
                      </code>
                    </td>
                    {/* Cột Tên vật tư */}
                    <td className="px-4 py-3 border-b border-gray-200">
                      {material.material_name}
                    </td>
                    {/* Cột Mã phần */}
                    <td className="px-4 py-3 border-b border-gray-200">
                      {material.part_number}
                    </td>
                    {/* Cột Loại vật tư - hiển thị dạng badge */}
                    <td className="px-4 py-3 border-b border-gray-200">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                        {material.material_type}
                      </span>
                    </td>
                    {/* Cột Ngày tạo */}
                    <td className="px-4 py-3 border-b border-gray-200">
                      {new Date(material.created_date).toLocaleDateString()}
                    </td>
                    {/* Cột Hành động - Nút xem chi tiết */}
                    <td className="px-4 py-3 border-b border-gray-200">
                      {onSelectMaterial && (
                        <button
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium cursor-pointer transition-colors hover:bg-blue-700"
                          onClick={() => onSelectMaterial(material)}
                          title="Xem chi tiết"
                        >
                          Xem
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PHÂN TRANG: Chọn số lượng/trang và điều hướng trang */}
          <div className="px-5 py-5 border-t border-gray-200 flex justify-between items-center flex-wrap gap-5">
            {/* Chọn số lượng item mỗi trang */}
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="limit-select"
                className="text-sm text-gray-600 font-medium"
              >
                Số lượng/trang:
              </label>
              <select
                id="limit-select"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={loading}
                className="px-2.5 py-1.5 border border-gray-300 rounded text-sm cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Điều hướng trang: Trước / Trang hiện tại / Sau */}
            <div className="flex items-center gap-4">
              <button
                onClick={previousPage}
                disabled={!hasPreviousPage || loading}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Trước
              </button>
              <span className="text-sm text-gray-600">
                Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
              </span>
              <button
                onClick={nextPage}
                disabled={!hasNextPage || loading}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      )}

      {/* PHÂN PHÂN TRANG (khi không có dữ liệu) */}
      <div className="px-5 py-5 border-t border-gray-200 flex justify-between items-center flex-wrap gap-5">
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="limit-select"
            className="text-sm text-gray-600 font-medium"
          >
            Số lượng/trang:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={loading}
            className="px-2.5 py-1.5 border border-gray-300 rounded text-sm cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={previousPage}
            disabled={!hasPreviousPage || loading}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
          </span>
          <button
            onClick={nextPage}
            disabled={!hasNextPage || loading}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau →
          </button>
        </div>
      </div>
    </section>
  );
};

export default MaterialList;
