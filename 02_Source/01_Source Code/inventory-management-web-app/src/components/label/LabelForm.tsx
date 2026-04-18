/**
 * LabelForm component
 * Create / Edit a label template
 */

import React, { useState, useEffect } from "react";
import { LABEL_TYPES } from "../../types/label";
import type {
  LabelTemplate,
  CreateLabelTemplateRequest,
  LabelType,
} from "../../types/label";
import { labelService } from "../../services/label.service";
import { X, Save } from "lucide-react";

interface LabelFormProps {
  mode: "create" | "edit";
  existing?: LabelTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_TEMPLATE_CONTENT = `PHARMA WMS
================================
Material: {{material_name}}
Lot ID:   {{lot_id}}
Mfr Lot:  {{manufacturer_lot}}
Received: {{received_date}}
Expires:  {{expiration_date}}
Status:   {{status}}
Qty:      {{quantity}} {{unit_of_measure}}
Location: {{storage_location}}
================================
Printed: {{generatedAt}}`;

export const LabelForm: React.FC<LabelFormProps> = ({
  mode,
  existing,
  onSuccess,
  onCancel,
}) => {
  const [form, setForm] = useState<CreateLabelTemplateRequest>({
    template_id: "",
    template_name: "",
    label_type: "Raw Material",
    template_content: DEFAULT_TEMPLATE_CONTENT,
    width: 4.0,
    height: 2.0,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && existing) {
      setForm({
        template_id: existing.template_id,
        template_name: existing.template_name,
        label_type: existing.label_type,
        template_content: existing.template_content,
        width: existing.width,
        height: existing.height,
      });
    }
  }, [mode, existing]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.template_id.trim()) e.template_id = "Template ID is required";
    if (form.template_id.length > 20) e.template_id = "Max 20 characters";
    if (!form.template_name.trim()) e.template_name = "Template name is required";
    if (form.template_name.length > 100) e.template_name = "Max 100 characters";
    if (!form.template_content.trim())
      e.template_content = "Template content is required";
    if (!form.width || form.width <= 0) e.width = "Width must be > 0";
    if (!form.height || form.height <= 0) e.height = "Height must be > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      if (mode === "create") {
        await labelService.create(form);
      } else if (existing) {
        const { template_id: _id, ...updatePayload } = form;
        await labelService.update(existing._id, updatePayload);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An error occurred. Please try again.";
      setApiError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (
    key: keyof CreateLabelTemplateRequest,
    label: string,
    input: React.ReactNode,
  ) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">
        {label}
      </label>
      {input}
      {errors[key] && (
        <p className="text-xs text-red-500 mt-1">{errors[key]}</p>
      )}
    </div>
  );

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      hasError ? "border-red-400 bg-red-50" : "border-gray-200"
    }`;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
        <h2 className="text-white font-black text-lg tracking-tight">
          {mode === "create" ? "Create Label Template" : "Edit Label Template"}
        </h2>
        <button
          onClick={onCancel}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {field(
            "template_id",
            "Template ID *",
            <input
              type="text"
              value={form.template_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, template_id: e.target.value }))
              }
              disabled={mode === "edit"}
              placeholder="e.g. LBL-RAW-001"
              className={`${inputClass(!!errors.template_id)} ${
                mode === "edit" ? "bg-gray-50 cursor-not-allowed" : ""
              }`}
            />,
          )}

          {field(
            "template_name",
            "Template Name *",
            <input
              type="text"
              value={form.template_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, template_name: e.target.value }))
              }
              placeholder="e.g. Raw Material Standard Label"
              className={inputClass(!!errors.template_name)}
            />,
          )}

          {field(
            "label_type",
            "Label Type *",
            <select
              value={form.label_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  label_type: e.target.value as LabelType,
                }))
              }
              className={inputClass(false)}
            >
              {LABEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>,
          )}

          <div className="grid grid-cols-2 gap-3">
            {field(
              "width",
              "Width (inches) *",
              <input
                type="number"
                min={0.1}
                max={99.99}
                step={0.01}
                value={form.width}
                onChange={(e) =>
                  setForm((f) => ({ ...f, width: parseFloat(e.target.value) }))
                }
                className={inputClass(!!errors.width)}
              />,
            )}
            {field(
              "height",
              "Height (inches) *",
              <input
                type="number"
                min={0.1}
                max={99.99}
                step={0.01}
                value={form.height}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    height: parseFloat(e.target.value),
                  }))
                }
                className={inputClass(!!errors.height)}
              />,
            )}
          </div>
        </div>

        {field(
          "template_content",
          "Template Content *",
          <div>
            <textarea
              value={form.template_content}
              onChange={(e) =>
                setForm((f) => ({ ...f, template_content: e.target.value }))
              }
              rows={10}
              placeholder="Use {{placeholder}} for dynamic fields e.g. {{material_name}}, {{lot_id}}, {{expiration_date}}"
              className={`${inputClass(!!errors.template_content)} font-mono text-xs resize-y`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Supported placeholders: <code>{"{{material_name}}"}</code>,{" "}
              <code>{"{{lot_id}}"}</code>, <code>{"{{manufacturer_lot}}"}</code>
              , <code>{"{{received_date}}"}</code>,{" "}
              <code>{"{{expiration_date}}"}</code>, <code>{"{{status}}"}</code>
              , <code>{"{{quantity}}"}</code>,{" "}
              <code>{"{{unit_of_measure}}"}</code>,{" "}
              <code>{"{{storage_location}}"}</code>,{" "}
              <code>{"{{batch_number}}"}</code>,{" "}
              <code>{"{{manufacture_date}}"}</code>
            </p>
          </div>,
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            <Save size={16} />
            {loading
              ? "Saving…"
              : mode === "create"
                ? "Create Template"
                : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};
