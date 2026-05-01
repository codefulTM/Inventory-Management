import React, { useCallback, useState } from "react";

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);

export interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

export default function AttachmentUploader({
  onChange,
}: {
  onChange: (list: PendingFile[]) => void;
}) {
  const [items, setItems] = useState<PendingFile[]>([]);
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const next: PendingFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!ALLOWED.has(f.type)) continue;
        if (f.size > MAX_ATTACHMENT_SIZE_BYTES) continue;
        const id = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const preview = f.type.startsWith("image/")
          ? URL.createObjectURL(f)
          : undefined;
        next.push({ id, file: f, preview });
      }
      setItems((prev) => {
        const merged = [...prev, ...next];
        onChange(merged);
        return merged;
      });
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      onChange(next);
      return next;
    });
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-md p-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0l4-4m-4 4-4-4"
            />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-700">
              Kéo thả tệp vào đây
            </div>
            <div className="text-xs text-gray-400">hoặc</div>
            <label className="mt-1 inline-block">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded text-sm shadow-sm hover:bg-gray-50">
                Chọn tệp
              </span>
            </label>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Cho phép: JPG, PNG, PDF — tối đa 5MB mỗi tệp
        </div>
      </div>

      <div className="flex gap-3 mt-3 flex-wrap">
        {items.map((it) => (
          <div
            key={it.id}
            className="w-32 border border-gray-200 p-2 rounded relative bg-white"
          >
            {it.preview ? (
              <img
                src={it.preview}
                alt="preview"
                className="w-full h-20 object-cover rounded"
              />
            ) : (
              <div className="text-sm truncate">{it.file.name}</div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {(it.file.size / 1024).toFixed(1)} KB
            </div>
            <button
              type="button"
              onClick={() => removeItem(it.id)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white border text-red-600 flex items-center justify-center text-xs"
              title="Xóa"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
