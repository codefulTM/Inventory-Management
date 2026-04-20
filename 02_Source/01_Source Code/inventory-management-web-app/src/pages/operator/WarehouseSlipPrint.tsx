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
          :root { --muted: #6b7280; --accent: #0369a1 }
          body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: #f3f4f6; padding: 24px; color: #111827 }
          .paper { max-width: 820px; margin: 0 auto; background: white; padding: 28px; box-shadow: 0 10px 30px rgba(2,6,23,0.08); border-radius: 6px }
          .doc-header { display:flex; align-items:center; gap:16px; margin-bottom:12px }
          .logo { width:56px; height:56px; background: linear-gradient(135deg,#60a5fa,#06b6d4); border-radius:8px; display:inline-block }
          h1 { font-size:20px; margin:0; letter-spacing:0.2px }
          .meta { margin-left:auto; text-align:right; color: var(--muted); font-size:13px }
          .meta b { color: #111827 }
          .meta-row { margin-bottom:6px }
          table { width: 100%; border-collapse: collapse; margin-top: 12px }
          th, td { border: 1px solid #e6e7eb; padding: 10px; text-align: left; font-size: 13px }
          th { background: #fbfbfd; color: #374151 }
          ul { margin: 8px 0 0 18px }
          .attachments { margin-top: 12px }
          .print-actions { display:flex; gap:8px; align-items:center }
          @media print { body { background: white; padding:0 } .paper { box-shadow:none; border-radius:0; margin:0; padding: 14mm } }
          @page { size: A4; margin: 12mm }
        </style>
      `;

      const bodyHtml = `
        <div class="paper">
          <div class="doc-header">
            <div class="logo" aria-hidden></div>
            <div>
              <h1>${slip.slip_number}</h1>
              <div style="color:var(--muted); font-size:13px">${slip.title || "Warehouse Slip"}</div>
            </div>
            <div class="meta">
              <div class="meta-row"><b>Type:</b> ${slip.type || "-"}</div>
              <div class="meta-row"><b>Warehouse:</b> ${slip.warehouse_id || "-"}</div>
              <div class="meta-row"><b>Date:</b> ${new Date(slip.created_date || Date.now()).toLocaleString()}</div>
            </div>
          </div>

          <h3 style="margin-top:6px; margin-bottom:6px">Lines</h3>
          <table>
            <thead>
              <tr><th style="width:48px">#</th><th>Material</th><th style="width:120px">Qty</th><th style="width:120px">Unit</th></tr>
            </thead>
            <tbody>
${rows}
            </tbody>
          </table>

          <div class="attachments">
            <h4 style="margin-top:12px; margin-bottom:8px">Attachments</h4>
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
      alert("Không thể in. Vui lòng thử lại.");
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
            In
          </button>
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
