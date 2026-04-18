import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum WarehouseSlipType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum WarehouseSlipStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export class CreateWarehouseSlipLineDto {
  @IsString()
  @IsOptional()
  @MaxLength(36)
  material_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  lot_id?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'quantity must be a positive integer' })
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  notes?: string;
}

export class CreateWarehouseSlipAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  file_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  original_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mime_type: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size_bytes: number;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  uploaded_by?: string;

  @Type(() => Date)
  @IsOptional()
  uploaded_at?: Date;
}

export class CreateWarehouseSlipDto {
  @IsEnum(WarehouseSlipType)
  type: WarehouseSlipType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  warehouse_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  reference_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWarehouseSlipLineDto)
  lines: CreateWarehouseSlipLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWarehouseSlipAttachmentDto)
  @IsOptional()
  attachments?: CreateWarehouseSlipAttachmentDto[];

  @IsEnum(WarehouseSlipStatus)
  @IsOptional()
  status?: WarehouseSlipStatus;
}
