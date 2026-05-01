import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SubmitRetestDecisionDto {
  @IsEnum(['extend', 'discard'])
  action: 'extend' | 'discard';

  @IsOptional()
  @IsDateString()
  new_expiry_date?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  performed_by?: string;
}
