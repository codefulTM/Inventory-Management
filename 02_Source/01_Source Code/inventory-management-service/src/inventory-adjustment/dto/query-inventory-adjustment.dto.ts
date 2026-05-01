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
import { InventoryAdjustmentReasonCode } from '../../schemas/inventory-adjustment.schema';

export class QueryInventoryAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  lot_id?: string;

  @IsOptional()
  @IsString()
  material_id?: string;

  @IsOptional()
  @IsString()
  performed_by?: string;

  @IsOptional()
  @IsEnum(InventoryAdjustmentReasonCode)
  reason_code?: InventoryAdjustmentReasonCode;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
