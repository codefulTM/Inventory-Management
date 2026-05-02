// File: components/material/components/MaterialSearch.tsx
// Component tìm kiếm vật tư với tính năng debounce (tránh gọi API quá nhiều)
// Hỗ trợ tìm kiếm theo tên, mã ID, hoặc mã phần (tối thiểu 2 ký tự)
// Hỗ trợ lọc nhanh theo loại vật tư (Material Type) qua các nút filter
// Sử dụng hook useMaterialSearch để quản lý state tìm kiếm, lọc và phân trang

import React, { useState } from "react";
import type { MaterialType } from "../../../types/material";
import { useMaterialSearch } from "../../../hooks";

// Props cho component MaterialSearch
interface MaterialSearchProps {
  // Callback khi người dùng click chọn một kết quả tìm kiếm
  // Trả về ID của vật tư được chọn
  onResultSelect?: (resultId: string) => void;
}

// Danh sách các loại vật tư có thể lọc nhanh qua nút
const MATERIAL_TYPES: MaterialType[] = [
  "API",
  "Excipient",
  "Dietary Supplement",
  "Container",
  "Closure",
  "Testing Material",
];

// Component chính MaterialSearch
export const MaterialSearch: React.FC<MaterialSearchProps> = ({
  onResultSelect,
}) => {
  // State lưu giá trị input tìm kiếm (chưa debounce)
  const [inputValue, setInputValue] = useState("");
  
  // Sử dụng hook useMaterialSearch với limit 500 items cho kết quả tìm kiếm
  const {
    results,        // Mảng kết quả tìm kiếm trả về từ API
    total,         // Tổng số lượng kết quả tìm thấy
    loading,       // Trạng thái đang gọi API
    error,         // Lỗi nếu có khi tìm kiếm
    search,        // Hàm tìm kiếm theo từ khóa
    filterByType, // Hàm lọc kết quả theo loại vật tư
    clear,         // Hàm xóa toàn bộ kết quả và trạng thái tìm kiếm
    hasNextPage,   // Có trang tiếp theo trong kết quả
    hasPreviousPage, // Có trang trước đó trong kết quả
    nextPage,      // Hàm chuyển sang trang tiếp theo
    previousPage,  // Hàm quay về trang trước đó
    page,          // Trang hiện tại
    limit,         // Số lượng kết quả mỗi trang
  } = useMaterialSearch(500);

  // Xử lý thay đổi giá trị input tìm kiếm
  // Gọi API khi người dùng nhập đủ 2 ký tự
  // Xóa kết quả khi input rỗng
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim().length >= 2) {
      search(value);
    } else if (value.trim().length === 0) {
      clear();
    }
  };

  // Xử lý lọc kết quả theo loại vật tư
  // Khi lọc theo loại, xóa input tìm kiếm và gọi filterByType
  const handleTypeFilter = (type: MaterialType) => {
    setInputValue("");
    filterByType(type);
  };

  // Xử lý xóa toàn bộ: xóa input và clear kết quả tìm kiếm
  const handleClear = () => {
    setInputValue("");
    clear();
  };

  // Xử lý khi người dùng click vào một kết quả tìm kiếm
  const handleResultClick = (resultId: string) => {
    if (onResultSelect) {
      onResultSelect(resultId);
    }
  };

  // Kiểm tra có kết quả tìm kiếm không
  const hasResults = results.length > 0;
  // Kiểm tra đang trong quá trình tìm kiếm (có input hoặc đã có kết quả)
  const isSearching =
    inputValue.trim().length >= 2 ||
    (total > 0 && results.length === 0 && loading);

  return (
    // Container chính với nền trắng, bo góc và bóng đổ
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-5 py-5 border-b border-gray-200">
        {/* Ô TÌM KIẾM VÀ BỘ LỌC */}
        <div className="relative mb-4">
          {/* Input tìm kiếm - chỉ gọi API khi nhập đủ 2 ký tự */}
          <input
            type="text"
            placeholder="Tìm theo tên, mã ID, hoặc mã phần (tối thiểu 2 ký tự)..."
            value={inputValue}
            onChange={handleSearchChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-600 focus:shadow-md focus:shadow-blue-100"
            autoComplete="off"
          />
          {/* Nút xóa từ khóa tìm kiếm (chỉ hiển thị khi có input) */}
          {inputValue && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-lg text-gray-400 cursor-pointer px-2 py-1 transition-colors hover:text-gray-800"
              onClick={handleClear}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* CÁC NÚT LỌC NHANH THEO LOẠI VẬT TƯ */}
        <div className="flex flex-wrap gap-2">
          {/* Nút "Tất cả loại" - xóa bộ lọc, hiển thị mặc định */}
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border ${inputValue === "" && total === 0 ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 hover:border-gray-600"}`}
            onClick={handleClear}
            title="Hiển thị tất cả loại"
          >
            Tất cả loại
          </button>
          {/* Các nút lọc theo từng loại vật tư */}
          {MATERIAL_TYPES.map((type) => (
            <button
              key={type}
              className="px-3 py-1.5 white-space-nowrap bg-gray-100 text-gray-600 border border-gray-300 rounded-full text-xs font-medium cursor-pointer transition-all hover:bg-gray-200 hover:border-gray-600"
              onClick={() => handleTypeFilter(type)}
              title={`Lọc theo ${type}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* HIỂN THỊ LỖI NẾU CÓ */}
      {error && (
        <div className="px-5 py-4 border-t border-gray-200 bg-red-50 text-red-600 text-sm">
          <p>Tìm kiếm thất bại: {error.message}</p>
        </div>
      )}

      {/* HIỂN THỊ TRẠNG THÁI ĐANG TẢI */}
      {isSearching && loading && !hasResults && (
        <div className="px-5 py-8 text-center text-gray-400">
          <p>Đang tìm kiếm...</p>
        </div>
      )}

      {/* HIỂN THỊ KẾT QUẢ TÌM KIẾM */}
      {hasResults && (
        <div className="px-0 py-5 pb-5">
          {/* Tiêu đề và tổng số kết quả */}
          <div className="flex justify-between items-center mb-4 px-5 py-4 border-t border-gray-200">
            <h3 className="m-0 text-lg text-gray-800">Kết quả tìm kiếm</h3>
            <span className="text-sm text-gray-400">
              Tìm thấy {total} kết quả
            </span>
          </div>

          {/* DANH SÁCH CÁC VẬT TƯ TÌM ĐƯỢC */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto px-5">
            {results.map((material) => (
              <div
                key={material._id}
                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-600 hover:shadow-md hover:shadow-blue-100"
                onClick={() => handleResultClick(material._id)}
              >
                <div className="flex gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {/* Hiển thị mã vật tư */}
                    <code className="block bg-blue-100 px-2 py-1 rounded text-xs font-mono text-red-600 whitespace-nowrap">
                      {material.material_id}
                    </code>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 font-bold text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
                      {material.material_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Mã phần: <strong>{material.part_number}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {/* Badge hiển thị loại vật tư */}
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                    {material.material_type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* PHÂN TRANG KẾT QUẢ TÌM KIẾM */}
          {(hasNextPage || hasPreviousPage) && (
            <div className="flex items-center gap-4 justify-center mt-4 px-5">
              <button
                onClick={previousPage}
                disabled={!hasPreviousPage || loading}
                className="px-3 py-1.5 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Trước
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} ({Math.min(limit, results.length)} / {total})
              </span>
              <button
                onClick={nextPage}
                disabled={!hasNextPage || loading}
                className="px-3 py-1.5 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      )}

      {/* THÔNG BÁO CHƯA CÓ TÌM KIẾM */}
      {inputValue === "" && total === 0 && !loading && !error && (
        <div className="px-5 py-8 text-center text-gray-400">
          <p>Nhập từ khóa hoặc chọn loại vật tư để bắt đầu</p>
        </div>
      )}
    </div>
  );
};

export default MaterialSearch;
