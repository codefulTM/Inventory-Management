import React, { useEffect, useState } from "react";
import {
  fetchWarehouseSlip,
  uploadWarehouseSlipAttachment,
} from "../../../services/warehouseSlipService";
import type { WarehouseSlip } from "../../../types/warehouseSlip";

export default function WarehouseSlipDetail({ id }: { id: string }) {
  const [doc, setDoc] = useState<WarehouseSlip | null>(null);

  useEffect(() => {
    fetchWarehouseSlip(id).then((r) => setDoc(r));
  }, [id]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      // Upload each file (backend appends to attachments array)
      const uploads: Promise<any>[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fd = new FormData();
        fd.append("file", f);
        uploads.push(uploadWarehouseSlipAttachment(id, fd));
      }

      await Promise.all(uploads);
      const updated = await fetchWarehouseSlip(id);
      setDoc(updated);
    } catch (err: any) {
      console.error("Upload error", err);
      alert(err?.message || "Failed to upload attachments");
    }
  }

  if (!doc) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">{doc.slip_number}</h2>
      <p className="text-sm text-gray-600">
        Type: {doc.type} — Warehouse: {doc.warehouse_id}
      </p>

      <h3 className="mt-4 font-medium">Lines</h3>
      <ul className="list-disc list-inside">
        {doc.lines.map((l) => (
          <li key={l.line_id} className="py-1">
            {l.material_id ?? ""} — {l.quantity} {l.unit}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 font-medium">Attachments</h3>
      <div className="mt-2">
        <input type="file" multiple onChange={onUpload} />
      </div>
      <ul className="mt-2 list-disc list-inside">
        {doc.attachments.map((a) => (
          <li key={a.file_id} className="py-1">
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              {a.original_name}
            </a>{" "}
            <span className="text-xs text-gray-500">
              ({Math.round((a.size_bytes || 0) / 1024)} KB)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
