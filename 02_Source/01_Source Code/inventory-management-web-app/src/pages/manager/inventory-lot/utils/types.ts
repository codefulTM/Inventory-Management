// Định nghĩa kiểu dữ liệu cho form chỉnh sửa lô hàng (Inventory Lot)
// Sử dụng string cho các trường ngày tháng để tương thích với <input type="date">
export type EditFormValues = {
  lot_id: string;                // Mã lô hàng
  material_id: string;            // Mã vật tư
  manufacturer_name: string;        // Tên nhà sản xuất
  manufacturer_lot: string;         // Số lô nhà sản xuất
  supplier_name: string;           // Tên nhà cung cấp
  manufacture_date: string;         // Ngày sản xuất (YYYY-MM-DD)
  received_date: string;            // Ngày nhận hàng (YYYY-MM-DD)
  expiration_date: string;          // Hạn sử dụng (YYYY-MM-DD)
  in_use_expiration_date: string;   // Hạn sau khi mở (YYYY-MM-DD)
  quantity: number;                // Số lượng
  unit_of_measure: string;         // Đơn vị tính (kg, L, piece...)
  storage_location: string;         // Vị trí lưu trữ (bin code)
  status: "Pending" | "Quarantine" | "Accepted" | "Rejected" | "Depleted"; // Trạng thái
  is_sample: boolean;              // Có phải là mẫu QC không
  parent_lot_id: string;           // Mã lô gốc (nếu là mẫu)
  notes: string;                   // Ghi chú
  warehouse_id?: string;           // Mã kho (dùng cho form)
};
