import React, { useState } from "react";
import { WarehouseList } from "../../components/warehouse";
import { WarehouseForm } from "../../components/warehouse";
import { WarehouseDetail } from "../../components/warehouse";
import type { Warehouse } from "../../types/warehouse";
import { useWarehouseList } from "../../hooks/useWarehouseList";
import warehouseService from "../../services/warehouseService";
import Toast from "../../components/Toast";

export const WarehouseManagement: React.FC = () => {
  const [modalWarehouse, setModalWarehouse] = useState<Warehouse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const {
    warehouses,
    total,
    page,
    limit,
    loading,
    error,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    setLimit,
    refetch,
    upsertWarehouse,
    removeWarehouse,
  } = useWarehouseList();

  const handleView = (w: Warehouse) => {
    setModalWarehouse(w);
    setShowDetailModal(true);
  };

  const handleEdit = (w: Warehouse) => {
    setModalWarehouse(w);
    setFormMode("edit");
    setShowFormModal(true);
  };

  const handleCreate = () => {
    setModalWarehouse(null);
    setFormMode("create");
    setShowFormModal(true);
  };

  const handleDelete = async (w: Warehouse) => {
    // simple confirmation
    if (!window.confirm(`Bạn có chắc muốn xóa kho "${w.warehouse_name}"?`))
      return;
    try {
      await warehouseService.removeWarehouse(w._id);
      removeWarehouse(w._id);
      setToast({ message: "Xóa kho thành công", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Xóa kho thất bại";
      setToast({ message, type: "error" });
    }
  };

  const handleFormSaved = (w: Warehouse) => {
    upsertWarehouse(w);
    setModalWarehouse(w);
    setShowFormModal(false);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-linear-to-br from-blue-600 to-blue-700 text-white px-5 py-7 flex justify-between items-center flex-wrap gap-5 shadow-md">
        <div className="flex-1 min-w-0">
          <h1 className="m-0 mb-2 text-4xl font-bold">Quản lý kho</h1>
          <p className="m-0 text-sm opacity-90">
            Quản lý cấu hình và thông tin các kho
          </p>
        </div>
      </header>

      <div className="px-5 py-6 max-w-6xl mx-auto">
        <section className="mb-6">
          {/* Search area - UI only (not wired to hook) */}
          {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
        </section>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <div className="mb-4 flex items-center justify-between">
              <div />
              <button
                type="button"
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
              >
                Tạo kho
              </button>
            </div>

            <WarehouseList
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              warehouses={warehouses}
              total={total}
              page={page}
              limit={limit}
              loading={loading}
              error={error}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              nextPage={nextPage}
              previousPage={previousPage}
              setLimit={setLimit}
              refetch={refetch}
            />
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && modalWarehouse && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-gray-800">
                  Chi tiết kho
                </h2>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <WarehouseDetail warehouse={modalWarehouse} />
              </div>
            </div>
          </div>
        )}

        {/* Form Modal (Create / Edit) */}
        {showFormModal && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
            onClick={() => setShowFormModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-gray-800">
                  {formMode === "create" ? "Tạo kho" : "Chỉnh sửa kho"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <WarehouseForm
                  warehouseId={
                    formMode === "edit" ? modalWarehouse?._id : undefined
                  }
                  onSaved={(w) => handleFormSaved(w)}
                />
              </div>
            </div>
          </div>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default WarehouseManagement;
