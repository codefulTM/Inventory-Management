import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { InventoryAuditReportStatus } from '../../schemas/inventory-audit-report.schema';

/**
 * DTO dùng để validate tham số query khi lấy danh sách báo cáo kiểm kê
 * Sử dụng class-validator để kiểm tra dữ liệu từ query string
 */
export class QueryInventoryAuditReportDto {
  @Type(() => Number)                  // Chuyển đổi tự động sang number
  @IsInt()                            // Phải là số nguyên
  @Min(1)                            // Tối thiểu là 1
  @IsOptional()                       // Có thể không truyền
  page?: number;                     // Số trang (mặc định: 1)

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)                          // Tối đa 100 bản ghi/trang
  @IsOptional()
  limit?: number;                    // Số bản ghi trên một trang (mặc định: 20)

  @IsOptional()
  @IsEnum(InventoryAuditReportStatus) // Phải là một trong các giá trị enum
  status?: InventoryAuditReportStatus; // Lọc theo trạng thái (PENDING, PROCESSING, READY, FAILED)

  @IsOptional()
  @IsString()
  requested_by?: string;             // Lọc theo người yêu cầu báo cáo

  @IsOptional()
  @IsDateString()                    // Phải là chuỗi ngày hợp lệ (ISO 8601)
  from?: string;                     // Lọc từ ngày tạo (định dạng ISO string)

  @IsOptional()
  @IsDateString()
  to?: string;                       // Lọc đến ngày tạo (định dạng ISO string)
}
