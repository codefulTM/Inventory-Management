import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { InventoryAdjustmentReasonCode } from '../../schemas/inventory-adjustment.schema';

export class CreateInventoryAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  lot_id: string;

  @Type(() => Number)
  @IsNumber()
  adjustment_quantity: number;

  @IsEnum(InventoryAdjustmentReasonCode)
  reason_code: InventoryAdjustmentReasonCode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason_note?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_cost_snapshot: number;
}
