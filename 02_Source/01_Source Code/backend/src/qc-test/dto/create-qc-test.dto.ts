import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateQCTestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  lot_id: string;

  @IsEnum([
    'Identity',
    'Potency',
    'Microbial',
    'Growth Promotion',
    'Physical',
    'Chemical',
  ])
  test_type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  test_method: string;

  @IsDateString()
  test_date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  test_result: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  acceptance_criteria?: string;

  @IsEnum(['Pass', 'Fail', 'Pending'])
  result_status: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  performed_by: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  verified_by?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reject_reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  label_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  approved_by?: string;

  @IsOptional()
  history?: Record<string, any>[];
}

export class QCTestResponseDto {
  test_id: string;
  lot_id: string;
  test_type: string;
  test_method: string;
  test_date: string;
  test_result: string;
  acceptance_criteria?: string;
  result_status: string;
  performed_by: string;
  verified_by?: string;
  approved_by?: string;
  reject_reason?: string;
  label_id?: string;
  created_date?: string;
  modified_date?: string;
  history?: Record<string, any>[];
}
