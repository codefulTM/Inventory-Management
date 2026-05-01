import { IsNotEmpty, IsString } from 'class-validator';

export class RejectWarehouseSlipDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
