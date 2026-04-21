import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionType {
  Receipt = 'Receipt',
  Usage = 'Usage',
  Split = 'Split',
  Adjustment = 'Adjustment',
  Transfer = 'Transfer',
  Disposal = 'Disposal',
}

export class CreateInventoryTransactionDto {
  // nếu client không cung cấp thì service sẽ tự sinh UUID
  @IsString()
  @IsOptional()
  transaction_id?: string;

  @IsString()
  @IsNotEmpty()
  lot_id: string;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  transaction_type: TransactionType;

  // số lượng có thể âm hoặc dương; dấu sẽ được hiểu theo loại giao dịch
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit_of_measure: string;

  @IsOptional()
  @IsDateString()
  transaction_date?: string;

  @IsOptional()
  @IsString()
  reference_number?: string;

  @IsString()
  @IsNotEmpty()
  performed_by: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
