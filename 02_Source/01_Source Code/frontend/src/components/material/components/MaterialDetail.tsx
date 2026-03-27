/**
 * MaterialDetail Component
 * Display single material detail view
 */

import React from "react";
import type { Material } from "../../../types/Material";
import { useMaterialDetail } from "../../../hooks";

interface MaterialDetailProps {
  materialId?: string;
  material?: Material;
  onEdit?: (material: Material) => void;
  onDelete?: (materialId: string) => void;
  onClose?: () => void;
}

export const MaterialDetail: React.FC<MaterialDetailProps> = ({
  materialId,
  material: propMaterial,
  onEdit,
  onDelete,
  onClose,
}) => {
  // Use hook if materialId provided, otherwise use prop
  const {
    material: hookMaterial,
    loading,
    error,
    refetch,
  } = useMaterialDetail(materialId);
  const material = propMaterial || hookMaterial;

  if (!material && loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-400">
        <p>Loading material details...</p>
      </div>
    );
  }

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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex justify-between items-center px-5 py-6 border-b-2 border-gray-200 bg-gray-50">
        <h2 className="m-0 text-3xl text-gray-800 flex-1">
          {material.material_name}
        </h2>
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
        {/* Basic Information Section */}
        <section className="mb-6">
          <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Material ID
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1.5 rounded text-xs text-red-600 font-mono break-all w-fit">
                {material.material_id}
              </code>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Part Number
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1.5 rounded text-xs text-red-600 font-mono break-all w-fit">
                {material.part_number}
              </code>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Material Type
              </label>
              <span className="inline-block px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium w-fit">
                {material.material_type}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Material Name
              </label>
              <p className="m-0 text-gray-800 text-base break-words">
                {material.material_name}
              </p>
            </div>
          </div>
        </section>

        {/* Optional Details Section */}
        {(material.storage_conditions || material.specification_document) && (
          <section className="mb-6">
            <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
              Additional Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {material.storage_conditions && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                    Storage Conditions
                  </label>
                  <p className="m-0 text-gray-800 text-base break-words">
                    {material.storage_conditions}
                  </p>
                </div>
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

        {/* Timestamp Section */}
        <section className="mb-0">
          <h3 className="m-0 mb-4 text-lg text-gray-800 border-b-2 border-gray-200 pb-2">
            Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                Created
              </label>
              <p className="m-0 text-gray-800 text-base">
                {new Date(material.created_date).toLocaleString()}
              </p>
            </div>
            {material.modified_date && (
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                  Last Modified
                </label>
                <p className="m-0 text-gray-800 text-base">
                  {new Date(material.modified_date).toLocaleString()}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-gray-600 text-sm uppercase tracking-wide">
                ID
              </label>
              <code className="inline-block bg-gray-100 px-2.5 py-1.5 rounded text-xs text-red-600 font-mono break-all w-fit">
                {material._id}
              </code>
            </div>
          </div>
        </section>
      </div>

      {/* Action Buttons */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2.5 px-5 py-5 border-t border-gray-200 bg-gray-50">
          {onEdit && (
            <button
              className="px-5 py-2.5 bg-blue-600 text-white rounded flex-1 font-bold transition-all hover:bg-blue-700 hover:shadow-md"
              onClick={() => onEdit(material)}
            >
              Edit Material
            </button>
          )}
          {onDelete && (
            <button
              className="px-5 py-2.5 bg-gray-100 text-red-600 border border-gray-300 rounded flex-1 font-bold transition-all hover:bg-red-50"
              onClick={handleDelete}
            >
              Delete Material
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MaterialDetail;
