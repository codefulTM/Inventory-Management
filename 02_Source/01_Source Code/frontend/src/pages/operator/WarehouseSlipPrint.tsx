import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWarehouseSlip } from "../../services/warehouseSlipService";

export default function WarehouseSlipPrint() {
  const { id } = useParams();
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    fetchWarehouseSlip(id).then((slip) => {
      const linesHtml = (slip.lines || [])
        .map(
          (l: any) =>
            `      <li>${l.material_id || ""} - ${l.quantity} ${l.unit || ""}</li>`,
        )
        .join("\n");

      const h = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${slip.slip_number}</title>
    <style>
      body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 16px; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      h2 { margin-top: 12px; }
      ul { margin: 6px 0 0 18px; }
    </style>
  </head>
  <body>
    <h1>${slip.slip_number}</h1>
    <p>Type: ${slip.type}</p>
    <p>Warehouse: ${slip.warehouse_id}</p>
    <h2>Lines</h2>
    <ul>
${linesHtml}
    </ul>
  </body>
</html>`;

      setHtml(h);
    });
  }, [id]);

  if (!id) return <div className="p-4">Missing id</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Print preview</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
