import React, { useState, useEffect } from "react";
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from "../../../types/warehouse";
import warehouseService from "../../../services/warehouseService";

interface Props {
  warehouseId?: string;
  onSaved?: (w: Warehouse) => void;
}

export const WarehouseForm: React.FC<Props> = ({ warehouseId, onSaved }) => {
  const [warehouseIdInput, setWarehouseIdInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (warehouseId) {
      setLoading(true);
      warehouseService
        .fetchWarehouse(warehouseId)
        .then((w) => {
          if (!mounted) return;
          setWarehouseIdInput(w.warehouse_id);
          setName(w.warehouse_name);
          setDescription(w.description || "");
          setIsActive(Boolean(w.is_active));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
    return () => {
      mounted = false;
    };
  }, [warehouseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: CreateWarehouseRequest | UpdateWarehouseRequest = {
        warehouse_id: warehouseIdInput,
        warehouse_name: name,
        description,
        is_active: isActive,
      };
      const result = warehouseId
        ? await warehouseService.updateWarehouse(warehouseId, payload)
        : await warehouseService.createWarehouse(
            payload as CreateWarehouseRequest,
          );
      if (onSaved) onSaved(result);
    } catch (err) {
      // Minimal error handling — real app should show toast
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded shadow p-5">
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Warehouse ID</label>
        <input
          value={warehouseIdInput}
          onChange={(e) => setWarehouseIdInput(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          rows={4}
        />
      </div>

      <div className="mb-3 flex items-center gap-3">
        <label className="text-sm">Active</label>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {warehouseId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
};

export default WarehouseForm;
