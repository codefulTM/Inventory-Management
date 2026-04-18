export const getStatusColor = (status: string) => {
  switch (status) {
    case "Accepted":
      return "bg-green-100 text-green-700";
    case "Quarantine":
      return "bg-yellow-100 text-yellow-700";
    case "Rejected":
      return "bg-orange-100 text-orange-700";
    case "Depleted":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

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
