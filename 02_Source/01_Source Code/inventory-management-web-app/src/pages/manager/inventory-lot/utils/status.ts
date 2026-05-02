/**
 * Lấy màu nền và chữ tương ứng với trạng thái lô hàng
 * @param status - Trạng thái lô hàng
 * @returns Class CSS tương ứng
 */
export const getStatusColor = (status: string) => {
  switch (status) {
    case "Accepted":
      return "bg-green-100 text-green-700";    // Bình thường - xanh lá
    case "Quarantine":
      return "bg-yellow-100 text-yellow-700";  // Sắp hết hạn - vàng
    case "Rejected":
      return "bg-orange-100 text-orange-700";   // Từ chối - cam
    case "Depleted":
      return "bg-red-100 text-red-700";       // Hết hàng - đỏ
    default:
      return "bg-gray-100 text-gray-700";       // Không xác định - xám
  }
};

/**
 * Lấy văn bản tiếng Việt tương ứng với trạng thái lô hàng
 * @param status - Trạng thái lô hàng
 * @returns Tên trạng thái tiếng Việt
 */
export const getStatusText = (status: string) => {
  switch (status) {
    case "Accepted":
      return "Bình thường";
    case "Quarantine":
      return "Sắp hết hạn";
    case "Rejected":
      return "Từ chối";
    case "Depleted":
      return "Hết hàng";
    default:
      return "Không xác định";
  }
};
