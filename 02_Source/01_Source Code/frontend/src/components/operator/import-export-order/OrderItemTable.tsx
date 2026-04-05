import type {
  FieldArrayWithId,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import type {
  ImportExportOrderFormValues,
  ImportExportOrderType,
  InventoryLotOption,
  MaterialOption,
  StorageLocationOption,
} from "../../../types/importExportOrder";

interface OrderItemTableProps {
  orderType: ImportExportOrderType;
  fields: FieldArrayWithId<ImportExportOrderFormValues, "items", "id">[];
  register: UseFormRegister<ImportExportOrderFormValues>;
  errors: FieldErrors<ImportExportOrderFormValues>;
  materialOptions: MaterialOption[];
  lotOptions: InventoryLotOption[];
  locationOptions: StorageLocationOption[];
  isOptionsLoading?: boolean;
  isLocationLoading?: boolean;
  disabled?: boolean;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onMaterialChange: (index: number, materialId: string) => void;
  onLotChange: (index: number, lotId: string) => void;
}

function InputError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>;
}

export default function OrderItemTable({
  orderType,
  fields,
  register,
  errors,
  materialOptions,
  lotOptions,
  locationOptions,
  isOptionsLoading = false,
  isLocationLoading = false,
  disabled = false,
  onAddItem,
  onRemoveItem,
  onMaterialChange,
  onLotChange,
}: OrderItemTableProps) {
  const isInbound = orderType === "Inbound";

  return (
    <section className="rounded-lg bg-white p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">
          Danh sách vật tư
        </h3>
        <button
          type="button"
          onClick={onAddItem}
          disabled={disabled}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Thêm dòng
        </button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const rowError = errors.items?.[index];

          return (
            <div
              key={field.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Dòng #{index + 1}
                </p>
                <button
                  type="button"
                  disabled={disabled || fields.length <= 1}
                  onClick={() => onRemoveItem(index)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Xóa
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="block text-xs font-semibold text-gray-600">
                  Mã vật tư *
                  {isInbound ? (
                    <select
                      disabled={disabled || isOptionsLoading}
                      {...register(`items.${index}.material_id`, {
                        required: "Mã vật tư không được để trống.",
                        onChange: (event) => {
                          onMaterialChange(index, event.target.value);
                        },
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    >
                      <option value="">
                        {isOptionsLoading
                          ? "Đang tải vật tư..."
                          : "Chọn mã vật tư"}
                      </option>
                      {materialOptions.map((option) => (
                        <option
                          key={option.material_id}
                          value={option.material_id}
                        >
                          {option.material_id} - {option.material_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      readOnly
                      disabled={disabled}
                      {...register(`items.${index}.material_id`, {
                        required: "Mã vật tư không được để trống.",
                      })}
                      placeholder="Tự điền theo mã lô"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none transition disabled:bg-gray-100"
                    />
                  )}
                  <InputError
                    message={
                      rowError?.material_id?.message as string | undefined
                    }
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-600">
                  Mã lô {isInbound ? "" : "*"}
                  {isInbound ? (
                    <input
                      readOnly
                      disabled
                      {...register(`items.${index}.lot_id`)}
                      placeholder="Hệ thống tự sinh khi tạo phiếu"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none transition disabled:bg-gray-100"
                    />
                  ) : (
                    <select
                      disabled={disabled || isOptionsLoading}
                      {...register(`items.${index}.lot_id`, {
                        required: "Mã lô không được để trống.",
                        onChange: (event) => {
                          onLotChange(index, event.target.value);
                        },
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    >
                      <option value="">
                        {isOptionsLoading ? "Đang tải lô..." : "Chọn mã lô"}
                      </option>
                      {lotOptions.map((option) => (
                        <option key={option.lot_id} value={option.lot_id}>
                          {option.lot_id}
                        </option>
                      ))}
                    </select>
                  )}
                  <InputError
                    message={rowError?.lot_id?.message as string | undefined}
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-600">
                  Số lượng *
                  <input
                    type="number"
                    min={1}
                    step={1}
                    disabled={disabled}
                    {...register(`items.${index}.quantity`, {
                      required: "Số lượng là bắt buộc.",
                      valueAsNumber: true,
                      validate: (value) => {
                        if (!Number.isInteger(value) || value <= 0) {
                          return "Số lượng phải là số nguyên dương.";
                        }
                        return true;
                      },
                    })}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />
                  <InputError
                    message={rowError?.quantity?.message as string | undefined}
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-600">
                  Đơn vị *
                  <input
                    readOnly={!isInbound}
                    disabled={disabled}
                    {...register(`items.${index}.unit_of_measure`, {
                      required: "Đơn vị là bắt buộc.",
                    })}
                    placeholder={isInbound ? "VD: kg" : "Tự điền theo mã lô"}
                    className={`mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 ${
                      !isInbound ? "bg-gray-100" : "bg-white"
                    }`}
                  />
                  <InputError
                    message={
                      rowError?.unit_of_measure?.message as string | undefined
                    }
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-600">
                  Vị trí kỳ vọng *
                  {isInbound ? (
                    <select
                      disabled={disabled || isLocationLoading}
                      {...register(`items.${index}.expected_location`, {
                        required: "Vị trí kỳ vọng không được để trống.",
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    >
                      <option value="">
                        {isLocationLoading
                          ? "Đang tải vị trí..."
                          : "Chọn vị trí kỳ vọng"}
                      </option>
                      {locationOptions.map((location) => (
                        <option
                          key={location.location_id}
                          value={location.location_id}
                        >
                          {location.location_id} - {location.location_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      readOnly
                      disabled={disabled}
                      {...register(`items.${index}.expected_location`, {
                        required: "Vị trí kỳ vọng không được để trống.",
                      })}
                      placeholder="Tự điền theo mã lô"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none transition disabled:bg-gray-100"
                    />
                  )}
                  <InputError
                    message={
                      rowError?.expected_location?.message as string | undefined
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
