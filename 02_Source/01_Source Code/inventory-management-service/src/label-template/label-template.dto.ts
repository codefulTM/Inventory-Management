import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MaxLength,
  IsOptional,
  MinLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export const LabelTypeValues = [
  'Raw Material',
  'Sample',
  'Intermediate',
  'Finished Product',
  'API',
  'Status',
] as const;

export type LabelType = (typeof LabelTypeValues)[number];

/**
 * DTO for creating a new label template
 */
export class CreateLabelTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'template_id is required' })
  @MinLength(1)
  @MaxLength(20, { message: 'template_id must not exceed 20 characters' })
  template_id: string;

  @IsString()
  @IsNotEmpty({ message: 'template_name is required' })
  @MinLength(1)
  @MaxLength(100, { message: 'template_name must not exceed 100 characters' })
  template_name: string;

  @IsEnum(LabelTypeValues, {
    message: `label_type must be one of: ${LabelTypeValues.join(', ')}`,
  })
  @IsNotEmpty({ message: 'label_type is required' })
  label_type: LabelType;

  @IsString()
  @IsNotEmpty({ message: 'template_content is required' })
  template_content: string;

  @IsNumber({}, { message: 'width must be a number' })
  @Min(0.01, { message: 'width must be greater than 0' })
  @Max(99.99, { message: 'width must not exceed 99.99' })
  @Type(() => Number)
  width: number;

  @IsNumber({}, { message: 'height must be a number' })
  @Min(0.01, { message: 'height must be greater than 0' })
  @Max(99.99, { message: 'height must not exceed 99.99' })
  @Type(() => Number)
  height: number;
}

/**
 * DTO for updating an existing label template
 */
export class UpdateLabelTemplateDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  template_name?: string;

  @IsEnum(LabelTypeValues, {
    message: `label_type must be one of: ${LabelTypeValues.join(', ')}`,
  })
  @IsOptional()
  label_type?: LabelType;

  @IsString()
  @IsOptional()
  template_content?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(99.99)
  @Type(() => Number)
  width?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(99.99)
  @Type(() => Number)
  height?: number;
}

/**
 * DTO for generating a label from a template
 * Uses mock data when source module not fully integrated
 */
export class GenerateLabelDto {
  @IsString()
  @IsNotEmpty({ message: 'template_id is required' })
  template_id: string;

  @IsString()
  @IsOptional()
  lot_id?: string;

  @IsString()
  @IsOptional()
  batch_id?: string;
}

/**
 * Response DTO for label templates
 */
export class LabelTemplateResponseDto {
  _id: string;
  template_id: string;
  template_name: string;
  label_type: LabelType;
  template_content: string;
  width: number;
  height: number;
  created_date: Date;
  modified_date: Date;
}

export class PaginatedLabelTemplateResponseDto {
  data: LabelTemplateResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
