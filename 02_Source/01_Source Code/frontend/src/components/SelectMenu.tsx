import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

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
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [portalStyle, setPortalStyle] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => setLocalSearch(searchValue ?? ""), [searchValue]);

  // debounce live-search: call onSearchChange after typing stops
  const onSearchChangeRef = useRef<((q: string) => void) | null>(null);
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange ?? null;
  }, [onSearchChange]);

  useEffect(() => {
    const t = setTimeout(() => {
      const fn = onSearchChangeRef.current;
      if (fn) fn(localSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  // close when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      const target = e.target as Node;
      const insideRoot = rootRef.current.contains(target);
      const insideDropdown = dropdownRef.current
        ? dropdownRef.current.contains(target)
        : false;
      if (!insideRoot && !insideDropdown) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = items.find((it) => String(it.id) === String(value));

  // local filtering for better UX when backend doesn't perform search
  const normalize = (s: string) =>
    (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const q = (normalize(localSearch) || "").trim();
  const displayedItems = q
    ? items.filter((it) => normalize(it.label || "").includes(q))
    : items;

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

  // handle keyboard even when dropdown is rendered in a portal
  useEffect(() => {
    if (!open) return;
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        setHighlighted((p) =>
          Math.min(p + 1, Math.max(0, displayedItems.length - 1)),
        );
        e.preventDefault();
        scrollHighlightedIntoView();
      } else if (e.key === "ArrowUp") {
        setHighlighted((p) => Math.max(p - 1, 0));
        e.preventDefault();
        scrollHighlightedIntoView();
      } else if (e.key === "Enter") {
        if (highlighted >= 0 && highlighted < displayedItems.length) {
          handleSelect(displayedItems[highlighted]);
        } else if (onSearch) {
          onSearch(localSearch);
        }
        e.preventDefault();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, [open, displayedItems, highlighted, localSearch, onSearch]);

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

  useEffect(() => {
    if (!open) return;
    function update() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const margin = 8; // keep a small gap from screen edges
      let width = Math.round(rect.width);
      const maxWidth = Math.floor(window.innerWidth - margin * 2);
      if (width > maxWidth) width = maxWidth;
      let left = Math.round(rect.left + window.scrollX);
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - width - margin);
      }
      setPortalStyle({
        top: rect.bottom + window.scrollY,
        left,
        width,
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // when opening, highlight current selected item (if any)
  useEffect(() => {
    if (!open) return;
    const idx = displayedItems.findIndex(
      (it) => String(it.id) === String(value),
    );
    setHighlighted(idx >= 0 ? idx : -1);
  }, [open, displayedItems, value]);

  return (
    <div ref={rootRef} className={`${className} relative`}>
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
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: portalStyle.top,
              left: portalStyle.left,
              width: portalStyle.width,
              maxWidth: `calc(100vw - 16px)`,
              boxSizing: "border-box",
              zIndex: 9999,
            }}
            className="bg-white border rounded shadow-md flex flex-col"
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
              className="max-h-56 overflow-auto p-1"
              role="listbox"
              tabIndex={-1}
            >
              {loading ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  Đang tải...
                </div>
              ) : displayedItems.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  Không có kết quả
                </div>
              ) : (
                displayedItems.map((it, i) => (
                  <div
                    key={String(it.id)}
                    data-item-index={i}
                    role="option"
                    aria-selected={String(it.id) === String(value)}
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => handleSelect(it)}
                    className={`px-2 py-2 cursor-pointer hover:bg-gray-100 break-words ${String(it.id) === String(value) ? "bg-gray-100 font-medium" : highlighted === i ? "bg-gray-50" : ""}`}
                  >
                    {it.label}
                  </div>
                ))
              )}
            </div>

            {showPagination && (
              <div className="p-2 border-t flex flex-wrap items-center justify-between text-sm gap-2">
                <div className="flex flex-wrap items-center gap-2">
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
                      value={String(page)}
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
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SelectMenu;
