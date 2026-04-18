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
      const merged = [...items, ...next];
      setItems(merged);
      onChange(merged);
    },
    [items, onChange],
  );

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex gap-2 mt-2">
        {items.map((it) => (
          <div key={it.id} className="w-28 border border-gray-200 p-2">
            {it.preview ? (
              <img src={it.preview} alt="preview" className="w-full" />
            ) : (
              <div className="text-sm">{it.file.name}</div>
            )}
            <div className="text-xs text-gray-500">
              {(it.file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
