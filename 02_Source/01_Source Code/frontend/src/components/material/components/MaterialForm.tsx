/**
 * MaterialForm Component
 * Form for creating and updating materials
 */

import React, { useEffect } from "react";
import type { Material, MaterialType } from "../../../types/Material";
import { useMaterialForm } from "../../../hooks";

interface MaterialFormProps {
  mode?: "create" | "edit";
  existingMaterial?: Material;
  onSuccess?: (material: Material) => void;
  onCancel?: () => void;
}

const MATERIAL_TYPES: MaterialType[] = [
  "API",
  "Excipient",
  "Dietary Supplement",
  "Container",
  "Closure",
  "Process Chemical",
  "Testing Material",
];

export const MaterialForm: React.FC<MaterialFormProps> = ({
  mode = "create",
  existingMaterial,
  onSuccess,
  onCancel,
}) => {
  const {
    formData,
    errors,
    loading,
    error,
    success,
    setFieldValue,
    resetForm,
    submit,
    submitUpdate,
    clearSuccess,
  } = useMaterialForm(onSuccess);

  // Load existing material data when in edit mode
  useEffect(() => {
    if (mode === "edit" && existingMaterial) {
      setFieldValue("part_number", existingMaterial.part_number);
      setFieldValue("material_name", existingMaterial.material_name);
      setFieldValue(
        "material_type",
        existingMaterial.material_type as MaterialType,
      );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      await submit();
    } else if (mode === "edit" && existingMaterial) {
      await submitUpdate(existingMaterial._id);
    }
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-7">
      <h2 className="m-0 mb-5 text-2xl text-gray-800">
        {mode === "create" ? "Create New Material" : "Edit Material"}
      </h2>

      {error && (
        <div className="px-4 py-3 rounded-lg mb-5 flex justify-between items-center bg-red-50 border border-red-200">
          <p className="m-0 text-red-600 text-sm">{error.message}</p>
        </div>
      )}

      {success && (
        <div className="px-4 py-3 rounded-lg mb-5 flex justify-between items-center bg-green-50 border border-green-200">
          <p className="m-0 font-medium text-green-600 text-sm">
            ✓ Material {mode === "create" ? "created" : "updated"} successfully!
          </p>
          <button
            className="bg-none border-none text-xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center text-green-600 opacity-70 hover:opacity-100 transition-opacity"
            onClick={clearSuccess}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Material ID - Read Only in Edit Mode */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="material_id"
            className="font-bold text-gray-800 text-sm"
          >
            Material ID <span className="text-red-600 ml-0.5">*</span>
          </label>
          <input
            id="material_id"
            type="text"
            value={formData.material_id}
            onChange={(e) => setFieldValue("material_id", e.target.value)}
            disabled={mode === "edit"}
            maxLength={20}
            className={`px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all ${errors.material_id ? "border-red-600" : "border-gray-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"} ${mode === "edit" ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
            placeholder="e.g., MAT-001"
          />
          {errors.material_id && (
            <span className="text-xs text-red-600 font-medium">
              {errors.material_id}
            </span>
          )}
          <span className="text-xs text-gray-600">Max 20 characters</span>
        </div>

        {/* Part Number */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="part_number"
            className="font-bold text-gray-800 text-sm"
          >
            Part Number <span className="text-red-600 ml-0.5">*</span>
          </label>
          <input
            id="part_number"
            type="text"
            value={formData.part_number}
            onChange={(e) => setFieldValue("part_number", e.target.value)}
            maxLength={20}
            className={`px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all ${errors.part_number ? "border-red-600" : "border-gray-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"}`}
            placeholder="e.g., PN-2024-001"
          />
          {errors.part_number && (
            <span className="text-xs text-red-600 font-medium">
              {errors.part_number}
            </span>
          )}
          <span className="text-xs text-gray-600">Max 20 characters</span>
        </div>

        {/* Material Name */}
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

        {/* Material Type */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="material_type"
            className="font-bold text-gray-800 text-sm"
          >
            Material Type <span className="text-red-600 ml-0.5">*</span>
          </label>
          <select
            id="material_type"
            value={formData.material_type}
            onChange={(e) =>
              setFieldValue("material_type", e.target.value as MaterialType)
            }
            className={`px-3 py-2.5 border rounded-lg text-sm font-inherit transition-all ${errors.material_type ? "border-red-600" : "border-gray-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"}`}
          >
            <option value="">-- Select a type --</option>
            {MATERIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.material_type && (
            <span className="text-xs text-red-600 font-medium">
              {errors.material_type}
            </span>
          )}
        </div>

        {/* Storage Conditions */}
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

        {/* Specification Document */}
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

        {/* Form Actions */}
        <div className="flex gap-3 mt-2.5">
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
