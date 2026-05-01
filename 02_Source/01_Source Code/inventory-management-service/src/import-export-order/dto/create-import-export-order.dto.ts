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

export enum ImportExportOrderType {
  INBOUND = 'Inbound',
  OUTBOUND = 'Outbound',
}

export enum ImportExportOrderStatus {
  PENDING_CONFIRMATION = 'PendingConfirmation',
  CONFIRMED = 'Confirmed',
  REJECTED = 'Rejected',
}

export enum ImportExportAttachmentSource {
  CAMERA = 'camera',
  UPLOAD = 'upload',
}

export class CreateImportExportOrderItemDto {
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
  unit_of_measure: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  expected_location?: string;
}

export class CreateImportExportOrderAttachmentDto {
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

  @IsEnum(ImportExportAttachmentSource)
  source: ImportExportAttachmentSource;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  uploaded_by: string;

  @Type(() => Date)
  uploaded_at: Date;
}

export class CreateImportExportOrderDto {
  @IsEnum(ImportExportOrderType)
  order_type: ImportExportOrderType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  warehouse_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference_number?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateImportExportOrderItemDto)
  items: CreateImportExportOrderItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImportExportOrderAttachmentDto)
  @IsOptional()
  attachments?: CreateImportExportOrderAttachmentDto[];

  @IsEnum(ImportExportOrderStatus)
  @IsOptional()
  status?: ImportExportOrderStatus;
}
