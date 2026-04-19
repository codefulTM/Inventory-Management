import React, { useEffect, useState, useRef } from "react";

export type SelectItem = { id: string | number; label: string };

interface Props {
  items: SelectItem[];
  value?: string | number;
  onChange?: (id: string | number) => void;
  className?: string;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  // Search
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  // Pagination
  showPagination?: boolean;
  // styling
  selectClassName?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  loading?: boolean;
}

const SelectMenu: React.FC<Props> = ({
  items,
  value,
  onChange,
  className = "",
  name,
  disabled,
  placeholder,
  label,
  showSearch = false,
  searchValue,
  onSearchChange,
  onSearch,
  searchPlaceholder = "Tìm...",
  showPagination = false,
  selectClassName = "px-2 py-1 border rounded",
  page = 1,
  totalPages,
  onPageChange,
  onPrev,
  onNext,
  loading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchValue ?? "");
  const [highlighted, setHighlighted] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setLocalSearch(searchValue ?? ""), [searchValue]);

  // debounce live-search: call onSearchChange after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      if (onSearchChange) onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  // close when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = items.find((it) => String(it.id) === String(value));

  const toggleOpen = () => setOpen((s) => !s);

  const handleSelect = (it: SelectItem) => {
    onChange && onChange(it.id);
    setOpen(false);
  };

  const scrollHighlightedIntoView = () => {
    try {
      if (!listRef.current) return;
      const el = listRef.current.querySelectorAll("[data-item-index]")[
        highlighted
      ] as HTMLElement | undefined;
      if (el) el.scrollIntoView({ block: "nearest" });
    } catch (e) {
      /* ignore */
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setHighlighted((p) => Math.min(p + 1, items.length - 1));
      e.preventDefault();
      scrollHighlightedIntoView();
    } else if (e.key === "ArrowUp") {
      setHighlighted((p) => Math.max(p - 1, 0));
      e.preventDefault();
      scrollHighlightedIntoView();
    } else if (e.key === "Enter") {
      if (highlighted >= 0 && highlighted < items.length) {
        handleSelect(items[highlighted]);
      } else if (onSearch) {
        onSearch(localSearch);
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handlePrev = () => {
    if (onPrev) return onPrev();
    if (onPageChange && page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (onNext) return onNext();
    if (onPageChange && totalPages && page < totalPages) onPageChange(page + 1);
  };

  const handlePageInputChange = (raw: string) => {
    const num = Number(raw || 0);
    if (!Number.isFinite(num) || num < 1) return;
    if (totalPages && num > totalPages) return;
    if (onPageChange) onPageChange(num);
  };

  return (
    <div
      ref={rootRef}
      className={`${className} relative`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        className={`w-full text-left px-2 py-2 border rounded flex justify-between items-center ${selectClassName}`}
      >
        <span>{selected ? selected.label : (placeholder ?? "")}</span>
        <span className="ml-2 text-sm">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-1 z-50 bg-white border rounded shadow-md flex flex-col"
          role="dialog"
        >
          {showSearch && (
            <div className="p-2 border-b">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (onSearch) onSearch(localSearch);
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
          )}

          <div
            ref={listRef}
            className="max-h-48 overflow-auto p-1"
            role="listbox"
            tabIndex={-1}
          >
            {loading ? (
              <div className="p-3 text-center text-sm text-gray-500">
                Đang tải...
              </div>
            ) : items.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">
                Không có kết quả
              </div>
            ) : (
              items.map((it, i) => (
                <div
                  key={String(it.id)}
                  data-item-index={i}
                  role="option"
                  aria-selected={String(it.id) === String(value)}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => handleSelect(it)}
                  className={`px-2 py-2 cursor-pointer hover:bg-gray-100 ${String(it.id) === String(value) ? "bg-gray-100 font-medium" : highlighted === i ? "bg-gray-50" : ""}`}
                >
                  {it.label}
                </div>
              ))
            )}
          </div>

          {showPagination && (
            <div className="p-2 border-t flex items-center justify-between text-sm gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={
                    page <= 1 || (totalPages !== undefined && totalPages <= 1)
                  }
                  className="px-2 py-1 border rounded"
                  aria-label="Trang trước"
                >
                  ←
                </button>

                <div className="px-2 py-1 border rounded text-xs flex items-center gap-2">
                  <span>Trang</span>
                  <input
                    value={page}
                    onChange={(e) => handlePageInputChange(e.target.value)}
                    className="w-12 text-center bg-transparent outline-none text-sm"
                    aria-label="Số trang"
                  />
                  <span>/ {totalPages ?? 1}</span>
                </div>

                <button
                  onClick={handleNext}
                  disabled={
                    totalPages !== undefined ? page >= totalPages : false
                  }
                  className="px-2 py-1 border rounded"
                  aria-label="Trang sau"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectMenu;
