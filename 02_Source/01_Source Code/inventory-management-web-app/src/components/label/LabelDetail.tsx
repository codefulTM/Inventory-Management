/**
 * LabelDetail component
 * Shows full detail of a label template with option to print/edit/delete
 */

import React from "react";
import { X, Edit2, Trash2, Printer, Tag } from "lucide-react";
import type { LabelTemplate, LabelType } from "../../types/label";

interface LabelDetailProps {
  template: LabelTemplate;
  onEdit: (t: LabelTemplate) => void;
  onDelete: (t: LabelTemplate) => void;
  onPrint: (t: LabelTemplate) => void;
  onClose: () => void;
}

const LABEL_TYPE_COLORS: Record<LabelType, string> = {
  "Raw Material": "bg-blue-100 text-blue-800 border-blue-200",
  Sample: "bg-purple-100 text-purple-800 border-purple-200",
  Intermediate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Finished Product": "bg-green-100 text-green-800 border-green-200",
  API: "bg-red-100 text-red-800 border-red-200",
  Status: "bg-gray-100 text-gray-800 border-gray-200",
};

export const LabelDetail: React.FC<LabelDetailProps> = ({
  template,
  onEdit,
  onDelete,
  onPrint,
  onClose,
}) => {
  const typeColor =
    LABEL_TYPE_COLORS[template.label_type] ??
    "bg-gray-100 text-gray-700 border-gray-200";

  const infoRow = (label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold text-gray-500 w-32 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900 flex-1">{value}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Tag size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-black text-base leading-tight">
              {template.template_name}
            </h2>
            <p className="text-white/70 text-xs mt-0.5">{template.template_id}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Meta info */}
        <div className="space-y-2.5">
          {infoRow(
            "Label Type",
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeColor}`}
            >
              {template.label_type}
            </span>,
          )}
          {infoRow(
            "Size",
            `${template.width}" wide × ${template.height}" tall`,
          )}
          {infoRow(
            "Created",
            new Date(template.created_date).toLocaleString(),
          )}
          {infoRow(
            "Modified",
            new Date(template.modified_date).toLocaleString(),
          )}
        </div>

        {/* Template content preview */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">
            Template Content
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {template.template_content}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => onPrint(template)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Printer size={15} />
            Print Label
          </button>
          <button
            onClick={() => onEdit(template)}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Edit2 size={15} />
            Edit
          </button>
          <button
            onClick={() => onDelete(template)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors ml-auto"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
