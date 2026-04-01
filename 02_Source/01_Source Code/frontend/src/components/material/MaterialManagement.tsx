/**
 * Material Management Page
 * Main page integrating all Material components (List, Search, Form, Detail)
 */

import React, { useState, useCallback } from "react";
import type { Material } from "../../types/Material";
import { MaterialList, MaterialSearch, MaterialForm, MaterialDetail } from ".";
import { materialService } from "../../services/material.service";

type ViewMode = "list" | "detail" | "form";
type FormMode = "create" | "edit";

interface FormState {
  visible: boolean;
  mode: FormMode;
  material?: Material;
}

interface DetailState {
  visible: boolean;
  material?: Material;
}

export const MaterialManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [formState, setFormState] = useState<FormState>({
    visible: false,
    mode: "create",
  });
  const [detailState, setDetailState] = useState<DetailState>({
    visible: false,
  });
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  // Open create form
  const handleOpenCreateForm = useCallback(() => {
    setFormState({
      visible: true,
      mode: "create",
    });
    setViewMode("form");
  }, []);

  // Open edit form
  const handleOpenEditForm = useCallback((material: Material) => {
    setFormState({
      visible: true,
      mode: "edit",
      material,
    });
    setViewMode("form");
  }, []);

  // Close form
  const handleCloseForm = useCallback(() => {
    setFormState({
      visible: false,
      mode: "create",
      material: undefined,
    });
    setViewMode("list");
  }, []);

  // Handle form success - refresh list and close form
  const handleFormSuccess = useCallback(() => {
    setListRefreshKey((prev) => prev + 1);
    handleCloseForm();
  }, [handleCloseForm]);

  // Open detail view
  const handleOpenDetail = useCallback((material: Material) => {
    setDetailState({
      visible: true,
      material,
    });
    setViewMode("detail");
  }, []);

  // Close detail view
  const handleCloseDetail = useCallback(() => {
    setDetailState({
      visible: false,
      material: undefined,
    });
    setViewMode("list");
  }, []);

  // Handle delete material
  const handleDeleteMaterial = useCallback(
    async (materialId: string) => {
      try {
        setDeleteLoading(true);
        setDeleteError(null);
        await materialService.delete(materialId);
        // Refresh list after delete
        setListRefreshKey((prev) => prev + 1);
        handleCloseDetail();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Delete failed");
        setDeleteError(err);
        console.error("[MaterialManagement] Delete failed:", err);
      } finally {
        setDeleteLoading(false);
      }
    },
    [handleCloseDetail],
  );

  // Handle material selection from search - open detail
  const handleSearchSelectMaterial = useCallback((materialId: string) => {
    // In a real app, you might fetch from a map or pass the whole material
    // For now, just close search and show message
    console.log("Material selected from search:", materialId);
    setViewMode("list");
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-linear-to-br from-blue-600 to-blue-700 text-white px-5 py-7 flex justify-between items-center flex-wrap gap-5 shadow-md">
        <div className="flex-1 min-w-0">
          <h1 className="m-0 mb-2 text-4xl font-bold">Material Management</h1>
          <p className="m-0 text-sm opacity-90">
            Manage materials, create new entries, search and filter by type
          </p>
        </div>
        <button
          className="px-6 py-3 bg-white text-blue-600 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          onClick={handleOpenCreateForm}
        >
          + New Material
        </button>
      </header>

      <div className="px-5 py-0 max-w-6xl mx-auto">
        {/* Search Section */}
        <section className="mb-7">
          <MaterialSearch onResultSelect={handleSearchSelectMaterial} />
        </section>

        {/* Main Content Area */}
        <div className="relative min-h-96">
          {/* List View */}
          {viewMode === "list" && (
            <div className="animate-fadeIn" key={listRefreshKey}>
              <MaterialList onSelectMaterial={handleOpenDetail} />
            </div>
          )}

          {/* Detail View */}
          {viewMode === "detail" &&
            detailState.visible &&
            detailState.material && (
              <div className="animate-slideInRight">
                <div className="relative max-w-3xl mx-auto">
                  <MaterialDetail
                    material={detailState.material}
                    onEdit={handleOpenEditForm}
                    onDelete={handleDeleteMaterial}
                    onClose={handleCloseDetail}
                  />
                  {deleteError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      <p>Failed to delete: {deleteError.message}</p>
                    </div>
                  )}
                  {deleteLoading && (
                    <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center text-gray-600 font-medium">
                      <p>Deleting...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Form Modal */}
          {formState.visible && (
            <div className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn">
              <div
                className="absolute inset-0 bg-black/50 cursor-pointer"
                onClick={handleCloseForm}
              />
              <div className="relative z-50 max-w-2xl w-11/12 max-h-[90vh] overflow-y-auto rounded-lg">
                <MaterialForm
                  mode={formState.mode}
                  existingMaterial={formState.material}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCloseForm}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialManagement;
