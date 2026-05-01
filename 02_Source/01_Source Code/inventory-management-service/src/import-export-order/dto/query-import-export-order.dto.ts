import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ImportExportOrderStatus,
  ImportExportOrderType,
} from './create-import-export-order.dto';

export class QueryImportExportOrderDto {
  @IsEnum(ImportExportOrderStatus)
  @IsOptional()
  status?: ImportExportOrderStatus;

  @IsEnum(ImportExportOrderType)
  @IsOptional()
  order_type?: ImportExportOrderType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  created_by?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  from?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  to?: Date;

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
}

export class ResolveImportExportOrderScanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  scan_code: string;

  @IsEnum(ImportExportOrderType)
  @IsOptional()
  order_type?: ImportExportOrderType;
}
