import type {
  FieldArrayWithId,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import type { ImportExportOrderFormValues } from "../../../types/importExportOrder";

interface OrderItemTableProps {
  fields: FieldArrayWithId<ImportExportOrderFormValues, "items", "id">[];
  register: UseFormRegister<ImportExportOrderFormValues>;
  errors: FieldErrors<ImportExportOrderFormValues>;
  disabled?: boolean;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

function InputError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>;
}

export default function OrderItemTable({
  fields,
  register,
  errors,
  disabled = false,
  onAddItem,
  onRemoveItem,
}: OrderItemTableProps) {
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
                  <input
                    disabled={disabled}
                    {...register(`items.${index}.material_id`, {
                      required: "Material ID không được để trống.",
                    })}
                    placeholder="VD: MAT-001"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />
                  <InputError
                    message={
                      rowError?.material_id?.message as string | undefined
                    }
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-600">
                  Mã lô
                  <input
                    disabled={disabled}
                    {...register(`items.${index}.lot_id`)}
                    placeholder="Tùy chọn"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
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
                    disabled={disabled}
                    {...register(`items.${index}.unit_of_measure`, {
                      required: "Đơn vị là bắt buộc.",
                    })}
                    placeholder="VD: kg"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />
                  <InputError
                    message={
                      rowError?.unit_of_measure?.message as string | undefined
                    }
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-600">
                  Vị trí kỳ vọng
                  <input
                    disabled={disabled}
                    {...register(`items.${index}.expected_location`)}
                    placeholder="VD: A-01"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
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
