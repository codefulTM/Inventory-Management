import { IsOptional, IsString } from 'class-validator';

export class UploadWarehouseSlipAttachmentDto {
  @IsOptional()
  @IsString()
  source?: string; // e.g. 'upload' | 'camera' | 's3'
}
