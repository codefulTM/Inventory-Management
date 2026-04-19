import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  const backendPrintUrl = `/api/warehouse/slips/${id}/print`;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{doc.slip_number}</h2>
          <p className="text-sm text-gray-600">
            Type: {doc.type} — Warehouse: {doc.warehouse_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/operator/warehouse-slips/${id}/print`}
            className="px-3 py-2 bg-white border border-gray-100 rounded-md shadow-sm hover:bg-gray-50"
          >
            Xem trước In
          </Link>
          <a
            href={backendPrintUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
          >
            Mở chế độ In
          </a>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <h3 className="font-medium">Lines</h3>
        <ul className="list-disc list-inside mt-2">
          {doc.lines.map((l) => (
            <li key={l.line_id} className="py-1 text-sm">
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
    </div>
  );
}
