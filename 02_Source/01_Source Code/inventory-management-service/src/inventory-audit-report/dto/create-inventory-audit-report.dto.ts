import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO dùng để validate dữ liệu khi tạo mới báo cáo kiểm kê
 * Sử dụng class-validator để kiểm tra dữ liệu đầu vào từ request body
 */
export class CreateInventoryAuditReportDto {
  @IsDateString()                    // Phải là chuỗi ngày hợp lệ (ISO 8601)
  period_from: string;               // Từ ngày (định dạng ISO string)

  @IsDateString()
  period_to: string;                 // Đến ngày (định dạng ISO string)

  @IsOptional()                       // Có thể không truyền
  @IsArray()                          // Phải là mảng
  @ArrayMaxSize(50)                   // Tối đa 50 kho
  @IsString({ each: true })           // Mỗi phần tử trong mảng phải là string
  scope_warehouse_ids?: string[];    // Danh sách mã kho cần báo cáo (tùy chọn)

  @IsOptional()
  @IsBoolean()                        // Phải là boolean
  @Type(() => Boolean)               // Tự động chuyển đổi từ string sang boolean
  include_zero_balance?: boolean;    // Có bao gồm các lô có số lượng = 0 không

  @IsOptional()
  @IsString()
  @MaxLength(50)                     // Tối đa 50 ký tự
  report_template_code?: string;     // Mã mẫu báo cáo (mặc định: STATUTORY_V1)

  @IsOptional()
  @IsString()
  @MaxLength(80)
  signer_profile_id?: string;        // ID profile người ký (dùng cho chữ ký số)

  @IsOptional()
  @IsString()
  @MaxLength(500)                    // Tối đa 500 ký tự
  note?: string;                     // Ghi chú thêm cho báo cáo

  @IsOptional()
  @IsString()
  @IsNotEmpty()                      // Không được rỗng nếu có truyền
  @MaxLength(50)
  approved_by?: string;              // Người phê duyệt báo cáo
}
