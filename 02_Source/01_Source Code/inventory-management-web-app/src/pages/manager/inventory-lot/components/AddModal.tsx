import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import {
  X,
  Save,
  AlertCircle,
  Loader,
  Package,
  Factory,
  MapPin,
  Calendar,
  FlaskConical,
} from "lucide-react";
import { type EditFormValues, INPUT_CLS, INPUT_ERR_CLS } from "../utils";
import { FormField } from "./FormField";
import { useMaterials } from "../hooks/useMaterials";
import SelectMenu from "../../../../components/SelectMenu";
import { useWarehouseList } from "../../../../hooks/useWarehouseList";
import { useBinWorklist } from "../hooks/useBinWorklist";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: EditFormValues) => Promise<void>;
  submitError?: string | null;
}

export function AddModal({
  isOpen,
  onClose,
  onSubmit,
  submitError,
}: AddModalProps) {
  const {
    materials,
    loading: materialsLoading,
    error: materialsError,
  } = useMaterials();
  const {
    register,
    handleSubmit: checkOnSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    defaultValues: {
      lot_id: "",
      material_id: "",
      manufacturer_name: "",
      manufacturer_lot: "",
      supplier_name: "",
      manufacture_date: "",
      received_date: new Date().toISOString().split("T")[0],
      expiration_date: "",
      in_use_expiration_date: "",
      quantity: 0,
      unit_of_measure: "",
      storage_location: "",
      warehouse_id: "",
      status: "Accepted",
      is_sample: false,
      parent_lot_id: "",
      notes: "",
    },
  });

  const {
    warehouses,
    loading: warehousesLoading,
    error: warehousesError,
  } = useWarehouseList();

  const warehouseId = watch("warehouse_id");
  const {
    bins,
    loading: binsLoading,
    error: binsError,
  } = useBinWorklist(warehouseId || undefined);

  const prevWarehouseRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevWarehouseRef.current && prevWarehouseRef.current !== warehouseId) {
      setValue("storage_location", "");
    }
    prevWarehouseRef.current = warehouseId;
  }, [warehouseId]);

  if (!isOpen) return null;

  const handleFormSubmit = async (values: EditFormValues) => {
    await onSubmit(values);
    reset();
  };

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
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            Thêm mới lô hàng
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          onSubmit={checkOnSubmit(handleFormSubmit)}
          className="overflow-y-auto scrollbar-hide flex-1"
        >
          <div className="px-6 py-5 space-y-5">
            {/* Section: Thông tin lô hàng */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <Package size={13} /> Thông tin lô hàng
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Mã lô" error={errors.lot_id?.message}>
                  <div className="px-3 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 italic">
                    Tự động sinh bởi hệ thống (LOT-xxx)
                  </div>
                </FormField>
                <FormField
                  label="Mã vật tư *"
                  error={errors.material_id?.message}
                >
                  {materialsLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader
                        size={16}
                        className="animate-spin text-gray-400"
                      />
                      <span className="text-sm text-gray-500 ml-2">
                        Đang tải...
                      </span>
                    </div>
                  ) : materialsError ? (
                    <div className="flex items-center gap-2 p-2 bg-red-50 text-red-600 rounded text-sm">
                      <AlertCircle size={14} />
                      Lỗi: {materialsError}
                    </div>
                  ) : (
                    <select
                      {...register("material_id", {
                        required: "Bắt buộc chọn",
                      })}
                      className={errors.material_id ? INPUT_ERR_CLS : INPUT_CLS}
                    >
                      <option value="">-- Chọn vật tư --</option>
                      {materials.map((material) => (
                        <option key={material._id} value={material.material_id}>
                          {material.material_id} - {material.material_name}
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>
                <FormField label="Là mẫu QC">
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...register("is_sample")}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <span className="text-sm text-gray-600">
                      Đây là mẫu QC / mẫu kiểm nghiệm
                    </span>
                  </label>
                </FormField>
                <FormField label="Lô gốc" error={errors.parent_lot_id?.message}>
                  <input
                    {...register("parent_lot_id")}
                    className={INPUT_CLS}
                    placeholder="lot-001-d3-2025 (nếu là mẫu)"
                  />
                </FormField>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Nhà sản xuất & Nhà cung cấp */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <Factory size={13} /> Nhà sản xuất &amp; Nhà cung cấp
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Nhà sản xuất *"
                  error={errors.manufacturer_name?.message}
                >
                  <input
                    {...register("manufacturer_name", {
                      required: "Bắt buộc nhập",
                    })}
                    className={
                      errors.manufacturer_name ? INPUT_ERR_CLS : INPUT_CLS
                    }
                    placeholder="Acme Pharma Ltd."
                  />
                </FormField>
                <FormField
                  label="Số lô NSX *"
                  error={errors.manufacturer_lot?.message}
                >
                  <input
                    {...register("manufacturer_lot", {
                      required: "Bắt buộc nhập",
                    })}
                    className={
                      errors.manufacturer_lot ? INPUT_ERR_CLS : INPUT_CLS
                    }
                    placeholder="MFR-2025-D3-001"
                  />
                </FormField>
                <FormField
                  label="Nhà cung cấp *"
                  error={errors.supplier_name?.message}
                  className="col-span-2"
                >
                  <input
                    {...register("supplier_name", {
                      required: "Bắt buộc nhập",
                    })}
                    className={errors.supplier_name ? INPUT_ERR_CLS : INPUT_CLS}
                    placeholder="Global Pharma Supply"
                  />
                </FormField>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Số lượng & Lưu trữ */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <MapPin size={13} /> Số lượng &amp; Lưu trữ
              </p>
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  label="Số lượng *"
                  error={errors.quantity?.message}
                  className="col-span-1"
                >
                  <input
                    type="number"
                    min={0}
                    {...register("quantity", {
                      required: "Bắt buộc nhập",
                      min: { value: 0, message: "Phải ≥ 0" },
                      valueAsNumber: true,
                    })}
                    className={errors.quantity ? INPUT_ERR_CLS : INPUT_CLS}
                  />
                </FormField>
                <FormField
                  label="Đơn vị *"
                  error={errors.unit_of_measure?.message}
                >
                  <input
                    {...register("unit_of_measure", {
                      required: "Bắt buộc nhập",
                    })}
                    className={
                      errors.unit_of_measure ? INPUT_ERR_CLS : INPUT_CLS
                    }
                    placeholder="kg / each"
                  />
                </FormField>
                <FormField label="Kho chứa *">
                  {warehousesLoading ? (
                    <div className="flex items-center py-2">
                      <Loader
                        size={14}
                        className="animate-spin text-gray-400"
                      />
                      <span className="text-sm text-gray-500 ml-2">
                        Đang tải...
                      </span>
                    </div>
                  ) : warehousesError ? (
                    <div className="flex items-center gap-2 p-2 bg-red-50 text-red-600 rounded text-sm">
                      <AlertCircle size={14} /> Lỗi:{" "}
                      {String(warehousesError?.message ?? warehousesError)}
                    </div>
                  ) : (
                    <>
                      <SelectMenu
                        items={warehouses.map((w) => ({
                          id: w.warehouse_id,
                          label: `${w.warehouse_id} - ${w.warehouse_name}`,
                        }))}
                        value={watch("warehouse_id") ?? ""}
                        onChange={(v) => setValue("warehouse_id", String(v))}
                        placeholder="-- Chọn kho --"
                        showSearch
                        searchPlaceholder="Tìm kho..."
                        selectClassName={INPUT_CLS}
                      />
                      <input type="hidden" {...register("warehouse_id")} />
                    </>
                  )}
                </FormField>
                <FormField
                  label="Vị trí lưu trữ *"
                  error={errors.storage_location?.message}
                >
                  {!warehouseId ? (
                    <div className="text-sm text-gray-500">
                      Vui lòng chọn kho trước
                    </div>
                  ) : binsLoading ? (
                    <div className="flex items-center py-2">
                      <Loader
                        size={14}
                        className="animate-spin text-gray-400"
                      />
                      <span className="text-sm text-gray-500 ml-2">
                        Đang tải vị trí...
                      </span>
                    </div>
                  ) : binsError ? (
                    <div className="flex items-center gap-2 p-2 bg-red-50 text-red-600 rounded text-sm">
                      <AlertCircle size={14} /> Lỗi: {String(binsError)}
                    </div>
                  ) : (
                    <>
                      <SelectMenu
                        items={bins.map((b) => ({
                          id: b.bin_code,
                          label: b.bin_code,
                        }))}
                        value={watch("storage_location") ?? ""}
                        onChange={(v) =>
                          setValue("storage_location", String(v))
                        }
                        placeholder="-- Chọn vị trí --"
                        showSearch
                        searchPlaceholder="Tìm vị trí..."
                        selectClassName={INPUT_CLS}
                        loading={binsLoading}
                      />
                      <input
                        type="hidden"
                        {...register("storage_location", {
                          required: "Bắt buộc chọn",
                        })}
                      />
                    </>
                  )}
                </FormField>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Thời hạn */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <Calendar size={13} /> Thời hạn
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Ngày sản xuất"
                  error={errors.manufacture_date?.message}
                >
                  <input
                    type="date"
                    {...register("manufacture_date", {
                      validate: (val) => {
                        if (!val) return true;
                        const expDate = watch("expiration_date");
                        if (expDate && val > expDate)
                          return "Ngày sản xuất không được sau hạn sử dụng";
                        return true;
                      },
                    })}
                    className={
                      errors.manufacture_date ? INPUT_ERR_CLS : INPUT_CLS
                    }
                  />
                </FormField>
                <FormField
                  label="Hạn sử dụng *"
                  error={errors.expiration_date?.message}
                >
                  <input
                    type="date"
                    {...register("expiration_date", {
                      required: "Bắt buộc nhập",
                      validate: (val) => {
                        const mfgDate = watch("manufacture_date");
                        if (mfgDate && val < mfgDate)
                          return "Hạn sử dụng không được trước ngày sản xuất";
                        return true;
                      },
                    })}
                    className={
                      errors.expiration_date ? INPUT_ERR_CLS : INPUT_CLS
                    }
                  />
                </FormField>
                <FormField
                  label="Ngày nhận hàng *"
                  error={errors.received_date?.message}
                >
                  <input
                    type="date"
                    {...register("received_date", {
                      required: "Bắt buộc nhập",
                    })}
                    className={errors.received_date ? INPUT_ERR_CLS : INPUT_CLS}
                  />
                </FormField>
                <FormField
                  label="Hạn sau khi mở"
                  error={errors.in_use_expiration_date?.message}
                >
                  <input
                    type="date"
                    {...register("in_use_expiration_date")}
                    className={INPUT_CLS}
                  />
                </FormField>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Trạng thái & Ghi chú */}
            <section>
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                <FlaskConical size={13} /> Trạng thái &amp; Ghi chú
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Trạng thái *" error={errors.status?.message}>
                  <select
                    {...register("status", { required: "Bắt buộc chọn" })}
                    className={errors.status ? INPUT_ERR_CLS : INPUT_CLS}
                  >
                    <option value="Accepted">Accepted — Đã chấp nhận</option>
                    <option value="Quarantine">
                      Quarantine — Đang cách ly
                    </option>
                    <option value="Rejected">Rejected — Bị từ chối</option>
                    <option value="Depleted">Depleted — Đã hết</option>
                  </select>
                </FormField>
                <FormField
                  label="Ghi chú"
                  error={errors.notes?.message}
                  className="col-span-2"
                >
                  <textarea
                    {...register("notes")}
                    rows={2}
                    className={`${INPUT_CLS} resize-none`}
                    placeholder="Ghi chú thêm về lô hàng..."
                  />
                </FormField>
              </div>
            </section>

            {/* Submit error */}
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 transition text-sm"
            >
              {isSubmitting ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSubmitting ? "Đang lưu..." : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
