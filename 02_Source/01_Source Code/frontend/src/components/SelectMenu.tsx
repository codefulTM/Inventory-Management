import React from 'react';

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
}) => {
  return (
    <div className={className}>
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
  );
};

export default SelectMenu;
