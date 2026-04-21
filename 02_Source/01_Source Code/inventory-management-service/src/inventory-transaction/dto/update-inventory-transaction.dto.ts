import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from './create-inventory-transaction.dto';

/**
 * All fields from create DTO except IDs/timestamps, and every property is optional.
 */
export class UpdateInventoryTransactionDto {
  @IsString()
  @IsOptional()
  lot_id?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  transaction_type?: TransactionType;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @IsString()
  @IsOptional()
  unit_of_measure?: string;

  @IsOptional()
  @IsDateString()
  transaction_date?: string;

  @IsOptional()
  @IsString()
  reference_number?: string;

  @IsString()
  @IsOptional()
  performed_by?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
