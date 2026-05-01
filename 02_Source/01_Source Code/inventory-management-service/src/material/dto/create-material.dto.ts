import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum MaterialType {
  API = 'API',
  Excipient = 'Excipient',
  DietarySupplement = 'Dietary Supplement',
  Container = 'Container',
  Closure = 'Closure',
  ProcessChemical = 'Process Chemical',
  TestingMaterial = 'Testing Material',
}

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  part_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  material_name: string;

  @IsEnum(MaterialType)
  material_type: MaterialType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  storage_conditions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  specification_document?: string;
}
