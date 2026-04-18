/**
 * Label Print page — Operator role
 * Operators can browse templates and print labels for inventory lots / production batches
 */

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import type { LabelTemplate, LabelType } from "../../types/label";
import { LABEL_TYPES } from "../../types/label";
import { labelService } from "../../services/label.service";
import { LabelPrint } from "../../components/label";

const LABEL_TYPE_COLORS: Record<LabelType, string> = {
  "Raw Material": "bg-blue-100 text-blue-800",
  Sample: "bg-purple-100 text-purple-800",
  Intermediate: "bg-yellow-100 text-yellow-800",
  "Finished Product": "bg-green-100 text-green-800",
  API: "bg-red-100 text-red-800",
  Status: "bg-gray-100 text-gray-700",
};

export default function LabelPrintPage() {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LabelTemplate | undefined>();
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    labelService
      .findAll(1, 100)
      .then((response) => setTemplates(response.data || []))
      .catch((err) => {
        console.error("Failed to load label templates:", err);
        setTemplates([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectAndPrint = (t: LabelTemplate) => {
    setSelected(t);
    setShowPrint(true);
  };

  if (showPrint) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <header className="bg-gradient-to-br from-green-600 to-green-700 text-white px-6 py-5 shadow-md flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Tag size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-black">Print Label</h1>
        </header>
        <div className="px-6 py-6 max-w-3xl mx-auto">
          <button
            onClick={() => {
              setShowPrint(false);
              setSelected(undefined);
            }}
            className="mb-4 text-sm text-blue-600 hover:underline font-medium"
          >
            ← Back to templates
          </button>
          <LabelPrint
            initialTemplate={selected}
            templates={templates}
            onClose={() => {
              setShowPrint(false);
              setSelected(undefined);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-gradient-to-br from-green-600 to-green-700 text-white px-6 py-7 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Tag size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Print Labels</h1>
            <p className="text-white/70 text-sm mt-1">
              Select a label template to generate and print
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Tag size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-lg">No label templates available</p>
            <p className="text-sm mt-1">
              Ask your manager to create label templates first.
            </p>
          </div>
        ) : (
          <>
            {/* Group templates by type */}
            {LABEL_TYPES.map((type) => {
              const group = templates.filter((t) => t.label_type === type);
              if (group.length === 0) return null;
              return (
                <div key={type} className="mb-8">
                  <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-3">
                    {type}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => handleSelectAndPrint(t)}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all text-left p-5 group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-10 h-10 bg-gray-50 border border-gray-200 group-hover:bg-green-50 group-hover:border-green-200 rounded-xl flex items-center justify-center transition-colors">
                            <Tag
                              size={18}
                              className="text-gray-400 group-hover:text-green-600 transition-colors"
                            />
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              LABEL_TYPE_COLORS[t.label_type]
                            }`}
                          >
                            {t.label_type}
                          </span>
                        </div>
                        <p className="font-black text-gray-900 text-sm leading-snug mb-1">
                          {t.template_name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {t.template_id}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {t.width}" × {t.height}"
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-bold text-green-600 group-hover:text-green-700 transition-colors">
                          Tap to print →
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
