// =============================================================================
// File: reports/dto/qc-performance-report.dto.ts
// Mục đích: Định nghĩa DTO cho báo cáo hiệu suất kiểm tra chất lượng (QC)
// 
// Sử dụng: Trả về từ ReportsService.getQcPerformanceReport()
// -----------------------------------------------------------------------------
// QcPerformanceItemDto: Thống kê QC cho một nhà cung cấp
// - supplier_name: Tên nhà cung cấp
// - approved: Số lượng QC Passed/Accepted
// - rejected: Số lượng QC Failed/Rejected
// - quality_rate: Tỷ lệ chất lượng (%) = (approved / (approved + rejected)) * 100
//
// QcPerformanceReportDto: Toàn bộ báo cáo
// - generated_at: Thời điểm tạo báo cáo
// - items: Danh sách xếp hạng theo nhà cung cấp
// =============================================================================

export class QcPerformanceItemDto {
  supplier_name: string;
  approved: number;
  rejected: number;
  quality_rate: number;
}

export class QcPerformanceReportDto {
  generated_at: Date;
  items: QcPerformanceItemDto[];
}
