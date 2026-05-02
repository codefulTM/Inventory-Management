// File: components/material/components/MaterialForm.tsx
// Form tạo mới hoặc chỉnh sửa vật tư
// Sử dụng hook useMaterialForm để quản lý state, validation và submit form
// Hỗ trợ 2 chế độ: create (tạo mới) và edit (chỉnh sửa)

import React, { useEffect } from "react";
import type { Material, MaterialType } from "../../../types/material";
import { useMaterialForm } from "../../../hooks";

// Props cho component MaterialForm
interface MaterialFormProps {
  // Chế độ form: "create" (tạo mới vật tư) hoặc "edit" (chỉnh sửa vật tư hiện có)
  mode?: "create" | "edit";
  // Vật tư hiện tại cần chỉnh sửa (chỉ dùng khi mode = "edit")
  existingMaterial?: Material;
  // Callback khi tạo mới hoặc cập nhật thành công - trả về material đã lưu
  onSuccess?: (material: Material) => void;
  // Callback khi người dùng hủy form (nhấn Cancel hoặc Reset)
  onCancel?: () => void;
}

// Danh sách các loại vật tư có thể chọn trong form
const MATERIAL_TYPES: MaterialType[] = [
  "API",
  "Excipient",
  "Dietary Supplement",
  "Container",
  "Closure",
  "Process Chemical",
  "Testing Material",
];

// Component chính MaterialForm
export const MaterialForm: React.FC<MaterialFormProps> = ({
  mode = "create",
  existingMaterial,
  onSuccess,
  onCancel,
}) => {
  // Sử dụng hook useMaterialForm để quản lý toàn bộ logic form
  const {
    formData,        // Dữ liệu form (material_id, part_number, material_name, material_type, ...)
    errors,         // Object chứa lỗi validation cho từng field
    loading,        // Trạng thái đang gọi API (create/update)
    error,          // Lỗi từ API (nếu có)
    success,        // Trạng thái thành công sau khi submit
    setFieldValue,  // Hàm cập nhật giá trị cho một field trong form
    resetForm,     // Hàm reset toàn bộ form về trạng thái ban đầu
    submit,         // Hàm submit form tạo mới vật tư
    submitUpdate,  // Hàm submit form cập nhật vật tư
    clearSuccess,  // Hàm xóa thông báo thành công
  } = useMaterialForm(onSuccess);

  // Effect: Nạp dữ liệu vật tư vào form khi ở chế độ edit
  // Chỉ chạy khi mode = "edit" và có existingMaterial
  useEffect(() => {
    if (mode === "edit" && existingMaterial) {
      // Nạp từng field từ existingMaterial vào form
      setFieldValue("part_number", existingMaterial.part_number);
      setFieldValue("material_name", existingMaterial.material_name);
      setFieldValue(
        "material_type",
        existingMaterial.material_type as MaterialType,
      );
      // Nạp các field tùy chọn (có thể undefined)
      if (existingMaterial.storage_conditions) {
        setFieldValue(
          "storage_conditions",
          existingMaterial.storage_conditions,
        );
      }
      if (existingMaterial.specification_document) {
        setFieldValue(
          "specification_document",
          existingMaterial.specification_document,
        );
      }
    }
  }, [mode, existingMaterial, setFieldValue]);

  // Xử lý submit form (tạo mới hoặc cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn reload trang

    if (mode === "create") {
      // Chế độ tạo mới
      await submit();
    } else if (mode === "edit" && existingMaterial) {
      // Chế độ chỉnh sửa - cần truyền ID vật tư
      await submitUpdate(existingMaterial._id);
    }
  };

  // Xử lý hủy form: reset form và gọi callback onCancel
  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    // Container chính của form với nền trắng, bo góc và bóng đổ
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-7">
      {/* TIÊU ĐỀ FORM - thay đổi theo chế độ create/edit */}
      <h2 className="m-0 mb-5 text-2xl text-gray-800">
        {mode === "create" ? "Create New Material" : "Edit Material"}
      </h2>

      {/* HIỂN THỊ LỖI TỪ API */}
      {error && (
        <div className="px-4 py-3 rounded-lg mb-5 flex justify-between items-center bg-red-50 border border-red-200">
          <p className="m-0 text-red-600 text-sm">{error.message}</p>
        </div>
      )}

      {/* HIỂN THỊ THÔNG BÁO THÀNH CÔNG */}
      {success && (
        <div className="px-4 py-3 rounded-lg mb-5 flex justify-between items-center bg-green-50 border border-green-200">
          <p className="m-0 font-medium text-green-600 text-sm">
            ✓ Material {mode === "create" ? "created" : "updated"} successfully!
          </p>
          {/* Nút đóng thông báo thành công */}
          <button
            className="bg-none border-none text-xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center text-green-600 opacity-70 hover:opacity-100 transition-opacity"
            onClick={clearSuccess}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* FORM CHÍNH */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* TRƯỜNG MÃ VẬT TƯ - Read Only khi edit, tự động sinh khi tạo mới */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="material_id"
            className="font-bold text-gray-800 text-sm"
          >
            Mã vật tư
          </label>
          {mode === "edit" ? (
            // Chế độ edit: hiển thị mã hiện tại, không cho phép sửa
            <input
              id="material_id"
              type="text"
              value={formData.material_id}
              onChange={(e) => setFieldValue("material_id", e.target.value)}
              disabled={true}
              maxLength={20}
              className="px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
              placeholder="VD: MAT-001"
            />
          ) : (
            // Chế độ tạo mới: hiển thị thông báo mã sẽ tự động sinh
            <div className="px-3 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 italic">
              Tự động sinh bởi hệ thống (MAT-xxx)
            </div>
          )}
          {/* Hiển thị lỗi validation cho field này */}
          {errors.material_id && (
            <span className="text-xs text-red-600 font-medium">
              {errors.material_id}
            </span>
          )}
        </div>

        {/* TRƯỜNG MÃ PHẦN - bắt buộc */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="part_number"
            className="font-bold text-gray-800 text-sm"
          >
            Mã phần <span className="text-red-600 ml-0.5">*</span>
          </label>
          <input
            id="part_number"
            type="text"
            value={formData.part_number}
            onChange={(e) => setFieldValue("part_number", e.target.value)}
            maxLength={20}
            className={`px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all ${errors.part_number ? "border-red-600" : "border-gray-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"}`}
            placeholder="VD: PN-2024-001"
          />
          {/* Hiển thị lỗi validation */}
          {errors.part_number && (
            <span className="text-xs text-red-600 font-medium">
              {errors.part_number}
            </span>
          )}
          <span className="text-xs text-gray-600">Tối đa 20 ký tự</span>
        </div>

        {/* TRƯỜNG TÊN VẬT TƯ - bắt buộc */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="material_name"
            className="font-bold text-gray-800 text-sm"
          >
            Material Name <span className="text-red-600 ml-0.5">*</span>
          </label>
          <input
            id="material_name"
            type="text"
            value={formData.material_name}
            onChange={(e) => setFieldValue("material_name", e.target.value)}
            maxLength={100}
            className={`px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all ${errors.material_name ? "border-red-600" : "border-gray-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"}`}
            placeholder="e.g., Aspirin Powder"
          />
          {errors.material_name && (
            <span className="text-xs text-red-600 font-medium">
              {errors.material_name}
            </span>
          )}
          <span className="text-xs text-gray-600">Max 100 characters</span>
        </div>

        {/* TRƯỜNG LOẠI VẬT TƯ - bắt buộc, chọn từ dropdown */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="material_type"
            className="font-bold text-gray-800 text-sm"
          >
            Loại vật tư <span className="text-red-600">*</span>
          </label>
          <select
            id="material_type"
            value={formData.material_type}
            onChange={(e) =>
              setFieldValue("material_type", e.target.value as MaterialType)
            }
            className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Chọn loại vật tư --</option>
            {MATERIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {/* Hiển thị lỗi validation */}
          {errors.material_type && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.material_type}
            </span>
          )}
        </div>

        {/* TRƯỜNG ĐIỀU KIỆN BẢO QUẢN - tùy chọn */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="storage_conditions"
            className="font-bold text-gray-800 text-sm"
          >
            Điều kiện bảo quản
          </label>
          <input
            id="storage_conditions"
            type="text"
            value={formData.storage_conditions}
            onChange={(e) =>
              setFieldValue("storage_conditions", e.target.value)
            }
            maxLength={100}
            className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="VD: 2-8°C, Tránh ánh sáng"
          />
          {/* Hiển thị lỗi validation */}
          {errors.storage_conditions && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.storage_conditions}
            </span>
          )}
          <span className="text-xs text-gray-600">Tối đa 100 ký tự (tùy chọn)</span>
        </div>

        {/* TRƯỜNG TÀI LIỆU THÔNG SỐ - tùy chọn */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="specification_document"
            className="font-bold text-gray-800 text-sm"
          >
            Tài liệu thông số
          </label>
          <input
            id="specification_document"
            type="text"
            value={formData.specification_document}
            onChange={(e) =>
              setFieldValue("specification_document", e.target.value)
            }
            maxLength={50}
            className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="VD: SOP-2024-001"
          />
          {/* Hiển thị lỗi validation */}
          {errors.specification_document && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.specification_document}
            </span>
          )}
          <span className="text-xs text-gray-600">
            Tối đa 50 ký tự (tùy chọn)
          </span>
        </div>
      </div>

      {/* TRƯỜNG ĐIỀU KIỆN BẢO QUẢN - hiển thị lần 2 (có thể là duplicate) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="storage_conditions"
            className="font-bold text-gray-800 text-sm"
          >
            Storage Conditions
          </label>
          <input
            id="storage_conditions"
            type="text"
            value={formData.storage_conditions}
            onChange={(e) =>
              setFieldValue("storage_conditions", e.target.value)
            }
            maxLength={100}
            className={`px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all ${errors.storage_conditions ? "border-red-600" : "border-gray-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"}`}
            placeholder="e.g., 2-8°C, Protected from light"
          />
          {errors.storage_conditions && (
            <span className="text-xs text-red-600 font-medium">
              {errors.storage_conditions}
            </span>
          )}
          <span className="text-xs text-gray-600">
            Max 100 characters (optional)
          </span>
        </div>

        {/* TRƯỜNG TÀI LIỆU THÔNG SỐ - hiển thị lần 2 (có thể là duplicate) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="specification_document"
            className="font-bold text-gray-800 text-sm"
          >
            Specification Document
          </label>
          <input
            id="specification_document"
            type="text"
            value={formData.specification_document}
            onChange={(e) =>
              setFieldValue("specification_document", e.target.value)
            }
            maxLength={50}
            className={`px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all ${errors.specification_document ? "border-red-600" : "border-gray-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"}`}
            placeholder="e.g., SOP-2024-001"
          />
          {errors.specification_document && (
            <span className="text-xs text-red-600 font-medium">
              {errors.specification_document}
            </span>
          )}
          <span className="text-xs text-gray-600">
            Max 50 characters (optional)
          </span>
        </div>

        {/* CÁC NÚT HÀNH ĐỘNG: Submit và Cancel/Reset */}
        <div className="flex gap-3 mt-2.5">
          {/* Nút Submit - text thay đổi theo chế độ create/edit */}
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm cursor-pointer transition-all hover:bg-blue-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex-1"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : mode === "create"
                ? "Create Material"
                : "Update Material"}
          </button>
          {/* Nút Cancel (edit mode) hoặc Reset (create mode) */}
          <button
            type="button"
            className="px-5 py-2.5 bg-gray-100 text-gray-800 rounded-lg font-bold text-sm cursor-pointer transition-all hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed flex-1"
            onClick={handleCancel}
            disabled={loading}
          >
            {mode === "create" ? "Reset" : "Cancel"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialForm;
