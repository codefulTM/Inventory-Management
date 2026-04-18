import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import type { WarehouseSlip } from "../../../types/warehouseSlip";
import AttachmentUploader from "./AttachmentUploader";
import type { WarehouseSlipLine } from "../../../types/warehouseSlip";
import { useEffect } from "react";
import { fetchInventoryLots } from "../../../services/inventoryLotService";
import { fetchMaterials } from "../../../services/materialService";
import { useFormState } from "react-hook-form";

function generateLineId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function createEmptyLine(): WarehouseSlipLine {
  return {
    line_id: generateLineId(),
    material_id: "",
    lot_id: "",
    quantity: 1,
    unit: "",
  };
}
import { createWarehouseSlip } from "../../../services/warehouseSlipService";
import { fetchMaterial } from "../../../services/materialService";

export default function WarehouseSlipForm() {
  const { register, control, handleSubmit } = useForm<Partial<WarehouseSlip>>({
    defaultValues: {
      type: "IN",
      warehouse_id: "",
      lines: [createEmptyLine()],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const { setValue } = control as any;
  const [lotOptions, setLotOptions] = React.useState<
    {
      lot_id: string;
      label: string;
      material_id: string;
    }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchInventoryLots(), fetchMaterials()])
      .then(([lots, materials]) => {
        if (!mounted) return;
        const matMap: Record<string, any> = {};
        materials.forEach((m: any) => (matMap[m.material_id || m._id] = m));
        const opts = lots.map((l: any) => ({
          lot_id: l.lot_id,
          material_id: l.material_id,
          label: `${l.lot_id} — ${(matMap[l.material_id] && (matMap[l.material_id].material_name || matMap[l.material_id].part_number)) || l.material_id}`,
        }));
        setLotOptions(opts);
      })
      .catch(() => {
        setLotOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(data: Partial<WarehouseSlip>) {
    setSubmitting(true);
    try {
      // client-side validation: ensure materials exist and are Approved
      const lines = Array.isArray(data.lines) ? data.lines : [];
      for (const l of lines) {
        if (l.material_id) {
          try {
            const mat = await fetchMaterial(l.material_id);
            if ((mat.status || "").toLowerCase() !== "approved") {
              throw new Error(`Material ${l.material_id} is not Approved`);
            }
          } catch (err: any) {
            alert(
              err?.message || `Material ${l.material_id} validation failed`,
            );
            setSubmitting(false);
            return;
          }
        }
      }
      // build payload; attachments uploaded separately in this minimal impl
      const payload: any = { ...data, attachments: [] };
      const res = await createWarehouseSlip(payload);
      alert(`Created slip ${res.slip_number}`);
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Type</label>
        <select {...register("type")}>
          {" "}
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
      </div>
      <div>
        <label>Warehouse</label>
        <input {...register("warehouse_id", { required: true })} />
      </div>
      <div>
        <label>Reference</label>
        <input {...register("reference_number")} />
      </div>
      <div>
        <label>Notes</label>
        <textarea {...register("notes")} />
      </div>

      <h4>Lines</h4>
      {fields.map((f, idx) => (
        <div key={f.id} className="flex items-center gap-2">
          <select
            {...register(`lines.${idx}.lot_id` as const, {
              required: "Lot is required",
            })}
            onChange={(e) => {
              const selected = e.target.value;
              // set material_id based on selected lot
              const found = lotOptions.find((o) => o.lot_id === selected);
              setValue(
                `lines.${idx}.material_id`,
                found ? found.material_id : "",
              );
            }}
          >
            <option value="">-- select lot --</option>
            {lotOptions.map((o) => (
              <option key={o.lot_id} value={o.lot_id}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="hidden"
            {...register(`lines.${idx}.material_id` as const)}
          />
          <input
            type="number"
            {...register(`lines.${idx}.quantity` as const, {
              valueAsNumber: true,
              required: "Quantity is required",
              min: { value: 1, message: "Quantity must be at least 1" },
            })}
          />
          <input
            placeholder="unit price"
            type="number"
            step="0.01"
            {...register(`lines.${idx}.unit_price` as const, {
              valueAsNumber: true,
              min: { value: 0, message: "Unit price must be >= 0" },
            })}
          />
          <input
            placeholder="unit"
            {...register(`lines.${idx}.unit` as const, {
              required: "Unit is required",
            })}
          />
          <button type="button" onClick={() => remove(idx)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append(createEmptyLine())}>
        Add line
      </button>

      <h4>Attachments</h4>
      <AttachmentUploader
        onChange={(list) => setFiles(list.map((i) => i.file))}
      />

      <div className="mt-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
