// File: components/material/components/MaterialDetail.tsx
// Component hiển thị chi tiết vật tư
// Cho phép xem thông tin đầy đủ, chỉnh sửa và xóa vật tư
// Hỗ trợ 2 chế độ: truyền materialId để fetch từ API hoặc truyền trực tiếp object material

import React from "react";
import type { Material } from "../../../types/material";
import { useMaterialDetail } from "../../../hooks";

// Props cho component MaterialDetail
interface MaterialDetailProps {
  // ID vật tư (tùy chọn - nếu có thì fetch từ API qua hook useMaterialDetail)
  materialId?: string;
  // Hoặc truyền trực tiếp object material (ưu tiên dùng prop này nếu có)
  material?: Material;
  // Callback khi nhấn nút chỉnh sửa - truyền material đang xem để mở form edit
  onEdit?: (material: Material) => void;
  // Callback khi nhấn nút xóa - truyền ID vật tư cần xóa
  onDelete?: (materialId: string) => void;
  // Callback khi đóng xem chi tiết (nhấn nút Close hoặc X)
  onClose?: () => void;
}

// Component chính MaterialDetail - hiển thị thông tin chi tiết của một vật tư
export const MaterialDetail: React.FC<MaterialDetailProps> = ({
  materialId,
  material: propMaterial,
  onEdit,
  onDelete,
  onClose,
}) => {
  // Sử dụng hook useMaterialDetail để fetch dữ liệu từ API nếu có materialId
  // Nếu truyền material qua prop thì ưu tiên dùng propMaterial
  const {
    material: hookMaterial, // Dữ liệu vật tư lấy từ API (khi có materialId)
    loading,                  // Trạng thái đang tải dữ liệu từ API
    error,                    // Lỗi nếu có khi fetch dữ liệu
    refetch,                 // Hàm tải lại dữ liệu khi bị lỗi
  } = useMaterialDetail(materialId);
  
  // Ưu tiên dùng propMaterial (từ parent truyền xuống), nếu không có thì dùng hookMaterial
  const material = propMaterial || hookMaterial;

  // Trường hợp đang tải dữ liệu lần đầu (chưa có material và đang loading)
  if (!material && loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-400">
        <p>Loading material details...</p>
      </div>
    );
  }

  // Trường hợp có lỗi khi tải dữ liệu
  if (!material && error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-10 text-center">
        <div className="p-5">
          <h3 className="m-0 mb-2 text-red-600">Failed to load material</h3>
          <p className="m-0 mb-4">{error.message}</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded mr-1 hover:bg-blue-700"
            onClick={refetch}
          >
            Retry
          </button>
          {onClose && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // Trường hợp không có vật tư nào được chọn
  if (!material) {
    return (
      <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-400">
        <p>No material selected</p>
        {onClose && (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  // Hàm xử lý xóa vật tư - hiển thị confirm dialog trước khi xóa
  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${material.material_name}"?`,
      )
    ) {
      if (onDelete) {
        onDelete(material._id);
      }
    }
  };

  return (
    // Container chính hiển thị chi tiết vật tư
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* HEADER: Tiêu đề và nút đóng */}
      <div className="flex justify-between items-center px-5 py-6 border-b-2 border-gray-200 bg-gray-50">
        <h2 className="m-0 text-3xl text-gray-800 flex-1">
          {material.material_name}
        </h2>
        {/* Nút đóng xem chi tiết */}
        {onClose && (
          <button
            className="bg-none border-none text-2xl cursor-pointer text-gray-400 px-2 py-1 hover:text-gray-800 transition-colors"
            onClick={onClose}
            title="Close detail view"
          >
            ✕
          </button>
        )}
      </div>

      <div className="px-5 py-6">
        {/* PHẦN THÔNG TIN CƠ BẢN: Mã vật tư, Mã phần, Loại, Tên */}
        <section className="mb-6">
          <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
            Thông tin cơ bản
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mã vật tư - mã định danh duy nhất */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Mã vật tư
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1 rounded text-xs text-red-600 font-mono break-all w-fit">
                {material.material_id}
              </code>
            </div>
            {/* Mã phần - part number */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Mã phần
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1 rounded text-xs text-red-600 font-mono break-all w-fit">
                {material.part_number}
              </code>
            </div>
            {/* Loại vật tư - hiển thị dạng badge */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Loại vật tư
              </label>
              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium w-fit">
                {typeLabel || material.material_type}
              </span>
            </div>
            {/* Tên vật tư */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Tên vật tư
              </label>
              <p className="m-0 text-gray-800 text-base break-words">
                {material.material_name}
              </p>
            </div>
          </div>
        </section>

        {/* PHẦN CHI TIẾT TÙY CHỌN: Điều kiện bảo quản, Tài liệu thông số */}
        {(material.storage_conditions || material.specification_document) && (
          <section className="mb-6">
            <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
              Chi tiết tùy chọn
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Điều kiện bảo quản (nhiệt độ, độ ẩm,...) */}
              {material.storage_conditions && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                    Điều kiện bảo quản
                  </label>
                  <p className="m-0 text-gray-800 text-base break-words">
                    {material.storage_conditions}
                  </p>
                </div>
              )}
              {/* Tài liệu thông số kỹ thuật */}
              {material.specification_document && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                    Tài liệu thông số
                  </label>
                  <code className="inline-block bg-gray-100 px-2.5 py-1 rounded text-xs text-red-600 font-mono break-all w-fit">
                    {specDisplay || material.specification_document}
                  </code>
                </div>
              )}
            </div>
          </section>
        )}
              {material.specification_document && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                    Specification Document
                  </label>
                  <code className="inline-block bg-gray-100 px-2.5 py-1.5 rounded text-xs text-red-600 font-mono break-all w-fit">
                    {material.specification_document}
                  </code>
                </div>
              )}
            </div>
          </section>
        )}

        {/* PHẦN METADATA: Ngày tạo, Ngày sửa, ID */}
        <section className="mb-0">
          <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
            Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Ngày tạo vật tư */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Ngày tạo
              </label>
              <p className="m-0 text-gray-800 text-base">
                {formatDate(material.created_date)}
              </p>
            </div>
            {/* Ngày chỉnh sửa gần nhất */}
            {material.modified_date && (
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                  Ngày chỉnh sửa
                </label>
                <p className="m-0 text-gray-800 text-base">
                  {formatDate(((material as any).modified_date) ?? material.created_date)}
                </p>
              </div>
            )}
            {/* ID nội bộ trong database */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                ID
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1 rounded text-xs text-red-600 font-mono break-all w-fit">
                {material._id}
              </code>
            </div>
          </div>
        </section>

        {/* HÀNH ĐỘNG: Nút Chỉnh sửa và Xóa vật tư */}
        {(onEdit || onDelete) && (
          <div className="flex gap-2.5 px-5 py-5 border-t border-gray-100 bg-gray-50">
            {/* Nút mở form chỉnh sửa */}
            {onEdit && (
              <button
                onClick={() => onEdit(material)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                Chỉnh sửa vật tư
              </button>
            )}
            {/* Nút xóa vật tư - cần xác nhận từ handleDelete */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-5 py-2.5 bg-gray-100 text-red-600 rounded-lg font-bold text-sm border border-gray-300 hover:bg-red-50 transition-colors"
              >
                Xóa vật tư
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialDetail;
