import { useState, useEffect } from "react";
import {
  InventoryLotAPI,
  type InventoryLot,
} from "../../../services/inventory-lot.service";
import { handleApiError, logApiError } from "../../../utils/error-handler";
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

  // Fetch data on component mount
  useEffect(() => {
    const fetchInventoryLots = async (searchTerm: string) => {
      setLoading(true);
      setError(null);

      const { inventoryLots, error: apiError } =
        searchTerm === ""
          ? await InventoryLotAPI.getAll()
          : await InventoryLotAPI.search(searchTerm);

      if (apiError) {
        const errorMsg = "Không thể tải dữ liệu hàng hóa";
        setError(errorMsg);
        handleApiError(apiError);
        logApiError(apiError, "fetch_inventory_lots");
        return;
      }

      setInventoryLots(inventoryLots);
      setLoading(false);
    };

    fetchInventoryLots(searchTerm);
  }, [searchTerm]);

  const fetchInventoryLots = async () => {
    setLoading(true);
    setError(null);

    const { inventoryLots, error: apiError } = await InventoryLotAPI.getAll();

    if (apiError) {
      const errorMsg = "Không thể tải dữ liệu hàng hóa";
      setError(errorMsg);
      handleApiError(apiError);
      logApiError(apiError, "fetch_inventory_lots");
      return;
    }

    setInventoryLots(inventoryLots);
    setLoading(false);
  };

  const filteredInventoryLots = inventoryLots.filter(
    (inventoryLot) =>
      inventoryLot.lot_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inventoryLot.manufacturer_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

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
        onRetry={fetchInventoryLots}
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
        lots={filteredInventoryLots}
        onViewDetail={handleViewDetail}
        onEdit={handleEditClick}
      />

      {/* Modals */}
      <DetailModal
        isOpen={showDetailModal}
        selectedLot={selectedInventoryLot}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEditClick}
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
