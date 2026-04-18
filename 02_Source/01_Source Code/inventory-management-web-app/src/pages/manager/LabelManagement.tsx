/**
 * Label Management page — Manager role
 * Full CRUD for Label Templates + Generate/Print capability
 */

import { useState, useCallback, useEffect } from "react";
import { Tag, Plus } from "lucide-react";
import type { LabelTemplate } from "../../types/label";
import { labelService } from "../../services/label.service";
import {
  LabelList,
  LabelForm,
  LabelDetail,
  LabelPrint,
} from "../../components/label";

type ViewMode = "list" | "detail" | "form" | "print";
type FormMode = "create" | "edit";

export default function LabelManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selected, setSelected] = useState<LabelTemplate | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [allTemplates, setAllTemplates] = useState<LabelTemplate[]>([]);

  // Load all templates for the print selector
  useEffect(() => {
    labelService
      .findAll(1, 100)
      .then((r) => setAllTemplates(r.data))
      .catch(console.error);
  }, [refreshKey]);

  const openCreate = useCallback(() => {
    setFormMode("create");
    setSelected(undefined);
    setViewMode("form");
  }, []);

  const openEdit = useCallback((t: LabelTemplate) => {
    setFormMode("edit");
    setSelected(t);
    setViewMode("form");
  }, []);

  const openDetail = useCallback((t: LabelTemplate) => {
    setSelected(t);
    setViewMode("detail");
  }, []);

  const openPrint = useCallback((t: LabelTemplate) => {
    setSelected(t);
    setViewMode("print");
  }, []);

  const goList = useCallback(() => {
    setViewMode("list");
    setSelected(undefined);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
    goList();
  }, [goList]);

  const handleDelete = useCallback(
    async (t: LabelTemplate) => {
      if (
        !window.confirm(
          `Delete template "${t.template_name}" (${t.template_id})?`,
        )
      )
        return;
      try {
        await labelService.delete(t._id);
        setRefreshKey((k) => k + 1);
        goList();
      } catch {
        alert("Failed to delete. Please try again.");
      }
    },
    [goList],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Page header */}
      <header className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-7 flex items-start justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Tag size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none">
              Label Management
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Manage label templates for inventory lots and production batches
            </p>
          </div>
        </div>
        {viewMode === "list" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 font-bold text-sm rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus size={16} />
            New Template
          </button>
        )}
      </header>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        {viewMode !== "list" && (
          <div className="mb-5 flex items-center gap-2 text-sm text-gray-500">
            <button
              onClick={goList}
              className="hover:text-blue-600 font-medium transition-colors"
            >
              Label Templates
            </button>
            <span>/</span>
            <span className="text-gray-900 font-semibold capitalize">
              {viewMode === "form"
                ? formMode === "create"
                  ? "New Template"
                  : `Edit: ${selected?.template_name}`
                : viewMode === "detail"
                  ? selected?.template_name
                  : `Print: ${selected?.template_name}`}
            </span>
          </div>
        )}

        {/* List */}
        {viewMode === "list" && (
          <LabelList
            onSelect={openDetail}
            onEdit={openEdit}
            onDelete={handleDelete}
            onPrint={openPrint}
            refreshKey={refreshKey}
          />
        )}

        {/* Detail */}
        {viewMode === "detail" && selected && (
          <div className="max-w-3xl mx-auto">
            <LabelDetail
              template={selected}
              onEdit={openEdit}
              onDelete={handleDelete}
              onPrint={openPrint}
              onClose={goList}
            />
          </div>
        )}

        {/* Form (create / edit) */}
        {viewMode === "form" && (
          <div className="max-w-3xl mx-auto">
            <LabelForm
              mode={formMode}
              existing={selected}
              onSuccess={handleFormSuccess}
              onCancel={goList}
            />
          </div>
        )}

        {/* Print */}
        {viewMode === "print" && (
          <div className="max-w-3xl mx-auto">
            <LabelPrint
              initialTemplate={selected}
              templates={allTemplates}
              onClose={goList}
            />
          </div>
        )}
      </div>
    </div>
  );
}
