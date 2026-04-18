import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class BulkQuarantineDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  lot_ids: string[];
}
