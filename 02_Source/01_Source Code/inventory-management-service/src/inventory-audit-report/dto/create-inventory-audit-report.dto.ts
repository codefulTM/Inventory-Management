import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateInventoryAuditReportDto {
  @IsDateString()
  period_from: string;

  @IsDateString()
  period_to: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  scope_warehouse_ids?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_zero_balance?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  report_template_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  signer_profile_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  approved_by?: string;
}
