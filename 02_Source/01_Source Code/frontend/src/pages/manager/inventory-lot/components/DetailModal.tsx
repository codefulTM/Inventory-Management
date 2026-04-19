import {
  X,
  Edit,
  Package,
  Factory,
  MapPin,
  Calendar,
  FlaskConical,
} from "lucide-react";
import { type InventoryLot } from "../../../../services/inventory-lot.service";
import { getStatusColor, getStatusText } from "../utils";

interface DetailModalProps {
  isOpen: boolean;
  selectedLot: InventoryLot | null;
  onClose: () => void;
  onEdit?: (lot: InventoryLot) => void;
}

export function DetailModal({
  isOpen,
  selectedLot,
  onClose,
  onEdit,
}: DetailModalProps) {
  if (!isOpen || !selectedLot) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      style={{
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(0,0,0,0.25)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Chi tiết lô hàng</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto scrollbar-hide flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Section: Thông tin lô hàng */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <Package size={13} /> Thông tin lô hàng
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Mã lô
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 font-mono text-sm">
                    {selectedLot.lot_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Mã vật tư
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 font-mono text-sm">
                    {selectedLot.material_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Loại lô
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        selectedLot.is_sample
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {selectedLot.is_sample ? "Mẫu QC" : "Lô thông thường"}
                    </span>
                  </div>
                </div>
                {selectedLot.parent_lot_id && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Lô gốc
                    </p>
                    <p className="mt-1 font-medium text-gray-700 font-mono text-sm">
                      {selectedLot.parent_lot_id}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Nhà sản xuất & Nhà cung cấp */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <Factory size={13} /> Nhà sản xuất &amp; Nhà cung cấp
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Nhà sản xuất
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 text-sm">
                    {selectedLot.manufacturer_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Số lô NSX
                  </p>
                  <p className="mt-1 font-medium text-gray-700 font-mono text-sm">
                    {selectedLot.manufacturer_lot}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Nhà cung cấp
                  </p>
                  <p className="mt-1 font-medium text-gray-700 text-sm">
                    {selectedLot.supplier_name}
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Số lượng & Lưu trữ */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <MapPin size={13} /> Số lượng &amp; Lưu trữ
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Số lượng
                  </p>
                  <p className="mt-1 font-bold text-2xl text-gray-900">
                    {selectedLot.quantity}{" "}
                    <span className="text-base font-normal text-gray-500">
                      {selectedLot.unit_of_measure}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Vị trí lưu trữ
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 text-sm">
                    {selectedLot.storage_location}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Kho chứa
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 text-sm">
                    {selectedLot.warehouse_id ?? "-"}
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Thời hạn */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <Calendar size={13} /> Thời hạn
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Ngày nhận hàng
                  </p>
                  <p className="mt-1 font-medium text-gray-900 text-sm">
                    {new Date(selectedLot.received_date).toLocaleDateString(
                      "vi-VN",
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Hạn sử dụng
                  </p>
                  <p className="mt-1 font-medium text-gray-900 text-sm">
                    {new Date(selectedLot.expiration_date).toLocaleDateString(
                      "vi-VN",
                    )}
                  </p>
                </div>
                {selectedLot.in_use_expiration_date && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Hạn sau khi mở
                    </p>
                    <p className="mt-1 font-medium text-gray-900 text-sm">
                      {new Date(
                        selectedLot.in_use_expiration_date,
                      ).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Trạng thái & Ghi chú */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <FlaskConical size={13} /> Trạng thái &amp; Ghi chú
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex p-2 text-xs font-bold rounded-full ${getStatusColor(selectedLot.status)}`}
                    >
                      {getStatusText(selectedLot.status)}
                    </span>
                  </div>
                </div>
                {selectedLot.notes && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Ghi chú
                    </p>
                    <p className="mt-1 text-gray-700 text-sm bg-gray-50 rounded-lg p-3 leading-relaxed">
                      {selectedLot.notes}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Section: Audit */}
            {(selectedLot.created_date || selectedLot.modified_date) && (
              <>
                <hr className="border-gray-100" />
                <section>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                    <Calendar size={13} /> Nhật ký
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLot.created_date && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Ngày tạo
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {new Date(selectedLot.created_date).toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>
                    )}
                    {selectedLot.modified_date && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Cập nhật lần cuối
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {new Date(selectedLot.modified_date).toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition text-sm"
          >
            Đóng
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(selectedLot);
              }}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition text-sm"
            >
              <Edit size={16} /> Sửa thông tin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
