import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import { BatchComponentRepository } from './batch-component.repository';
import { ProductionBatchRepository } from './production-batch.repository';
import { CreateBatchComponentDto } from './dto/create-batch-component.dto';
import { UpdateBatchComponentDto } from './dto/update-batch-component.dto';
import { BatchComponentResponseDto } from './production-batch.dto';
import { RedisIdService } from '../redis-id/redis-id.service';

/**
 * BatchComponent Service
 * Contains business logic for BatchComponent operations (nested under ProductionBatch)
 */
@Injectable()
export class BatchComponentService {
  private readonly logger = new Logger(BatchComponentService.name);

  constructor(
    private readonly componentRepository: BatchComponentRepository,
    private readonly batchRepository: ProductionBatchRepository,
    @InjectModel(InventoryLot.name)
    private readonly lotModel: Model<InventoryLotDocument>,
    private readonly redisIdService: RedisIdService,
  ) {}

  private logDetailedError(error: any, context: string) {
    // cho depth: null để xem toàn bộ cấu trúc object khi lỗi MongoDB bị cắt gọn [Object]
    console.dir(error, { depth: null, colors: true });
    this.logger.error(`${context} failed.`, error?.stack || String(error));
  }

  /**
   * Add a component (inventory lot) to a production batch
   * Validates: batch_id exists, lot_id exists, planned_quantity > 0
   * Auto-fills addition_date if not provided
   * @param batchId - Parent batch UUID (from route param)
   * @param createDto - Component data
   * @returns Created component response
   * @throws NotFoundException - If batch or lot not found
   * @throws BadRequestException - If planned_quantity <= 0
   */
  async create(
    batchId: string,
    createDto: CreateBatchComponentDto,
  ): Promise<BatchComponentResponseDto> {
    try {
      this.logger.log(
        `Adding component lot_id=${createDto.lot_id} to batch_id=${batchId}`,
      );

      // Validate parent batch exists
      this.logger.debug(
        `Looking for batch with batch_id: "${batchId}" (type: ${typeof batchId})`,
      );
      const batch = await this.batchRepository.findByIdOrNumber(batchId);

      if (!batch) {
        this.logger.error(`Batch not found with batch_id: "${batchId}"`);
        // Try to find any batch to debug
        const allBatches = await this.batchRepository.findAll(1, 100);
        this.logger.debug(`Available batches count: ${allBatches.data.length}`);
        if (allBatches.data.length > 0) {
          this.logger.debug(
            `First batch batch_id: "${allBatches.data[0].batch_id}"`,
          );
        }
        throw new NotFoundException(
          `Production batch with ID '${batchId}' not found`,
        );
      }
      this.logger.debug(
        `Batch found: ${batch.batch_id}, status: ${batch.status}`,
      );

      // Chỉ cho phép thêm nguyên liệu khi batch ở trạng thái On Hold (pending)
      if (batch.status !== 'On Hold') {
        throw new BadRequestException(
          'Chỉ được thêm nguyên liệu khi batch ở trạng thái On Hold (pending)',
        );
      }

      // Validate inventory lot exists
      const lot = await this.lotModel
        .findOne({ lot_id: createDto.lot_id })
        .exec();
      if (!lot) {
        throw new NotFoundException(
          `Inventory lot with ID '${createDto.lot_id}' not found`,
        );
      }

      // Auto-fill addition_date if not provided
      const addition_date = createDto.addition_date
        ? createDto.addition_date
        : new Date().toISOString();

      // Auto-fill unit_of_measure from inventory lot if not provided
      const unit_of_measure = createDto.unit_of_measure || lot.unit_of_measure;

      const component = await this.componentRepository.create({
        ...createDto,
        batch_id: batchId,
        component_id: await this.redisIdService.nextId('BC'),
        unit_of_measure,
        addition_date,
      });

      this.logger.log(
        `Batch component created successfully: ${component.component_id}`,
      );

      return this.toResponseDto(component);
    } catch (error) {
      this.logDetailedError(error, 'BatchComponentService.create');
      throw error;
    }
  }

  /**
   * Get all components for a given production batch
   * @param batchId - Parent batch UUID
   * @returns Array of component responses
   * @throws NotFoundException - If batch not found
   */
  async findByBatchId(batchId: string): Promise<BatchComponentResponseDto[]> {
    try {
      this.logger.debug(`Finding components for batch_id: ${batchId}`);

      const batch = await this.batchRepository.findByIdOrNumber(batchId);
      if (!batch) {
        throw new NotFoundException(
          `Production batch with ID '${batchId}' not found`,
        );
      }

      const components = await this.componentRepository.findByBatchId(batchId);

      return components.map((c) => this.toResponseDto(c));
    } catch (error) {
      this.logDetailedError(error, 'BatchComponentService.findByBatchId');
      throw error;
    }
  }

  /**
   * Get a single batch component
   * @param batchId - Parent batch UUID
   * @param componentId - Component UUID
   * @returns Component response
   * @throws NotFoundException - If component not found within the given batch
   */
  async findOne(
    batchId: string,
    componentId: string,
  ): Promise<BatchComponentResponseDto> {
    try {
      this.logger.debug(`Finding component ${componentId} in batch ${batchId}`);

      const component = await this.componentRepository.findOneByBatch(
        batchId,
        componentId,
      );
      if (!component) {
        throw new NotFoundException(
          `Component '${componentId}' not found in batch '${batchId}'`,
        );
      }

      return this.toResponseDto(component);
    } catch (error) {
      this.logDetailedError(error, 'BatchComponentService.findOne');
      throw error;
    }
  }

  /**
   * Update a batch component
   * @param batchId - Parent batch UUID
   * @param componentId - Component UUID
   * @param updateDto - Fields to update
   * @returns Updated component response
   * @throws NotFoundException - If component not found within the given batch
   */
  async update(
    batchId: string,
    componentId: string,
    updateDto: UpdateBatchComponentDto,
  ): Promise<BatchComponentResponseDto> {
    try {
      this.logger.log(`Updating batch component: ${componentId}`);

      const batch = await this.batchRepository.findByIdOrNumber(batchId);
      if (!batch) {
        throw new NotFoundException(
          `Production batch with ID '${batchId}' not found`,
        );
      }
      if (batch.status !== 'On Hold') {
        throw new BadRequestException(
          'Chỉ được sửa nguyên liệu khi batch ở trạng thái On Hold (pending)',
        );
      }
      const existing = await this.componentRepository.findOneByBatch(
        batchId,
        componentId,
      );
      if (!existing) {
        throw new NotFoundException(
          `Component '${componentId}' not found in batch '${batchId}'`,
        );
      }

      // If lot_id is changing, validate the new lot exists
      if (updateDto.lot_id && updateDto.lot_id !== existing.lot_id) {
        const lot = await this.lotModel
          .findOne({ lot_id: updateDto.lot_id })
          .exec();
        if (!lot) {
          throw new NotFoundException(
            `Inventory lot with ID '${updateDto.lot_id}' not found`,
          );
        }
      }

      const updated = await this.componentRepository.update(
        componentId,
        updateDto,
      );
      this.logger.log(`Batch component updated successfully: ${componentId}`);

      return this.toResponseDto(updated);
    } catch (error) {
      this.logDetailedError(error, 'BatchComponentService.update');
      throw error;
    }
  }

  /**
   * Delete a batch component
   * @param batchId - Parent batch UUID
   * @param componentId - Component UUID
   * @returns Deletion confirmation message
   * @throws NotFoundException - If component not found within the given batch
   */
  async remove(
    batchId: string,
    componentId: string,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting batch component: ${componentId}`);

      const batch = await this.batchRepository.findByIdOrNumber(batchId);
      if (!batch) {
        throw new NotFoundException(
          `Production batch with ID '${batchId}' not found`,
        );
      }
      if (batch.status !== 'On Hold') {
        throw new BadRequestException(
          'Chỉ được xóa nguyên liệu khi batch ở trạng thái On Hold (pending)',
        );
      }
      const existing = await this.componentRepository.findOneByBatch(
        batchId,
        componentId,
      );
      if (!existing) {
        throw new NotFoundException(
          `Component '${componentId}' not found in batch '${batchId}'`,
        );
      }

      await this.componentRepository.remove(componentId);
      this.logger.log(`Batch component deleted successfully: ${componentId}`);

      return {
        message: `Batch component '${componentId}' deleted successfully`,
      };
    } catch (error) {
      this.logDetailedError(error, 'BatchComponentService.remove');
      throw error;
    }
  }

  /**
   * Convert a BatchComponent document to response DTO
   * Handles Decimal128 → string serialization for quantities
   */
  private toResponseDto(component: any): BatchComponentResponseDto {
    if (!component) {
      throw new Error('Component is undefined or null');
    }
    return {
      _id: component._id?.toString() ?? '',
      component_id: component.component_id,
      batch_id: component.batch_id,
      lot_id: component.lot_id,
      planned_quantity: component.planned_quantity?.toString() ?? '0',
      actual_quantity: component.actual_quantity?.toString(),
      unit_of_measure: component.unit_of_measure,
      addition_date: component.addition_date,
      added_by: component.added_by,
      created_date: component.created_date,
      modified_date: component.modified_date,
    };
  }
}
