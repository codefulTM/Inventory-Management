/**
 * LabelPrint Page (Operator)
 * Trang in nhãn dán (label) dành cho Operator
 * 
 * Chức năng chính:
 * - Xem danh sách các mẫu nhãn dán (Label Templates)
 * - Chọn mẫu nhãn và tiến hành in
 * - Phân loại nhãn theo: Raw Material, Sample, Intermediate, Finished Product, API
 * 
 * Quy trình in nhãn:
 * 1. Operator duyệt danh sách các mẫu nhãn có sẵn
 * 2. Chọn mẫu nhãn phù hợp với loại vật tư/sản phẩm
 * 3. Hệ thống hiển thị form điền thông tin để in nhãn
 * 4. In nhãn dán dán lên lô hàng hoặc sản phẩm
 * 
 * Các loại nhãn:
 * - Raw Material: Nhãn cho nguyên liệu thô
 * - Sample: Nhãn cho mẫu thử nghiệm
 * - Intermediate: Nhãn cho sản phẩm trung gian
 * - Finished Product: Nhãn cho thành phẩm
 * - API: Nhãn cho sản phẩm API
 */
import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import type { LabelTemplate, LabelType } from "../../types/label";
import { LABEL_TYPES } from "../../types/label";
import { labelService } from "../../services/label.service";
import { LabelPrint } from "../../components/label";

// Màu sắc cho từng loại nhãn
const LABEL_TYPE_COLORS: Record<LabelType, string> = {
  "Raw Material": "bg-blue-100 text-blue-800",  // Nguyên liệu
  Sample: "bg-purple-100 text-purple-800",  // Mẫu
  Intermediate: "bg-yellow-100 text-yellow-800",  // Trung gian
  "Finished Product": "bg-green-100 text-green-800",  // Thành phẩm
  API: "bg-red-100 text-red-800",  // API
  Status: "bg-gray-100 text-gray-700",  // Trạng thái
};

export default function LabelPrintPage() {
  // State danh sách mẫu nhãn
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  // Mẫu nhãn đang chọn
  const [selected, setSelected] = useState<LabelTemplate | undefined>();
  // Hiển thị trang in
  const [showPrint, setShowPrint] = useState(false);

  // Tải danh sách mẫu nhãn khi mount
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

  // Xử lý chọnmẫu và hiển thị form in
  const handleSelectAndPrint = (t: LabelTemplate) => {
    setSelected(t);
    setShowPrint(true);
  };

  // Giao diện form in nhãn
  if (showPrint) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <header className="bg-gradient-to-br from-green-600 to-green-700 text-white px-6 py-5 shadow-md flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Tag size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-black">In Nhãn Dán</h1>
        </header>
        <div className="px-6 py-6 max-w-3xl mx-auto">
          {/* Nút quay lại danh sách mẫu */}
          <button
            onClick={() => {
              setShowPrint(false);
              setSelected(undefined);
            }}
            className="mb-4 text-sm text-blue-600 hover:underline font-medium"
          >
            ← Quay lại danh sách
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
      {/* Header trang */}
      <header className="bg-gradient-to-br from-green-600 to-green-700 text-white px-6 py-7 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Tag size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">In Nhãn Dán</h1>
            <p className="text-white/70 text-sm mt-1">
              Chọn mẫu nhãn để tạo và in
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        {loading ? (
          // Hiển thị loading
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          // Thông báo chưa có mẫu
          <div className="text-center py-20 text-gray-400">
            <Tag size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-lg">Chưa có mẫu nhãn nào</p>
            <p className="text-sm mt-1">
              Yêu cầu Manager tạo mẫu nhãn trước.
            </p>
          </div>
        ) : (
          <>
            {/* Nhóm mẫu theo loại nhãn */}
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
                      // Card mẫu nhãn - click để in
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
                          {/* Badge loại nhãn */}
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
                        {/* Kích thước nhãn */}
                        <p className="text-xs text-gray-400 mt-2">
                          {t.width}" × {t.height}"
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-bold text-green-600 group-hover:text-green-700 transition-colors">
                          Nhấn để in →
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
