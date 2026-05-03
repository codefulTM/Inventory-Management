import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO dùng để validate query params khi lấy danh sách Bin Worklist
 * Sử dụng class-validator để kiểm tra dữ liệu từ query string
 */
export class BinWorklistQueryDto {
  @IsOptional()
  @IsString()
  warehouse_id?: string; // Lọc theo mã kho (tùy chọn)

  @IsOptional()
  @IsString()
  q?: string;            // Từ khóa tìm kiếm theo bin_code hoặc location_name

  @IsOptional()
  @Type(() => Number)    // Tự động chuyển đổi sang number
  @IsNumber()
  page?: number;         // Số trang (mặc định: 1)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;        // Số bản ghi/trang (mặc định: 50)
}

/**
 * DTO cho một entry trong kết quả đếm tồn kho tại bin
 * Mỗi entry tương ứng với một lô hàng (lot) được đếm
 */
export class BinCountEntryDto {
  @IsOptional()
  @IsString()
  lot_id?: string;        // Mã lô hàng (nếu biết)

  @IsOptional()
  @IsString()
  material_id?: string;   // Mã vật tư (nếu biết)

  @IsNumber()
  counted_qty: number;    // Số lượng thực tế đếm được

  @IsOptional()
  @IsString()
  notes?: string;         // Ghi chú cho entry này
}

/**
 * DTO dùng để validate dữ liệu gửi lên khi submit kết quả đếm tồn kho
 * Bao gồm thông tin người đếm và danh sách các entry đếm được
 */
export class SubmitBinCountDto {
  @IsString()
  counted_by: string;      // Người thực hiện đếm (username hoặc ID)

  @IsOptional()
  @IsString()
  notes?: string;          // Ghi chú chung cho lần đếm

  @IsArray()                // Phải là mảng
  @ValidateNested({ each: true }) // Validate từng phần tử trong mảng
  @Type(() => BinCountEntryDto) // Chuyển đổi sang BinCountEntryDto
  entries: BinCountEntryDto[]; // Danh sách các lô hàng đã đếm
}
