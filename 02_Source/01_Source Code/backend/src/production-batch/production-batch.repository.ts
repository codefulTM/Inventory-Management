import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProductionBatch,
  ProductionBatchDocument,
} from '../schemas/production-batch.schema';
import { CreateProductionBatchDto } from './dto/create-production-batch.dto';
import { UpdateProductionBatchDto } from './dto/update-production-batch.dto';

/**
 * ProductionBatch Repository
 * Handles all database operations for the ProductionBatch collection
 */
@Injectable()
export class ProductionBatchRepository {
  private readonly logger = new Logger(ProductionBatchRepository.name);

  constructor(
    @InjectModel(ProductionBatch.name)
    private readonly batchModel: Model<ProductionBatchDocument>,
  ) {}

  /**
   * Create a new production batch record
   * @param createDto - Batch creation data
   * @returns Created batch document
   */
  async create(
    createDto: CreateProductionBatchDto,
  ): Promise<ProductionBatchDocument> {
    this.logger.debug(`Creating production batch: ${createDto.batch_number}`);
    const newBatch = new this.batchModel({
      ...createDto,
      batch_size: Types.Decimal128.fromString(createDto.batch_size.toString()),
    });
    return newBatch.save();
  }

  /**
   * Find all production batches with pagination
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns Paginated batches with metadata
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: ProductionBatchDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.debug(
      `Finding all production batches - page: ${page}, limit: ${limit}`,
    );

    const skip = (page - 1) * limit;
    const data = await this.batchModel
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();

    const total = await this.batchModel.countDocuments();

    return { data, total, page, limit };
  }

  /**
   * Find a single production batch by its business key (batch_id)
   * @param batchId - Batch UUID
   * @returns Batch document or null
   */
  async findOne(batchId: string): Promise<ProductionBatchDocument | null> {
    this.logger.debug(`Finding production batch by batch_id: ${batchId}`);
    return this.batchModel.findOne({ batch_id: batchId }).exec();
  }

  /**
   * Find a single production batch by batch_id OR batch_number
   * Try both fields since route param could be either
   * @param id - Batch ID or batch number
   * @returns Batch document or null
   */
  async findByIdOrNumber(id: string): Promise<ProductionBatchDocument | null> {
    this.logger.debug(`Finding production batch by id or number: ${id}`);
    return this.batchModel
      .findOne({
        $or: [{ batch_id: id }, { batch_number: id }],
      })
      .exec();
  }

  /**
   * Find a production batch by batch_number (unique business field)
   * @param batchNumber - Batch number string
   * @returns Batch document or null
   */
  async findByBatchNumber(
    batchNumber: string,
  ): Promise<ProductionBatchDocument | null> {
    this.logger.debug(
      `Finding production batch by batch_number: ${batchNumber}`,
    );
    return this.batchModel.findOne({ batch_number: batchNumber }).exec();
  }

  /**
   * Find all batches associated with a given product (material)
   * @param productId - Material product_id
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns Paginated results
   */
  async findByProductId(
    productId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: ProductionBatchDocument[]; total: number }> {
    this.logger.debug(`Finding batches by product_id: ${productId}`);

    const skip = (page - 1) * limit;
    const filter = { product_id: productId };

    const data = await this.batchModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();

    const total = await this.batchModel.countDocuments(filter);

    return { data, total };
  }

  /**
   * Find all batches with a given status
   * @param status - BatchStatus enum value
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns Paginated results
   */
  async findByStatus(
    status: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: ProductionBatchDocument[]; total: number }> {
    this.logger.debug(`Finding batches by status: ${status}`);

    const skip = (page - 1) * limit;
    const filter = { status };

    const data = await this.batchModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();

    const total = await this.batchModel.countDocuments(filter);

    return { data, total };
  }

  /**
   * Update a production batch by its batch_id
   * @param batchId - Batch UUID
   * @param updateDto - Fields to update
   * @returns Updated batch document or null
   */
  async update(
    batchId: string,
    updateDto: UpdateProductionBatchDto,
  ): Promise<ProductionBatchDocument | null> {
    this.logger.debug(`Updating production batch: ${batchId}`);
    return this.batchModel
      .findOneAndUpdate(
        { $or: [{ batch_id: batchId }, { batch_number: batchId }] },
        {
          ...updateDto,
          ...(updateDto.batch_size && {
            batch_size: Types.Decimal128.fromString(
              updateDto.batch_size.toString(),
            ),
          }),
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();
  }

  /**
   * Delete a production batch by its batch_id (hard delete)
   * @param batchId - Batch UUID
   * @returns Deleted batch document or null
   */
  async remove(batchId: string): Promise<ProductionBatchDocument | null> {
    this.logger.debug(`Deleting production batch: ${batchId}`);
    return this.batchModel
      .findOneAndDelete({
        $or: [{ batch_id: batchId }, { batch_number: batchId }],
      })
      .exec();
  }
}
