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
import { InventoryAuditReportStatus } from '../../schemas/inventory-audit-report.schema';

export class QueryInventoryAuditReportDto {
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
  @IsEnum(InventoryAuditReportStatus)
  status?: InventoryAuditReportStatus;

  @IsOptional()
  @IsString()
  requested_by?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
