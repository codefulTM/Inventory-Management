import React, { useState } from "react";
import { WarehouseList } from "../../components/warehouse";
import { WarehouseForm } from "../../components/warehouse";
import { WarehouseDetail } from "../../components/warehouse";
import type { Warehouse } from "../../types/warehouse";
import { useWarehouseList } from "../../hooks/useWarehouseList";

export const WarehouseManagement: React.FC = () => {
  const [selected, setSelected] = useState<Warehouse | null>(null);
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
  } = useWarehouseList();

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <WarehouseList
            onSelect={(w) => setSelected(w)}
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

        <div className="col-span-4 space-y-4">
          <div>
            <h3 className="text-lg mb-2">Chi tiết / Chỉnh sửa</h3>
            {selected ? (
              <WarehouseDetail warehouse={selected} />
            ) : (
              <div className="p-4 bg-white rounded">
                Chọn một kho để xem chi tiết
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg mb-2">Tạo kho</h3>
            <WarehouseForm
              onSaved={(w) => {
                // Update list state without refetching
                upsertWarehouse(w);
                // show detail for newly created/updated warehouse
                setSelected(w);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseManagement;
