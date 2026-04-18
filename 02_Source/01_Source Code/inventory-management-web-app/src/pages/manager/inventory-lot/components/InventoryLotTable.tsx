import { Eye, Edit } from "lucide-react";
import { type InventoryLot } from "../../../../services/inventory-lot.service";
import { getStatusColor, getStatusText } from "../utils";

interface InventoryLotTableProps {
  lots: InventoryLot[];
  onViewDetail: (lot: InventoryLot) => void;
  onEdit?: (lot: InventoryLot) => void;
}

export function InventoryLotTable({
  lots,
  onViewDetail,
  onEdit,
}: InventoryLotTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Mã lô hàng
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Tên nhà sản xuất
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Số lượng
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Vị trí
              </th>
              <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">
                Trạng thái
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {lots.length > 0 ? (
              lots.map((inventoryLot) => (
                <tr
                  key={inventoryLot.lot_id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {inventoryLot.lot_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {inventoryLot.manufacturer_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {inventoryLot.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {inventoryLot.storage_location}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(inventoryLot.status)}`}
                    >
                      {getStatusText(inventoryLot.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewDetail(inventoryLot)}
                        className="text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(inventoryLot)}
                          className="text-green-500 hover:bg-green-50 rounded-lg transition"
                          title="Chỉnh sửa"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Không tìm thấy dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
