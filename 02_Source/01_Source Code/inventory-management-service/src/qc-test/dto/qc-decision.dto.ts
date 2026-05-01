import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class QCDecisionDto {
  @IsEnum(['Accepted', 'Rejected', 'Hold'])
  decision: 'Accepted' | 'Rejected' | 'Hold';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reject_reason?: string;
  // Service validates: if decision = 'Rejected' → reject_reason is required

  @IsOptional()
  @IsString()
  @MaxLength(20)
  label_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  verified_by: string;
}
