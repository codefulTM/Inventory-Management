import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for adding a component (inventory lot) to a production batch
 * Used for POST /production-batches/:id/components endpoint
 * Note: batch_id is derived from the route parameter, not the request body
 */
export class CreateBatchComponentDto {
  @IsString()
  @IsNotEmpty({ message: 'lot_id is required' })
  @MaxLength(36, { message: 'lot_id must not exceed 36 characters' })
  lot_id: string;

  @IsNumber({}, { message: 'planned_quantity must be a number' })
  @IsPositive({ message: 'planned_quantity must be a positive number' })
  @Type(() => Number)
  planned_quantity: number;

  @IsNumber({}, { message: 'actual_quantity must be a number' })
  @IsPositive({ message: 'actual_quantity must be a positive number' })
  @IsOptional()
  @Type(() => Number)
  actual_quantity?: number;

  @IsString({ message: 'unit_of_measure must be a string' })
  @IsOptional()
  @MaxLength(10, { message: 'unit_of_measure must not exceed 10 characters' })
  unit_of_measure?: string;

  @IsDateString(
    {},
    { message: 'addition_date must be a valid ISO 8601 date string' },
  )
  @IsOptional()
  addition_date?: string;

  @IsString({ message: 'added_by must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'added_by must not exceed 50 characters' })
  added_by?: string;
}
