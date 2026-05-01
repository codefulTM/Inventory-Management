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
  lot_id: string; // Mã lô

  @Type(() => Number)
  @IsNumber()
  adjustment_quantity: number; // Số lượng điều chỉnh (dương: tăng, âm: giảm)

  @IsEnum(InventoryAdjustmentReasonCode)
  reason_code: InventoryAdjustmentReasonCode; // Mã lý do

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason_note?: string; // Ghi chú lý do (bắt buộc nếu reason_code = OTHER)

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_cost_snapshot: number; // Giá vốn tức thời (đ/unit) - dùng để tính giá trị tồn kho
}
