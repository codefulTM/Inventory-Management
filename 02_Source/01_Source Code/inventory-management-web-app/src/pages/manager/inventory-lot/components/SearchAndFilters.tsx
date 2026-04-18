import { Search, Filter, Download, Edit } from "lucide-react";

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAdd?: () => void;
}

export function SearchAndFilters({
  searchTerm,
  onSearchChange,
  onAdd,
}: SearchAndFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã lô hàng hoặc tên nhà sản xuất..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2 transition">
          <Filter size={20} />
          <span>Bộ lọc</span>
        </button>
        <button className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 transition">
          <Download size={20} />
          <span>Xuất Excel</span>
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center space-x-2 transition"
        >
          <Edit size={20} />
          <span>Thêm</span>
        </button>
      </div>
    </div>
  );
}
