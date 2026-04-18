/**
 * LabelPrint component
 * Generate and print a label by populating a template with lot/batch data.
 * Uses mock data (TODO: integrate with real InventoryLot / ProductionBatch APIs).
 */

import React, { useState } from "react";
import { Printer, X, RefreshCw, Tag, Copy } from "lucide-react";
import type { LabelTemplate, LabelType } from "../../types/label";
import { LABEL_TYPES } from "../../types/label";
import { labelService } from "../../services/label.service";

interface LabelPrintProps {
  /** Pre-selected template (optional; user can pick from select) */
  initialTemplate?: LabelTemplate;
  /** Available templates for the select dropdown */
  templates: LabelTemplate[];
  onClose: () => void;
}

const LABEL_TYPE_COLORS: Record<LabelType, string> = {
  "Raw Material": "text-blue-700",
  Sample: "text-purple-700",
  Intermediate: "text-yellow-700",
  "Finished Product": "text-green-700",
  API: "text-red-700",
  Status: "text-gray-700",
};

export const LabelPrint: React.FC<LabelPrintProps> = ({
  initialTemplate,
  templates,
  onClose,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplate?.template_id ?? "",
  );
  const [lotId, setLotId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [populatedContent, setPopulatedContent] = useState<string | null>(null);
  const [sourceData, setSourceData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedTemplate = templates.find(
    (t) => t.template_id === selectedTemplateId,
  );

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      setError("Please select a template.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await labelService.generateLabel({
        template_id: selectedTemplateId,
        lot_id: lotId || undefined,
        batch_id: batchId || undefined,
      });
      setPopulatedContent(result.populatedContent);
      setSourceData(result.sourceData);
    } catch {
      setError("Failed to generate label. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!populatedContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Label — ${selectedTemplate?.template_name ?? "Label"}</title>
  <style>
    @page { size: ${selectedTemplate?.width ?? 4}in ${selectedTemplate?.height ?? 2}in; margin: 0; }
    body { margin: 0; padding: 8px; font-family: monospace; font-size: 10px; background: white; }
    pre { white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
<pre>${populatedContent}</pre>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleCopy = () => {
    if (!populatedContent) return;
    navigator.clipboard.writeText(populatedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const typeColor =
    (selectedTemplate &&
      LABEL_TYPE_COLORS[selectedTemplate.label_type]) ??
    "text-gray-600";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Printer size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-black text-base">Print Label</h2>
            <p className="text-white/70 text-xs mt-0.5">
              Generate and print a label from a template
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Template selector */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Select Template *
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => {
              setSelectedTemplateId(e.target.value);
              setPopulatedContent(null);
              setSourceData(null);
            }}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">— Choose a template —</option>
            {LABEL_TYPES.map((type) => {
              const group = templates.filter((t) => t.label_type === type);
              if (group.length === 0) return null;
              return (
                <optgroup key={type} label={type}>
                  {group.map((t) => (
                    <option key={t.template_id} value={t.template_id}>
                      {t.template_name} ({t.width}" × {t.height}")
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {selectedTemplate && (
            <p className={`text-xs mt-1 font-semibold ${typeColor}`}>
              Type: {selectedTemplate.label_type} · Size:{" "}
              {selectedTemplate.width}" × {selectedTemplate.height}"
            </p>
          )}
        </div>

        {/* Source IDs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              Inventory Lot ID (optional)
            </label>
            <input
              type="text"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              placeholder="e.g. LOT-2025-001"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              TODO: integrates with InventoryLot module
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              Production Batch ID (optional)
            </label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g. PB-2025-0001"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              TODO: integrates with ProductionBatch module
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !selectedTemplateId}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-green-200"
        >
          {loading ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Tag size={15} />
          )}
          {loading ? "Generating…" : "Generate Label"}
        </button>

        {/* Preview */}
        {populatedContent && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-600">
                Label Preview
                <span className="ml-2 text-gray-400 font-normal">
                  (using mock data — TODO: replace with real integration)
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <Copy size={12} />
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Printer size={12} />
                  Print
                </button>
              </div>
            </div>
            <div
              style={{
                width: `${Math.min((selectedTemplate?.width ?? 4) * 60, 480)}px`,
              }}
              className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-4 mx-auto"
            >
              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap leading-relaxed">
                {populatedContent}
              </pre>
            </div>

            {/* Source data table */}
            {sourceData && (
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  View source data (mock)
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="text-xs w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-gray-500">
                          Field
                        </th>
                        <th className="text-left px-3 py-2 font-bold text-gray-500">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(sourceData).map(([k, v]) => (
                        <tr key={k}>
                          <td className="px-3 py-1.5 font-mono text-gray-500">
                            {k}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700">
                            {String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
