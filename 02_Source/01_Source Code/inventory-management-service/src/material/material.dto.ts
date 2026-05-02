import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MaxLength,
  IsOptional,
  MinLength,
} from 'class-validator';

/**
 * Enum định nghĩa các loại vật tư trong hệ thống
 * - API: Active Pharmaceutical Ingredient (hoạt chất)
 * - EXCIPIENT: Tá dược (phụ liệu trong dược phẩm)
 * - DIETARY_SUPPLEMENT: Thực phẩm chức năng
 * - CONTAINER: Bao bì chứa đựng
 * - CLOSURE: Nắp đậy, seal
 * - PROCESS_CHEMICAL: Hóa chất quá trình sản xuất
 * - TESTING_MATERIAL: Vật tư dùng để kiểm nghiệm
 */
export enum MaterialType {
  API = 'API',
  EXCIPIENT = 'Excipient',
  DIETARY_SUPPLEMENT = 'Dietary Supplement',
  CONTAINER = 'Container',
  CLOSURE = 'Closure',
  PROCESS_CHEMICAL = 'Process Chemical',
  TESTING_MATERIAL = 'Testing Material',
}

/**
 * Enum định nghĩa trạng thái của vật tư
 * - PENDING: Chờ phê duyệt
 * - APPROVED: Đã được phê duyệt, có thể sử dụng
 * - REJECTED: Bị từ chối, không thể sử dụng
 */
export enum MaterialStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

/**
 * CreateMaterialDto - DTO dùng để tạo mới vật tư
 * 
 * Validation:
 * - material_id: Tự động sinh bởi Redis nếu không cung cấp (format: MAT-XXX)
 * - part_number: Bắt buộc, duy nhất, tối đa 20 ký tự
 * - material_name: Bắt buộc, tối đa 100 ký tự
 * - material_type: Bắt buộc, phải thuộc MaterialType enum
 * - status: Tùy chọn, mặc định là PENDING
 * - storage_conditions: Tùy chọn, tối đa 100 ký tự
 * - specification_document: Tùy chọn, tối đa 50 ký tự
 * 
 * Sử dụng cho: POST /materials
 */
export class CreateMaterialDto {
  @IsOptional()
  @IsString({ message: 'material_id phải là chuỗi' })
  @MaxLength(20, { message: 'material_id không được vượt quá 20 ký tự' })
  material_id?: string; // Tự động sinh bởi Redis nếu không cung cấp

  @IsString({ message: 'part_number phải là chuỗi' })
  @IsNotEmpty({ message: 'part_number là bắt buộc' })
  @MinLength(1, { message: 'part_number không được để trống' })
  @MaxLength(20, { message: 'part_number không được vượt quá 20 ký tự' })
  part_number: string;

  @IsString({ message: 'material_name phải là chuỗi' })
  @IsNotEmpty({ message: 'material_name là bắt buộc' })
  @MinLength(1, { message: 'material_name không được để trống' })
  @MaxLength(100, { message: 'material_name không được vượt quá 100 ký tự' })
  material_name: string;

  @IsEnum(MaterialType, {
    message: `material_type phải là một trong: ${Object.values(MaterialType).join(', ')}`,
  })
  @IsNotEmpty({ message: 'material_type là bắt buộc' })
  material_type: MaterialType | string;

  @IsEnum(MaterialStatus, {
    message: `status phải là một trong: ${Object.values(MaterialStatus).join(', ')}`,
  })
  @IsOptional()
  status?: MaterialStatus | string;

  @IsString({ message: 'storage_conditions phải là chuỗi' })
  @IsOptional()
  @MaxLength(100, {
    message: 'storage_conditions không được vượt quá 100 ký tự',
  })
  storage_conditions?: string;

  @IsString({ message: 'specification_document phải là chuỗi' })
  @IsOptional()
  @MaxLength(50, {
    message: 'specification_document không được vượt quá 50 ký tự',
  })
  specification_document?: string;
}

/**
 * UpdateMaterialDto - DTO dùng để cập nhật vật tư
 * 
 * Tất cả các trường đều là tùy chọn (partial update)
 * Chỉ cần gửi các trường cần cập nhật
 * 
 * Sử dụng cho: PUT /materials/:id
 */
export class UpdateMaterialDto {
  @IsString({ message: 'material_name phải là chuỗi' })
  @IsOptional()
  @MinLength(1, { message: 'material_name không được để trống nếu cung cấp' })
  @MaxLength(100, { message: 'material_name không được vượt quá 100 ký tự' })
  material_name?: string;

  @IsEnum(MaterialType, {
    message: `material_type phải là một trong: ${Object.values(MaterialType).join(', ')}`,
  })
  @IsOptional()
  material_type?: MaterialType | string;

  @IsEnum(MaterialStatus, {
    message: `status phải là một trong: ${Object.values(MaterialStatus).join(', ')}`,
  })
  @IsOptional()
  status?: MaterialStatus | string;

  @IsString({ message: 'storage_conditions phải là chuỗi' })
  @IsOptional()
  @MaxLength(100, {
    message: 'storage_conditions không được vượt quá 100 ký tự',
  })
  storage_conditions?: string;

  @IsString({ message: 'specification_document phải là chuỗi' })
  @IsOptional()
  @MaxLength(50, {
    message: 'specification_document không được vượt quá 50 ký tự',
  })
  specification_document?: string;
}

/**
 * MaterialResponseDto - DTO dùng để trả về thông tin vật tư cho client
 * 
 * Chứa đầy đủ thông tin của một vật tư:
 * - _id: MongoDB ObjectId (dạng string)
 * - material_id: Business ID (MAT-XXX)
 * - part_number: Mã part number
 * - material_name: Tên vật tư
 * - material_type: Loại vật tư
 * - storage_conditions: Điều kiện bảo quản
 * - specification_document: Tài liệu thông số kỹ thuật
 * - created_date: Ngày tạo
 * - modified_date: Ngày cập nhật
 * - created_by: Người tạo
 * - approved_by: Người phê duyệt
 * - status: Trạng thái
 */
export class MaterialResponseDto {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  created_date: Date;
  modified_date: Date;
  created_by?: string;
  approved_by?: string;
  status?: string;
}

/**
 * PaginatedMaterialResponseDto - DTO trả về danh sách vật tư có phân trang
 * 
 * Bao gồm:
 * - data: Mảng các MaterialResponseDto
 * - pagination: Thông tin phân trang (page, limit, total, totalPages)
 */
export class PaginatedMaterialResponseDto {
  data: MaterialResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
