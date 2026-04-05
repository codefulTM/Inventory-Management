import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CreateImportExportOrderItemDto,
  CreateImportExportOrderAttachmentDto,
  ImportExportOrderStatus,
  ImportExportOrderType,
} from './create-import-export-order.dto';

export class UpdateImportExportOrderDto {
  @IsEnum(ImportExportOrderType)
  @IsOptional()
  order_type?: ImportExportOrderType;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  warehouse_id?: string;

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
  @IsOptional()
  items?: CreateImportExportOrderItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImportExportOrderAttachmentDto)
  @IsOptional()
  attachments?: CreateImportExportOrderAttachmentDto[];

  @IsEnum(ImportExportOrderStatus)
  @IsOptional()
  status?: ImportExportOrderStatus;
}
