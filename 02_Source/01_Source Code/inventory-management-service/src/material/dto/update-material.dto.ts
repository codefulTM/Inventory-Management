import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialDto } from './create-material.dto';

/**
 * UpdateMaterialDto - DTO dùng để cập nhật vật tư
 * 
 * Kế thừa từ CreateMaterialDto nhưng tất cả các trường đều là tùy chọn
 * Cho phép cập nhật từng phần (partial update)
 * 
 * Sử dụng cho: PUT /materials/:id
 * 
 * Ví dụ: Chỉ muốn cập nhật material_name
 * Body: { "material_name": "New Name" }
 */
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
