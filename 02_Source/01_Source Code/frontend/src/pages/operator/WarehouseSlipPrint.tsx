import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWarehouseSlip } from "../../services/warehouseSlipService";

export default function WarehouseSlipPrint() {
  const { id } = useParams();
  const [html, setHtml] = useState<string>("");

  // previewHtml is the fragment we render inside the app for preview (no full <html> wrapper)
  const [previewHtml, setPreviewHtml] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    fetchWarehouseSlip(id).then((slip) => {
      const rows = (slip.lines || [])
        .map(
          (l: any, idx: number) =>
            `<tr><td>${idx + 1}</td><td>${l.material_id || ""}</td><td>${l.quantity}</td><td>${l.unit || ""}</td></tr>`,
        )
        .join("\n");

      const attachments = (slip.attachments || [])
        .map(
          (a: any) =>
            `<li><a href="${a.url}" target="_blank">${a.original_name}</a></li>`,
        )
        .join("\n");

      const style = `
        <style>
          body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 20px; color: #111827 }
          h1 { font-size: 22px; margin-bottom: 8px }
          .meta { margin-bottom: 12px; color: #374151 }
          table { width: 100%; border-collapse: collapse; margin-top: 8px }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left }
          th { background: #f9fafb }
          ul { margin: 6px 0 0 18px }
          .attachments { margin-top: 12px }
          /* print page sizing */
          @page { size: A4; margin: 20mm }
        </style>
      `;

      const bodyHtml = `
        <div class="print-document">
          <h1>${slip.slip_number}</h1>
          <div class="meta">Type: ${slip.type} — Warehouse: ${slip.warehouse_id}</div>
          <h2>Lines</h2>
          <table>
            <thead>
              <tr><th>#</th><th>Material</th><th>Qty</th><th>Unit</th></tr>
            </thead>
            <tbody>
${rows}
            </tbody>
          </table>
          <div class="attachments">
            <h3>Attachments</h3>
            <ul>
${attachments}
            </ul>
          </div>
        </div>
      `;

      // full HTML for printing (iframe or new window)
      const fullHtml = `<!doctype html><html><head><meta charset="utf-8" /><title>${slip.slip_number}</title>${style}</head><body>${bodyHtml}</body></html>`;

      setHtml(fullHtml);
      // preview as fragment (render inside the React page)
      setPreviewHtml(style + bodyHtml);
    });
  }, [id]);

  if (!id) return <div className="p-4">Missing id</div>;

  function handlePrint() {
    // Use an offscreen iframe to avoid popup blockers and ensure printing works.
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        return alert("Không thể mở cửa sổ in");
      }

      doc.open();
      doc.write(html);
      doc.close();

      // allow render, then print and remove iframe
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn("Print failed", e);
        } finally {
          // cleanup
          try {
            document.body.removeChild(iframe);
          } catch (e) {
            /* ignore */
          }
        }
      }, 300);
    } catch (e) {
      console.warn("Print setup failed", e);
      alert(
        "Không thể in. Vui lòng thử mở chế độ In (raw) rồi in từ trình duyệt.",
      );
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Print preview</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
          >
            In (Print)
          </button>
          <a
            href={`/api/warehouse/slips/${id}/print`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-white border border-gray-100 rounded-md hover:bg-gray-50"
          >
            Mở chế độ In (raw)
          </a>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: previewHtml || html }}
        />
      </div>
    </div>
  );
}
