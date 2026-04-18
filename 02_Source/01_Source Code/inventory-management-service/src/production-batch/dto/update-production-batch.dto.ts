import { PartialType } from '@nestjs/mapped-types';
import { CreateProductionBatchDto } from './create-production-batch.dto';

/**
 * DTO for updating an existing production batch
 * Used for PATCH /production-batches/:id endpoint
 * All fields are optional for partial updates
 */
export class UpdateProductionBatchDto extends PartialType(
  CreateProductionBatchDto,
) {}
