import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConfirmImportExportOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  material_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  lot_id?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expected_quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'actual_quantity must be greater than 0' })
  actual_quantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit_of_measure: string;
}

export class ConfirmImportExportOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmImportExportOrderItemDto)
  confirmed_items: ConfirmImportExportOrderItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(255)
  confirm_note?: string;
}
