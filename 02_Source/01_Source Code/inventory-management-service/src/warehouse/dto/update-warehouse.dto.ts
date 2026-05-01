import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateWarehouseDto {
  @IsString({ message: 'warehouse_id must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'warehouse_id must not exceed 50 characters' })
  warehouse_id?: string;

  @IsString({ message: 'warehouse_name must be a string' })
  @IsOptional()
  @MaxLength(120, { message: 'warehouse_name must not exceed 120 characters' })
  warehouse_name?: string;

  @IsString({ message: 'description must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'description must not exceed 255 characters' })
  description?: string;

  @IsBoolean({ message: 'is_active must be a boolean' })
  @IsOptional()
  is_active?: boolean;
}
