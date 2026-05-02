// File: components/operator/import-export-order/AttachmentUploader.tsx
// Component quản lý chứng từ đính kèm cho phiếu nhập/xuất kho
// Hiển thị file chờ tải lên (pending) và file đã lưu (uploaded)
// Hỗ trợ chọn nguồn file: tải lên (upload) hoặc camera

import type {
  ImportExportAttachmentSource,
  ImportExportOrderAttachment,
} from "../../../types/importExportOrder";

// File chờ tải lên (chưa được lưu vào server)
export interface PendingAttachment {
  id: string;
  file: File;
}

interface AttachmentUploaderProps {
  disabled?: boolean;
  source: ImportExportAttachmentSource;
  onSourceChange: (source: ImportExportAttachmentSource) => void;
  pendingFiles: PendingAttachment[];
  uploadedFiles: ImportExportOrderAttachment[];
  validationMessage?: string;
  onPickFiles: (fileList: FileList | null) => void;
  onRemovePending: (id: string) => void;
}

// Format kích thước file sang B/KB/MB
function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

// Props cho AttachmentUploader
interface AttachmentUploaderProps {
  disabled = false,
  source,
  onSourceChange,
  pendingFiles,
  uploadedFiles,
  validationMessage,
  onPickFiles,
  onRemovePending,
}: AttachmentUploaderProps) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">
          Chứng từ đính kèm
        </h3>
        <p className="text-xs font-semibold text-gray-500">
          Hỗ trợ: JPG, PNG, PDF (tối đa 5MB mỗi file)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
          Nguồn file
          <select
            value={source}
            onChange={(event) =>
              onSourceChange(event.target.value as ImportExportAttachmentSource)
            }
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          >
            <option value="upload">Tải lên</option>
            <option value="camera">Camera</option>
          </select>
        </label>

        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Chọn file
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,application/pdf"
            disabled={disabled}
            onChange={(event) => {
              onPickFiles(event.target.files);
              event.target.value = "";
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            File chờ tải ({pendingFiles.length})
          </p>
          <div className="space-y-2">
            {pendingFiles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Chưa chọn file nào.
              </p>
            ) : (
              pendingFiles.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-700">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.file.type || "unknown"} -{" "}
                      {formatSize(entry.file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemovePending(entry.id)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Xóa
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            File đã lưu ({uploadedFiles.length})
          </p>
          <div className="space-y-2">
            {uploadedFiles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Chưa có file nào được lưu.
              </p>
            ) : (
              uploadedFiles.map((file) => (
                <div
                  key={file.file_id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
                >
                  <p className="truncate text-sm font-semibold text-emerald-800">
                    {file.original_name}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {file.mime_type} - {formatSize(file.size_bytes)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {validationMessage ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {validationMessage}
        </p>
      ) : null}
    </section>
  );
}
