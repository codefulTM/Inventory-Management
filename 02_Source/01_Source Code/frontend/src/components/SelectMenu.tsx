import React, { useEffect, useState } from 'react';

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
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const SelectMenu: React.FC<Props> = ({
  items,
  value,
  onChange,
  className = '',
  name,
  disabled,
  placeholder,
  label,
  showSearch = false,
  searchValue,
  onSearchChange,
  onSearch,
  searchPlaceholder = 'Tìm...',
  showPagination = false,
  page = 1,
  totalPages,
  onPageChange,
  onPrev,
  onNext,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue ?? '');

  useEffect(() => setLocalSearch(searchValue ?? ''), [searchValue]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (onSearch) onSearch(localSearch);
  };

  const handlePrev = () => {
    if (onPrev) return onPrev();
    if (onPageChange && page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (onNext) return onNext();
    if (onPageChange && totalPages && page < totalPages) onPageChange(page + 1);
  };

  return (
    <div className={`${className} flex items-center gap-2`}>
      {showSearch && (
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            className="px-2 py-1 border rounded"
          />
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">
            Tìm
          </button>
        </form>
      )}

      <div>
        {label && <label className="block text-sm font-medium mb-1">{label}</label>}
        <select
          name={name}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          className="px-2 py-1 border rounded"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {items.map((it) => (
            <option key={String(it.id)} value={String(it.id)}>
              {it.label}
            </option>
          ))}
        </select>
      </div>

      {showPagination && (
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={page <= 1 || (totalPages !== undefined && totalPages <= 1)}
            className="px-2 py-1 border rounded"
          >
            ←
          </button>

          {totalPages ? (
            <select
              value={page}
              onChange={(e) => onPageChange && onPageChange(Number(e.target.value))}
              className="px-2 py-1 border rounded"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <span className="px-2 py-1">Trang {page}</span>
          )}

          <button
            onClick={handleNext}
            disabled={totalPages !== undefined ? page >= totalPages : false}
            className="px-2 py-1 border rounded"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default SelectMenu;
