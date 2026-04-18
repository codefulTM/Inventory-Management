import { PartialType } from '@nestjs/mapped-types';
import { CreateBatchComponentDto } from './create-batch-component.dto';

/**
 * DTO for updating an existing batch component
 * Used for PATCH /production-batches/:id/components/:componentId endpoint
 * All fields are optional for partial updates
 */
export class UpdateBatchComponentDto extends PartialType(
  CreateBatchComponentDto,
) {}
