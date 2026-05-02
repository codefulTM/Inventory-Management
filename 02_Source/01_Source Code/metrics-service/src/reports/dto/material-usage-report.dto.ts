// =============================================================================
// File: reports/dto/material-usage-report.dto.ts
// Mục đích: Định nghĩa DTO cho báo cáo sử dụng nguyên liệu
// 
// Sử dụng: Trả về từ ReportsService.getMaterialUsageReport()
// -----------------------------------------------------------------------------
// MaterialUsageItemDto: Thống kê sử dụng cho một nguyên liệu
// - material_id: ID của nguyên liệu
// - transaction_count: Số lượng giao dịch (xuất/nhập) của material này
// - total_quantity: Tổng số lượng đã giao dịch
//
// MaterialUsageReportDto: Toàn bộ báo cáo
// - generated_at: Thời điểm tạo báo cáo
// - from, to: Khoảng thời gian báo cáo (optional)
// - items: Danh sách thống kê theo từng material
// =============================================================================

export class MaterialUsageItemDto {
  material_id: string;
  transaction_count: number;
  total_quantity: number;
}

export class MaterialUsageReportDto {
  generated_at: Date;
  from?: Date;
  to?: Date;
  items: MaterialUsageItemDto[];
}
