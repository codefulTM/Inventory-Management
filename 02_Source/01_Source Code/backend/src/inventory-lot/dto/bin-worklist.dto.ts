import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BinWorklistQueryDto {
  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class BinCountEntryDto {
  @IsOptional()
  @IsString()
  lot_id?: string;

  @IsOptional()
  @IsString()
  material_id?: string;

  @IsNumber()
  counted_qty: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitBinCountDto {
  @IsString()
  counted_by: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BinCountEntryDto)
  entries: BinCountEntryDto[];
}
