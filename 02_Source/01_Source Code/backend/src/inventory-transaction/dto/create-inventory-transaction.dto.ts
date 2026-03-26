import { IsString, IsNotEmpty, IsNumber, IsPositive, IsEnum, IsOptional, IsDate } from 'class-validator';

/**
 * DTO for creating a new inventory transaction
 */
export class CreateInventoryTransactionDto {
  @IsString()
  @IsNotEmpty()
  lot_id: string;

  @IsString()
  @IsNotEmpty()
  material_id: string;

  @IsEnum(['Receipt', 'Usage'], { message: 'transaction_type must be either Receipt or Usage' })
  @IsNotEmpty()
  transaction_type: string;

  @IsNumber()
  @IsPositive({ message: 'quantity must be a positive number' })
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit_of_measure: string;

  @IsDate()
  @IsNotEmpty()
  transaction_date: Date;

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsString()
  @IsNotEmpty()
  performed_by: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
