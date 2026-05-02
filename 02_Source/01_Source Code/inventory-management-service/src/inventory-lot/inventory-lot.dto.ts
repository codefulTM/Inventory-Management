import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDate,
  IsBoolean,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Enum định nghĩa trạng thái của lô hàng (Inventory Lot)
 * - QUARANTINE: Cách ly - lô hàng mới nhập, chờ kiểm tra chất lượng
 * - ACCEPTED: Đã chấp nhận - lô hàng đạt chất lượng, có thể sử dụng
 * - REJECTED: Bị từ chối - lô hàng không đạt chất lượng
 * - DEPLETED: Đã cạn - lô hàng đã sử dụng hết
 */
export enum InventoryLotStatus {
  QUARANTINE = 'Quarantine',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  DEPLETED = 'Depleted',
}

/**
 * CreateInventoryLotDto - DTO dùng để tạo mới lô hàng
 * 
 * Các trường bắt buộc:
 * - material_id: ID của vật tư (thuộc Material)
 * - manufacturer_name: Tên nhà sản xuất
 * - manufacturer_lot: Số lô của nhà sản xuất
 * - received_date: Ngày nhận hàng
 * - expiration_date: Ngày hết hạn
 * - status: Trạng thái lô (thường là Quarantine khi mới nhập)
 * - quantity: Số lượng ban đầu
 * - unit_of_measure: Đơn vị tính (kg, g, ml, v.v.)
 * 
 * Các trường tùy chọn:
 * - lot_id: Tự động sinh bởi Redis nếu không cung cấp (format: LOT-XXX)
 * - supplier_name: Tên nhà cung cấp
 * - manufacture_date: Ngày sản xuất
 * - in_use_expiration_date: Ngày hết hạn khi mở bao bì
 * - warehouse_id: ID của kho
 * - storage_location: Vị trí lưu kho cụ thể
 * - is_sample: Có phải là mẫu thử không
 * - parent_lot_id: ID lô cha (nếu là mẫu thử)
 * - notes: Ghi chú
 * 
 * Validation:
 * - received_date phải trước expiration_date
 * - quantity phải > 0
 */
export class CreateInventoryLotDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lot_id?: string; // Tự động sinh bởi Redis nếu không cung cấp

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  material_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  manufacturer_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  manufacturer_lot: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  supplier_name?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  manufacture_date?: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  received_date: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  expiration_date: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  in_use_expiration_date?: Date;

  @IsEnum(InventoryLotStatus)
  @IsNotEmpty()
  status: InventoryLotStatus;

  @IsInt({ message: 'Số lượng phải là số nguyên cụ thể' })
  @Type(() => Number)
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  unit_of_measure: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  warehouse_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  storage_location?: string;

  @IsBoolean()
  @IsOptional()
  is_sample?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  parent_lot_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * UpdateInventoryLotDto - DTO dùng để cập nhật lô hàng
 * 
 * Tất cả các trường đều là tùy chọn (partial update)
 * Khi cập nhật số lượng, hệ thống sẽ tự động tạo InventoryTransaction
 * Khi cập nhật trạng thái, hệ thống sẽ kiểm tra transition hợp lệ
 */
export class UpdateInventoryLotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  material_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  manufacturer_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  manufacturer_lot: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  supplier_name?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  manufacture_date?: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  received_date: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  expiration_date: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  in_use_expiration_date?: Date;

  @IsEnum(InventoryLotStatus)
  @IsNotEmpty()
  status: InventoryLotStatus;

  @IsInt({ message: 'Số lượng phải là số nguyên cụ thể' })
  @Type(() => Number)
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  unit_of_measure: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  warehouse_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  storage_location?: string;

  @IsBoolean()
  @IsOptional()
  is_sample?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  parent_lot_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  qc_by?: string;

  @IsOptional()
  history?: Record<string, any>[];
}

/**
 * InventoryLotResponseDto - DTO trả về thông tin lô hàng cho client
 * 
 * Chứa đầy đủ thông tin của một lô hàng:
 * - lot_id: Business ID (LOT-XXX)
 * - material_id: ID vật tư liên quan
 * - manufacturer_name: Tên nhà sản xuất
 * - manufacturer_lot: Số lô nhà sản xuất
 * - supplier_name: Tên nhà cung cấp
 * - manufacture_date: Ngày sản xuất
 * - received_date: Ngày nhận hàng
 * - expiration_date: Ngày hết hạn
 * - in_use_expiration_date: Hạn sử dụng sau khi mở bao bì
 * - status: Trạng thái lô
 * - quantity: Số lượng hiện tại
 * - unit_of_measure: Đơn vị tính
 * - warehouse_id: ID kho
 * - storage_location: Vị trí lưu kho
 * - is_sample: Có phải mẫu thử
 * - parent_lot_id: ID lô cha (nếu là mẫu)
 * - notes: Ghi chú
 * - created_date, modified_date: Ngày tạo/cập nhật
 * - received_by: Người nhận hàng
 * - qc_by: Người kiểm tra QC
 * - history: Lịch sử thay đổi
 */
export class InventoryLotResponseDto {
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name?: string;
  manufacture_date?: Date;
  received_date: Date;
  expiration_date: Date;
  in_use_expiration_date?: Date;
  status: InventoryLotStatus;
  quantity: number;
  unit_of_measure: string;
  warehouse_id?: string;
  storage_location?: string;
  is_sample: boolean;
  parent_lot_id?: string;
  notes?: string;
  created_date: Date;
  modified_date: Date;
  received_by?: string;
  qc_by?: string;
  history?: Record<string, any>[];
}

/**
 * PaginatedInventoryLotResponse - DTO trả về danh sách lô hàng có phân trang
 */
export class PaginatedInventoryLotResponse {
  data: InventoryLotResponseDto[];
  total: number;
  page: number;
  limit: number;
}

/**
 * InventoryLotSearchParams - Các tham số tìm kiếm/lọc lô hàng
 */
export class InventoryLotSearchParams {
  material_id?: string;
  status?: InventoryLotStatus;
  is_sample?: boolean;
  manufacturer_name?: string;
}
