// =============================================================================
// File: reports/dto/audit-report.dto.ts
// Mục đích: Định nghĩa DTO cho báo cáo audit trail (lịch sử thay đổi)
// 
// Sử dụng: Trả về từ ReportsService.getAuditReport()
// -----------------------------------------------------------------------------
// AuditEntryDto: Một entry trong audit trail
// - action: Hành động (CREATE, UPDATE, DELETE...)
// - entity: Đối tượng bị tác động (InventoryLot, Material...)
// - performed_by: Người thực hiện hành động
// - performed_at: Thời điểm thực hiện
// - details: Chi tiết bổ sung (optional, dạng key-value)
//
// AuditReportDto: Toàn bộ báo cáo (có phân trang)
// - generated_at: Thời điểm tạo báo cáo
// - entries: Danh sách các audit entries
// =============================================================================

export class AuditEntryDto {
  action: string;
  entity: string;
  performed_by: string;
  performed_at: Date;
  details?: Record<string, unknown>;
}

export class AuditReportDto {
  generated_at: Date;
  entries: AuditEntryDto[];
}
