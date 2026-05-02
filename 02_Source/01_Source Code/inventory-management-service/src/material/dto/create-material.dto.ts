import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';

/**
 * Enum định nghĩa các loại vật tư trong hệ thống
 * - API: Active Pharmaceutical Ingredient (hoạt chất dược phẩm)
 * - Excipient: Tá dược (phụ liệu trong sản xuất dược phẩm)
 * - DietarySupplement: Thực phẩm chức năng
 * - Container: Bao bì chứa đựng
 * - Closure: Nắp đậy, seal bao bì
 * - ProcessChemical: Hóa chất quá trình sản xuất
 * - TestingMaterial: Vật tư dùng cho kiểm nghiệm
 */
export enum MaterialType {
  API = 'API',
  Excipient = 'Excipient',
  DietarySupplement = 'Dietary Supplement',
  Container = 'Container',
  Closure = 'Closure',
  ProcessChemical = 'Process Chemical',
  TestingMaterial = 'Testing Material',
}

/**
 * CreateMaterialDto - DTO dùng để tạo mới vật tư
 * 
 * Các trường bắt buộc:
 * - part_number: Mã part number (duy nhất)
 * - material_name: Tên vật tư
 * - material_type: Loại vật tư (thuộc MaterialType enum)
 * 
 * Các trường tùy chọn:
 * - storage_conditions: Điều kiện bảo quản
 * - specification_document: Tài liệu thông số kỹ thuật
 * 
 * Sử dụng cho: POST /materials
 */
export class CreateMaterialDto {
  @IsString({ message: 'part_number phải là chuỗi' })
  @IsNotEmpty({ message: 'part_number là bắt buộc' })
  @MaxLength(20, { message: 'part_number không được vượt quá 20 ký tự' })
  part_number: string;

  @IsString({ message: 'material_name phải là chuỗi' })
  @IsNotEmpty({ message: 'material_name là bắt buộc' })
  @MaxLength(100, { message: 'material_name không được vượt quá 100 ký tự' })
  material_name: string;

  @IsEnum(MaterialType, { 
    message: `material_type phải là một trong: ${Object.values(MaterialType).join(', ')}` 
  })
  material_type: MaterialType;

  @IsString({ message: 'storage_conditions phải là chuỗi' })
  @IsOptional()
  @MaxLength(100, { message: 'storage_conditions không được vượt quá 100 ký tự' })
  storage_conditions?: string;

  @IsString({ message: 'specification_document phải là chuỗi' })
  @IsOptional()
  @MaxLength(50, { message: 'specification_document không được vượt quá 50 ký tự' })
  specification_document?: string;
}
