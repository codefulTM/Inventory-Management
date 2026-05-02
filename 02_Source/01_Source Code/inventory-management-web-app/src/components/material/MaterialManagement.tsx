// File: components/material/MaterialManagement.tsx
// Trang quản lý vật tư chính - tích hợp các component: List, Search, Form, Detail
// Cho phép tạo mới, chỉnh sửa, xem chi tiết và xóa vật tư

import React, { useState, useCallback } from "react";
import type { Material } from "../../types/material";
import { MaterialList, MaterialSearch, MaterialForm, MaterialDetail } from ".";
import { materialService } from "../../services/material.service";

// Định nghĩa các chế độ xem: danh sách, chi tiết, form
type ViewMode = "list" | "detail" | "form";
// Chế độ form: tạo mới hoặc chỉnh sửa
type FormMode = "create" | "edit";

// State cho form
interface FormState {
  visible: boolean;
  mode: FormMode;
  material?: Material;
}

// State cho chi tiết
interface DetailState {
  visible: boolean;
  material?: Material;
}

export const MaterialManagement: React.FC = () => {
  // State chế độ hiển thị: list, detail, hoặc form
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  // State form: hiển thị/ẩn, chế độ tạo/sửa, vật tư đang sửa
  const [formState, setFormState] = useState<FormState>({
    visible: false,
    mode: "create",
  });
  // State chi tiết: hiển thị/ẩn, vật tư đang xem
  const [detailState, setDetailState] = useState<DetailState>({
    visible: false,
  });
  // Key để trigger tải lại danh sách
  const [listRefreshKey, setListRefreshKey] = useState(0);
  // State đang xóa vật tư
  const [deleteLoading, setDeleteLoading] = useState(false);
  // State lỗi khi xóa
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  // Mở form tạo mới vật tư
  const handleOpenCreateForm = useCallback(() => {
    setFormState({
      visible: true,
      mode: "create",
    });
    setViewMode("form");
  }, []);

  // Mở form chỉnh sửa vật tư
  const handleOpenEditForm = useCallback((material: Material) => {
    setFormState({
      visible: true,
      mode: "edit",
      material,
    });
    setViewMode("form");
  }, []);

  // Đóng form và reset state
  const handleCloseForm = useCallback(() => {
    setFormState({
      visible: false,
      mode: "create",
      material: undefined,
    });
    setViewMode("list");
  }, []);

  // Xử lý khi form submit thành công - tải lại danh sách
  const handleFormSuccess = useCallback(() => {
    setListRefreshKey((prev) => prev + 1);
    handleCloseForm();
  }, [handleCloseForm]);

  // Mở xem chi tiết vật tư
  const handleOpenDetail = useCallback((material: Material) => {
    setDetailState({
      visible: true,
      material,
    });
    setViewMode("detail");
  }, []);

  // Đóng xem chi tiết
  const handleCloseDetail = useCallback(() => {
    setDetailState({
      visible: false,
      material: undefined,
    });
    setViewMode("list");
  }, []);

  // Xử lý xóa vật tư
  const handleDeleteMaterial = useCallback(
    async (materialId: string) => {
      try {
        setDeleteLoading(true);
        setDeleteError(null);
        await materialService.delete(materialId);
        // Tải lại danh sách sau khi xóa
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

  // Xử lý khi chọn vật tư từ kết quả tìm kiếm
  const handleSearchSelectMaterial = useCallback((materialId: string) => {
    // Trong thực tế, cần lấy thông tin vật tư từ map hoặc fetch
    console.log("Material selected from search:", materialId);
    setViewMode("list");
  }, []);

  return (
    // Container chính với nền xám
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      {/* HEADER: Tiêu đề và mô tả trang quản lý vật tư */}
      <header className="rounded-lg bg-linear-to-br from-blue-600 to-blue-700 px-5 py-6 text-white shadow-md">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">
          Quản lý vật tư
        </p>
        <h1 className="mt-2 text-3xl font-black">Quản lý vật tư</h1>
        <p className="mt-2 text-sm text-blue-100">Quản lý vật tư, tạo mới, tìm kiếm và lọc theo loại</p>
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
