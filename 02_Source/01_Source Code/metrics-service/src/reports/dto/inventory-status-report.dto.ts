// =============================================================================
// File: reports/dto/inventory-status-report.dto.ts
// Mục đích: Định nghĩa DTO (Data Transfer Object) cho báo cáo trạng thái inventory
// 
// Sử dụng: Trả về từ ReportsService.getInventoryStatusReport()
// -----------------------------------------------------------------------------
// InventoryStatusItemDto: Thông tin của một inventory lot
// - material_id: ID của nguyên liệu
// - lot_id: ID của lô hàng
// - quantity: Số lượng trong lô
// - status: Trạng thái (Accepted, Quarantine, Rejected...)
// - expiration_date: Ngày hết hạn (optional)
//
// InventoryStatusReportDto: Toàn bộ báo cáo
// - generated_at: Thời điểm tạo báo cáo
// - total_lots: Tổng số lô hàng
// - items: Danh sách chi tiết các lô
// =============================================================================

export class InventoryStatusItemDto {
  material_id: string;
  lot_id: string;
  quantity: number;
  status: string;
  expiration_date?: Date;
}

export class InventoryStatusReportDto {
  generated_at: Date;
  total_lots: number;
  items: InventoryStatusItemDto[];
}
