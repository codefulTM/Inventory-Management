import { useState, useEffect } from "react";
import {
  InventoryLotAPI,
  type InventoryLot,
} from "../../../services/inventory-lot.service";
import { handleApiError, logApiError } from "../../../utils/error-handler";
import { getCurrentUser } from "../../../services/apiClient";
import {
  SearchAndFilters,
  InventoryLotTable,
  DetailModal,
  EditModal,
  AddModal,
  LoadingAndError,
} from "./components";
import { type EditFormValues } from "./utils/types";

export default function InventoryLot() {
  const currentUser = getCurrentUser();
  const isManager = currentUser?.role === "Manager";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInventoryLot, setSelectedInventoryLot] =
    useState<InventoryLot | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [inventoryLots, setInventoryLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchInventoryLots = async (query: string, pageToFetch: number = 1) => {
    setError(null);

    const {
      inventoryLots,
      total,
      page: responsePage,
      error: apiError,
    } = query === ""
      ? await InventoryLotAPI.getAll(pageToFetch, limit)
      : await InventoryLotAPI.search(query, pageToFetch, limit);

    if (apiError) {
      const errorMsg = "Không thể tải dữ liệu hàng hóa";
      setError(errorMsg);
      setLoading(false);
      handleApiError(apiError);
      logApiError(apiError, "fetch_inventory_lots");
      return;
    }

    setInventoryLots(inventoryLots);
    setTotal(total ?? 0);
    setPage(responsePage ?? pageToFetch);
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    fetchInventoryLots(searchTerm, 1);
  }, [searchTerm]);

  const handleViewDetail = (inventoryLot: InventoryLot) => {
    setSelectedInventoryLot(inventoryLot);
    setShowDetailModal(true);
  };

  const handleEditClick = (lot: InventoryLot) => {
    setSubmitError(null);
    setSelectedInventoryLot(lot);
    setShowEditModal(true);
  };

  const handleAddClick = () => {
    setSubmitError(null);
    setShowAddModal(true);
  };

  const handleEditSubmit = async (values: EditFormValues) => {
    setSubmitError(null);
    const updated: InventoryLot = {
      lot_id: values.lot_id,
      material_id: values.material_id,
      manufacturer_name: values.manufacturer_name,
      manufacturer_lot: values.manufacturer_lot,
      supplier_name: values.supplier_name,
      ...(values.manufacture_date ? { manufacture_date: values.manufacture_date } : {}),
      received_date: values.received_date,
      expiration_date: values.expiration_date,
      ...(values.in_use_expiration_date
        ? { in_use_expiration_date: values.in_use_expiration_date }
        : {}),
      status: values.status,
      quantity: values.quantity,
      unit_of_measure: values.unit_of_measure,
      storage_location: values.storage_location,
      is_sample: values.is_sample,
      parent_lot_id: values.parent_lot_id,
      notes: values.notes,
    };
    const { error: apiErr } = await InventoryLotAPI.update(
      updated.lot_id,
      updated,
    );
    if (apiErr) {
      setSubmitError("Lưu thất bại. Vui lòng thử lại.");
      return;
    }
    setInventoryLots((prev) =>
      prev.map((lot) => (lot.lot_id === updated.lot_id ? updated : lot)),
    );
    setShowEditModal(false);
  };

  const handleAddSubmit = async (values: EditFormValues) => {
    setSubmitError(null);
    const newLot: InventoryLot = {
      lot_id: values.lot_id,
      material_id: values.material_id,
      manufacturer_name: values.manufacturer_name,
      manufacturer_lot: values.manufacturer_lot,
      supplier_name: values.supplier_name,
      ...(values.manufacture_date ? { manufacture_date: values.manufacture_date } : {}),
      received_date: values.received_date,
      expiration_date: values.expiration_date,
      ...(values.in_use_expiration_date
        ? { in_use_expiration_date: values.in_use_expiration_date }
        : {}),
      status: values.status,
      quantity: values.quantity,
      unit_of_measure: values.unit_of_measure,
      storage_location: values.storage_location,
      is_sample: values.is_sample,
      parent_lot_id: values.parent_lot_id,
      notes: values.notes,
    };
    const { error: apiErr } = await InventoryLotAPI.create(newLot);
    if (apiErr) {
      setSubmitError("Thêm mới thất bại. Vui lòng thử lại.");
      return;
    }
    setInventoryLots((prev) => [newLot, ...prev]);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Loading & Error States */}
      <LoadingAndError
        isLoading={loading}
        error={error}
        onRetry={() => fetchInventoryLots(searchTerm, page)}
      />

      {/* Search and Filters */}
      {!loading && (
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAdd={handleAddClick}
        />
      )}

      {/* Inventory Lots Table */}
      <InventoryLotTable
        lots={inventoryLots}
        onViewDetail={handleViewDetail}
        onEdit={isManager ? handleEditClick : undefined}
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 bg-white p-4 rounded-xl border border-gray-100">
        <span className="text-sm text-gray-600">
          Hiển thị {inventoryLots.length} / {total} bản ghi
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (page > 1) {
                const nextPage = page - 1;
                setPage(nextPage);
                fetchInventoryLots(searchTerm, nextPage);
              }
            }}
            disabled={page <= 1 || loading}
            className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <span className="text-sm text-gray-700">
            Trang {page} / {Math.max(1, Math.ceil(total / limit))}
          </span>
          <button
            onClick={() => {
              const maxPage = Math.max(1, Math.ceil(total / limit));
              if (page < maxPage) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchInventoryLots(searchTerm, nextPage);
              }
            }}
            disabled={page >= Math.max(1, Math.ceil(total / limit)) || loading}
            className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>

      {/* Modals */}
      <DetailModal
        isOpen={showDetailModal}
        selectedLot={selectedInventoryLot}
        onClose={() => setShowDetailModal(false)}
        onEdit={isManager ? handleEditClick : undefined}
      />

      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSubmit}
        submitError={submitError}
      />

      <EditModal
        isOpen={showEditModal}
        selectedLot={selectedInventoryLot}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        submitError={submitError}
      />
    </div>
  );
}
