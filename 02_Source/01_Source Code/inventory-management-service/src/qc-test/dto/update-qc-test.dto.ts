import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQCTestDto } from './create-qc-test.dto';

export class UpdateQCTestDto extends PartialType(
  OmitType(CreateQCTestDto, ['lot_id'] as const),
) {}
