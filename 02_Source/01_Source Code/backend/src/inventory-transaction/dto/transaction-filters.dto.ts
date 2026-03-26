import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';

/**
 * DTO for filtering inventory transactions
 */
export class TransactionFiltersDto {
  @IsString()
  @IsOptional()
  lot_id?: string;

  @IsString()
  @IsOptional()
  material_id?: string;

  @IsEnum(['Receipt', 'Usage'], { message: 'transaction_type must be either Receipt or Usage' })
  @IsOptional()
  transaction_type?: string;

  @IsString()
  @IsOptional()
  performed_by?: string;

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsDate()
  @IsOptional()
  dateFrom?: Date;

  @IsDate()
  @IsOptional()
  dateTo?: Date;
}
