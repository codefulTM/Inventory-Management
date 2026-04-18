import { IsEnum, IsOptional } from 'class-validator';
import { ImportExportAttachmentSource } from '../../schemas/import-export-order.schema';

export class UploadImportExportOrderAttachmentDto {
  @IsEnum(ImportExportAttachmentSource)
  @IsOptional()
  source?: ImportExportAttachmentSource;
}
