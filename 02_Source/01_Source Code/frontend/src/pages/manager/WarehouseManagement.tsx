import React, { useState } from "react";
import { WarehouseList } from "../../components/warehouse";
import { WarehouseForm } from "../../components/warehouse";
import { WarehouseDetail } from "../../components/warehouse";
import type { Warehouse } from "../../types/warehouse";

export const WarehouseManagement: React.FC = () => {
  const [selected, setSelected] = useState<Warehouse | null>(null);

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <WarehouseList onSelect={(w) => setSelected(w)} />
        </div>

        <div className="col-span-4 space-y-4">
          <div>
            <h3 className="text-lg mb-2">Details / Edit</h3>
            {selected ? (
              <WarehouseDetail warehouse={selected} />
            ) : (
              <div className="p-4 bg-white rounded">
                Select a warehouse to view details
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg mb-2">Create Warehouse</h3>
            <WarehouseForm
              onSaved={() => {
                /* optional: refetch list via event or hook */
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseManagement;
