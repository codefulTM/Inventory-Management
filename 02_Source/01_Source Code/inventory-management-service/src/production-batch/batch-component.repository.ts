import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BatchComponent,
  BatchComponentDocument,
} from '../schemas/batch-component.schema';
import { CreateBatchComponentDto } from './dto/create-batch-component.dto';
import { UpdateBatchComponentDto } from './dto/update-batch-component.dto';

/**
 * BatchComponent Repository
 * Handles all database operations for the BatchComponent collection
 */
@Injectable()
export class BatchComponentRepository {
  private readonly logger = new Logger(BatchComponentRepository.name);

  constructor(
    @InjectModel(BatchComponent.name)
    private readonly componentModel: Model<BatchComponentDocument>,
  ) {}

  /**
   * Create a new batch component record
   * @param createDto - Component creation data (batch_id injected by service)
   * @returns Created component document
   */
  async create(
    createDto: CreateBatchComponentDto & {
      batch_id: string;
      component_id: string;
    },
  ): Promise<BatchComponentDocument> {
    this.logger.debug(
      `Creating batch component for batch_id: ${createDto.batch_id}`,
    );
    const newComponent = new this.componentModel(createDto);
    return newComponent.save();
  }

  /**
   * Find all components belonging to a given production batch
   * @param batchId - ProductionBatch UUID
   * @returns Array of batch component documents
   */
  async findByBatchId(batchId: string): Promise<BatchComponentDocument[]> {
    this.logger.debug(`Finding components for batch_id: ${batchId}`);
    return this.componentModel
      .find({ batch_id: batchId })
      .sort({ created_date: 1 })
      .exec();
  }

  /**
   * Find a single batch component by its business key (component_id)
   * @param componentId - Component UUID
   * @returns Component document or null
   */
  async findOne(componentId: string): Promise<BatchComponentDocument | null> {
    this.logger.debug(
      `Finding batch component by component_id: ${componentId}`,
    );
    return this.componentModel.findOne({ component_id: componentId }).exec();
  }

  /**
   * Find a single batch component by component_id scoped to a specific batch
   * Ensures a component belongs to the expected batch before mutating
   * @param batchId - ProductionBatch UUID
   * @param componentId - Component UUID
   * @returns Component document or null
   */
  async findOneByBatch(
    batchId: string,
    componentId: string,
  ): Promise<BatchComponentDocument | null> {
    this.logger.debug(
      `Finding component ${componentId} within batch ${batchId}`,
    );
    return this.componentModel
      .findOne({ component_id: componentId, batch_id: batchId })
      .exec();
  }

  /**
   * Update a batch component by its component_id
   * @param componentId - Component UUID
   * @param updateDto - Fields to update
   * @returns Updated component document or null
   */
  async update(
    componentId: string,
    updateDto: UpdateBatchComponentDto,
  ): Promise<BatchComponentDocument | null> {
    this.logger.debug(`Updating batch component: ${componentId}`);
    return this.componentModel
      .findOneAndUpdate({ component_id: componentId }, updateDto, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  /**
   * Delete a batch component by its component_id (hard delete)
   * @param componentId - Component UUID
   * @returns Deleted component document or null
   */
  async remove(componentId: string): Promise<BatchComponentDocument | null> {
    this.logger.debug(`Deleting batch component: ${componentId}`);
    return this.componentModel
      .findOneAndDelete({ component_id: componentId })
      .exec();
  }
}
