import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectImportExportOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
