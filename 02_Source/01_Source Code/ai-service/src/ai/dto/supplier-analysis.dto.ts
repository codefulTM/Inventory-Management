// DTO và Interface cho nghiệp vụ phân tích nhà cung cấp
// Bao gồm: Filter (từ ngày đến ngày), Dữ liệu NCC, và Response từ AI
import { IsOptional, IsString } from 'class-validator';

// DTO cho query params lọc dữ liệu phân tích NCC theo thời gian
export class SupplierAnalysisFilterDto {
  @IsOptional() // Từ ngày (định dạng YYYY-MM-DD)
  @IsString()
  from?: string;

  @IsOptional() // Đến ngày (định dạng YYYY-MM-DD)
  @IsString()
  to?: string;
}

// Interface mô tả dữ liệu hiệu suất của một nhà cung cấp từ QC
export interface SupplierPerformanceRecord {
  supplier_name: string; // Tên nhà cung cấp
  total_batches: number; // Tổng số lô hàng đã nhận
  approved: number; // Số lô đạt chất lượng (QC passed)
  rejected: number; // Số lô không đạt chất lượng (QC failed)
  quality_rate: number; // Tỷ lệ chất lượng (% đạt = approved/total_batches * 100)
}

// DTO phản hồi kết quả phân tích từ AI
export class SupplierAnalysisResponseDto {
  success: boolean; // Trạng thái phân tích thành công hay thất bại
  analysis: string; // Nội dung phân tích bằng tiếng Việt từ AI
  suppliers_analyzed: number; // Số lượng NCC đã được phân tích
  timestamp: string; // Thời điểm phân tích (ISO format)
  model_used: string; // Tên model AI đã sử dụng (HuggingFace)
}
