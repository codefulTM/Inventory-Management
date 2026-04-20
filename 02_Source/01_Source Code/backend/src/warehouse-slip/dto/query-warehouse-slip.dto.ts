import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum WarehouseSlipQueryStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export enum WarehouseSlipQueryType {
  IN = 'IN',
  OUT = 'OUT',
}

export class QueryWarehouseSlipDto {
  @IsOptional()
  @IsEnum(WarehouseSlipQueryStatus)
  status?: WarehouseSlipQueryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  created_by?: string;

  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  to?: Date;

  @IsOptional()
  @IsEnum(WarehouseSlipQueryType)
  type?: WarehouseSlipQueryType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
