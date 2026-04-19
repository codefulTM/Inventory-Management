import React, { useState, useEffect } from "react";
import {
  useForm,
  useFieldArray,
  useFormState,
  Controller,
} from "react-hook-form";
import type {
  WarehouseSlip,
  WarehouseSlipLine,
} from "../../../types/warehouseSlip";
import AttachmentUploader from "./AttachmentUploader";
import SelectMenu from "../../SelectMenu";
import { fetchInventoryLotOptions } from "../../../services/inventoryLotService";
import { fetchMaterials } from "../../../services/materialService";
import { fetchWarehouses } from "../../../services/warehouseService";
import { createWarehouseSlip } from "../../../services/warehouseSlipService";
import { fetchMaterial } from "../../../services/materialService";

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

export default function WarehouseSlipForm() {
  const { register, control, handleSubmit, setValue, watch } = useForm<
    Partial<WarehouseSlip>
  >({
    defaultValues: {
      type: "IN",
      warehouse_id: "",
      lines: [createEmptyLine()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const { errors } = useFormState({ control });

  const [materialsMap, setMaterialsMap] = useState<Record<string, any>>({});

  // Warehouses (paginated + searchable)
  const [whItems, setWhItems] = useState<any[]>([]);
  const [whPage, setWhPage] = useState(1);
  const [whTotalPages, setWhTotalPages] = useState(1);
  const [whLoading, setWhLoading] = useState(false);
  const [whSearch, setWhSearch] = useState("");

  // Lots for selected warehouse (paginated + searchable)
  const [lotItems, setLotItems] = useState<
    { lot_id: string; label: string; material_id: string }[]
  >([]);
  const [lotPage, setLotPage] = useState(1);
  const [lotTotalPages, setLotTotalPages] = useState(1);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotSearch, setLotSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    // fetch materials on mount, then initial warehouses
    fetchMaterials()
      .then((materialsRes) => {
        if (!mounted) return;
        const matMap: Record<string, any> = {};
        materialsRes.forEach((m: any) => (matMap[m.material_id || m._id] = m));
        setMaterialsMap(matMap);
        // initial warehouses load
        loadWarehouses(1, "");
      })
      .catch(() => {
        setMaterialsMap({});
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function loadWarehouses(page = 1, q = "") {
    setWhLoading(true);
    try {
      const res = await fetchWarehouses(page, 20, q);
      const whs = res && res.data ? res.data : [];
      setWhItems(whs.filter((w: any) => w));
      setWhPage(res.pagination?.page || page);
      setWhTotalPages(res.pagination?.totalPages || 1);
    } catch (e) {
      setWhItems([]);
      setWhTotalPages(1);
    } finally {
      setWhLoading(false);
    }
  }

  async function loadLots(warehouseId: string, page = 1, q = "") {
    setLotLoading(true);
    try {
      const res = await fetchInventoryLotOptions({
        warehouse_id: warehouseId,
        page,
        limit: 20,
        q,
      });
      const items = res.items || [];
      const matMap = { ...materialsMap };
      const opts = items.map((l: any) => ({
        lot_id: l.lot_id,
        material_id: l.material_id,
        label: `${l.lot_id} — ${(matMap[l.material_id] && (matMap[l.material_id].material_name || matMap[l.material_id].part_number)) || l.material_id}`,
      }));
      setLotItems(opts);
      setLotPage(res.pagination?.page || page);
      setLotTotalPages(res.pagination?.totalPages || 1);
    } catch (e) {
      setLotItems([]);
      setLotTotalPages(1);
    } finally {
      setLotLoading(false);
    }
  }

  const watchLines = (watch("lines") || []) as Partial<WarehouseSlipLine>[];

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedWarehouse = watch("warehouse_id");
  useEffect(() => {
    let mounted = true;
    if (!selectedWarehouse) {
      setLotItems([]);
      setLotPage(1);
      setLotTotalPages(1);
      return;
    }
    // reset lot search/page when warehouse changes
    setLotSearch("");
    setLotPage(1);
    loadLots(selectedWarehouse, 1, "");
    // clear any selected lot/material in lines when warehouse changes
    fields.forEach((f, idx) => {
      setValue(`lines.${idx}.lot_id`, "");
      setValue(`lines.${idx}.material_id`, "");
    });
    return () => {
      mounted = false;
    };
  }, [selectedWarehouse]);

  async function onSubmit(data: Partial<WarehouseSlip>) {
    setSubmitting(true);
    try {
      const lines = Array.isArray(data.lines) ? data.lines : [];
      for (const l of lines) {
        if (l.material_id) {
          try {
            const mat = await fetchMaterial(l.material_id);
            if ((mat.status || "").toLowerCase() !== "approved") {
              throw new Error(`Nguyên liệu ${l.material_id} chưa được duyệt`);
            }
          } catch (err: any) {
            alert(
              err?.message || `Xác thực nguyên liệu ${l.material_id} thất bại`,
            );
            setSubmitting(false);
            return;
          }
        }
      }

      const payload: any = { ...data, attachments: [] };
      const res = await createWarehouseSlip(payload);
      alert(`Tạo phiếu thành công: ${res.slip_number}`);
    } catch (err: any) {
      alert(err?.message || "Thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Loại phiếu
          </label>
          <select
            {...register("type")}
            className="mt-1 block w-full rounded-md border-gray-200 shadow-sm px-3 py-2"
          >
            <option value="IN">Phiếu nhập</option>
            <option value="OUT">Phiếu xuất</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Kho <span className="text-red-600">*</span>
          </label>
          <Controller
            control={control}
            name="warehouse_id"
            rules={{ required: "Kho là bắt buộc" }}
            render={({ field }) => (
              <SelectMenu
                items={whItems
                  .filter((w) => w.is_active !== false)
                  .map((w: any) => ({
                    id: w.warehouse_id || w._id,
                    label: w.warehouse_name || w.warehouse_id || w._id,
                  }))}
                value={field.value ?? ""}
                onChange={(v: string | number) => field.onChange(String(v))}
                className="w-full"
                placeholder="-- Chọn kho --"
                showSearch
                loading={whLoading}
                showPagination
                page={whPage}
                totalPages={whTotalPages}
                onSearchChange={(q: string) => {
                  setWhSearch(q);
                  loadWarehouses(1, q);
                }}
                onPageChange={(p: number) => loadWarehouses(p, whSearch)}
              />
            )}
          />
          {errors?.warehouse_id && (
            <div className="text-xs text-red-600 mt-1">
              {(errors.warehouse_id as any)?.message}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Số tham chiếu
          </label>
          <input
            {...register("reference_number")}
            className="mt-1 block w-full rounded-md border-gray-200 shadow-sm px-3 py-2"
            placeholder="Số tham chiếu (tùy chọn)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ghi chú
          </label>
          <input
            {...register("notes")}
            className="mt-1 block w-full rounded-md border-gray-200 shadow-sm px-3 py-2"
            placeholder="Ghi chú"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold">Dòng hàng</h4>
          <button
            type="button"
            onClick={() => append(createEmptyLine())}
            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
          >
            Thêm dòng
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">
                  Lô <span className="text-red-600">*</span>
                </th>
                <th className="px-3 py-2 text-left">Nguyên liệu</th>
                <th className="px-3 py-2 text-left">
                  Số lượng <span className="text-red-600">*</span>
                </th>
                <th className="px-3 py-2 text-left">Đơn giá</th>
                <th className="px-3 py-2 text-left">
                  Đơn vị <span className="text-red-600">*</span>
                </th>
                <th className="px-3 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {fields.map((f, idx) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 align-middle">
                    <Controller
                      control={control}
                      name={`lines.${idx}.lot_id`}
                      rules={{ required: "Lô là bắt buộc" }}
                      render={({ field }) => (
                        <>
                          <SelectMenu
                            items={lotItems.map((o) => ({
                              id: o.lot_id,
                              label: o.label,
                            }))}
                            value={field.value ?? ""}
                            onChange={(v: string | number) => {
                              const selected = String(v);
                              field.onChange(selected);
                              const found = lotItems.find(
                                (o) => o.lot_id === selected,
                              );
                              setValue(
                                `lines.${idx}.material_id`,
                                found ? found.material_id : "",
                              );
                            }}
                            className="w-full"
                            placeholder="-- Chọn lô --"
                            showSearch
                            loading={lotLoading}
                            showPagination
                            page={lotPage}
                            totalPages={lotTotalPages}
                            onSearchChange={(q: string) => {
                              setLotSearch(q);
                              if (selectedWarehouse)
                                loadLots(selectedWarehouse, 1, q);
                            }}
                            onPageChange={(p: number) => {
                              if (selectedWarehouse)
                                loadLots(selectedWarehouse, p, lotSearch);
                            }}
                          />
                          {errors?.lines &&
                            (errors.lines as any)[idx] &&
                            (errors.lines as any)[idx].lot_id && (
                              <div className="text-xs text-red-600 mt-1">
                                {(errors.lines as any)[idx].lot_id.message}
                              </div>
                            )}
                        </>
                      )}
                    />
                  </td>
                  <td className="px-3 py-2 align-middle text-sm text-gray-700">
                    {(() => {
                      const materialId = (watchLines[idx] || {})
                        .material_id as string;
                      const m = materialId ? materialsMap[materialId] : null;
                      return m
                        ? m.material_name || m.part_number || materialId
                        : materialId || "-";
                    })()}
                    <input
                      type="hidden"
                      {...register(`lines.${idx}.material_id` as const)}
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      {...register(`lines.${idx}.quantity` as const, {
                        valueAsNumber: true,
                        required: "Số lượng là bắt buộc",
                        min: {
                          value: 1,
                          message: "Số lượng phải lớn hơn hoặc bằng 1",
                        },
                      })}
                      className="w-28 rounded border-gray-200 px-2 py-1"
                      min={1}
                    />
                    {errors?.lines && errors.lines[idx] && (
                      <div className="text-xs text-red-600 mt-1">
                        {(errors.lines[idx] as any)?.quantity?.message}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      {...register(`lines.${idx}.unit_price` as const, {
                        valueAsNumber: true,
                        min: { value: 0, message: "Đơn giá phải >= 0" },
                      })}
                      className="w-32 rounded border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      placeholder="đơn vị"
                      {...register(`lines.${idx}.unit` as const, {
                        required: "Đơn vị là bắt buộc",
                      })}
                      className="w-24 rounded border-gray-200 px-2 py-1"
                    />
                    {errors?.lines && errors.lines[idx] && (
                      <div className="text-xs text-red-600 mt-1">
                        {(errors.lines[idx] as any)?.unit?.message}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Tệp đính kèm</h4>
        <AttachmentUploader
          onChange={(list) => setFiles(list.map((i) => i.file))}
        />
        <div className="text-xs text-gray-500 mt-2">
          Cho phép: JPG, PNG, PDF. Tối đa 5MB mỗi file.
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm disabled:opacity-60"
        >
          {submitting ? "Đang gửi..." : "Tạo phiếu"}
        </button>
        <a
          href="/operator/warehouse-slips"
          className="text-sm text-gray-600 hover:underline"
        >
          Hủy
        </a>
      </div>
    </form>
  );
}
