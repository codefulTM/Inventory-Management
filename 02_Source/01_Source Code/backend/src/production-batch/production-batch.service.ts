import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from '../schemas/material.schema';
import { InventoryLot, InventoryLotDocument } from '../schemas/inventory-lot.schema';
import { InventoryTransaction, InventoryTransactionDocument } from '../schemas/inventory-transaction.schema';
import { BatchComponent, BatchComponentDocument } from '../schemas/batch-component.schema';
import { ProductionBatchRepository } from './production-batch.repository';
import { BatchComponentRepository } from './batch-component.repository';
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { CreateProductionBatchDto, BatchStatus } from './dto/create-production-batch.dto';
import { UpdateProductionBatchDto } from './dto/update-production-batch.dto';
import { InventoryLotStatus } from '../inventory-lot/inventory-lot.dto';
import {
  ProductionBatchResponseDto,
  PaginatedProductionBatchResponseDto,
} from './production-batch.dto';
import { v4 as uuidv4 } from 'uuid';

// Valid status transitions: current status -> allowed next statuses
const STATUS_TRANSITIONS: Record<string, string[]> = {
  [BatchStatus.InProgress]: [BatchStatus.Complete, BatchStatus.OnHold, BatchStatus.Cancelled],
  [BatchStatus.OnHold]: [BatchStatus.InProgress, BatchStatus.Cancelled],
  [BatchStatus.Complete]: [],
  [BatchStatus.Cancelled]: [],
};

/**
 * ProductionBatch Service
 * Contains business logic for ProductionBatch operations
 */
@Injectable()
export class ProductionBatchService {
  private readonly logger = new Logger(ProductionBatchService.name);

  constructor(
    private readonly repository: ProductionBatchRepository,
    private readonly batchComponentRepository: BatchComponentRepository,
    private readonly inventoryLotRepository: InventoryLotRepository,
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    @InjectModel(InventoryTransaction.name)
    private readonly inventoryTransactionModel: Model<InventoryTransactionDocument>,
  ) {}

  /**
   * Helper: Calculate expiration date based on shelf_life settings
   * @param receivedDate - Date lot was received
   * @param shelfLifeValue - Number of units
   * @param shelfLifeUnit - Unit type (day/month/year)
   * @returns Expiration date
   */
  private calculateExpirationDate(
    receivedDate: Date,
    shelfLifeValue: number,
    shelfLifeUnit: string,
  ): Date {
    const expirationDate = new Date(receivedDate);

    if (shelfLifeUnit.toLowerCase() === 'day') {
      expirationDate.setDate(expirationDate.getDate() + shelfLifeValue);
    } else if (shelfLifeUnit.toLowerCase() === 'month') {
      expirationDate.setMonth(expirationDate.getMonth() + shelfLifeValue);
    } else if (shelfLifeUnit.toLowerCase() === 'year') {
      expirationDate.setFullYear(expirationDate.getFullYear() + shelfLifeValue);
    }

    return expirationDate;
  }

  /**
   * Step 1: Verify all inventory lots have sufficient quantities
   * @param components - Batch components with lot_id and planned_quantity
   * @returns true if all quantities are sufficient
   * @throws BadRequestException if any lot has insufficient quantity
   * @throws NotFoundException if any lot is not found
   */
  async verifyInventoryAvailability(
    components: BatchComponentDocument[],
  ): Promise<boolean> {
    this.logger.log(`Verifying inventory availability for ${components.length} components`);

    for (const component of components) {
      const lot = await this.inventoryLotRepository.findById(component.lot_id);
      
      if (!lot) {
        throw new NotFoundException(
          `Inventory lot with ID '${component.lot_id}' not found`,
        );
      }

      // Convert Decimal128 to number for comparison
      const plannedQty = Number(component.planned_quantity);
      const availableQty = Number(lot.quantity);

      if (availableQty < plannedQty) {
        throw new BadRequestException(
          `Insufficient quantity in lot '${component.lot_id}'. ` +
          `Available: ${availableQty}, Required: ${plannedQty}`,
        );
      }

      this.logger.debug(
        `Lot ${component.lot_id} verification passed: ${availableQty} >= ${plannedQty}`,
      );
    }

    this.logger.log('All inventory lots verified successfully');
    return true;
  }

  /**
   * Step 2: Deduct materials from inventory lots and create transaction records
   * @param batchId - Production batch ID
   * @param components - Batch components to deduct
   * @param performedBy - User performing the action
   * @throws NotFoundException if lot is not found
   * @throws Error on database save failure
   */
  async deductMaterialsFromInventory(
    batchId: string,
    components: BatchComponentDocument[],
    performedBy: string,
  ): Promise<void> {
    this.logger.log(`Deducting materials from inventory for batch: ${batchId}`);

    for (const component of components) {
      const lot = await this.inventoryLotRepository.findById(component.lot_id);
      if (!lot) {
        throw new NotFoundException(
          `Inventory lot with ID '${component.lot_id}' not found during deduction`,
        );
      }

      const plannedQty = Number(component.planned_quantity);
      const currentQty = Number(lot.quantity);
      const newQty = currentQty - plannedQty;

      // Update inventory lot quantity (convert to string as per repository signature)
      await this.inventoryLotRepository.updateQuantity(component.lot_id, String(-plannedQty));
      this.logger.debug(
        `Lot ${component.lot_id} quantity updated: ${currentQty} -> ${newQty}`,
      );

      // Create inventory transaction record
      const transaction = new this.inventoryTransactionModel({
        transaction_id: uuidv4(),
        lot_id: component.lot_id,
        transaction_type: 'Usage',
        quantity: component.planned_quantity,
        unit_of_measure: component.unit_of_measure,
        transaction_date: new Date(),
        reference_number: batchId,
        performed_by: performedBy,
        notes: `Material deduction for production batch ${batchId}`,
      });
      console.log('Creating inventory transaction:', transaction);

      await transaction.save();
      this.logger.debug(
        `Transaction created for lot ${component.lot_id}: ${transaction.transaction_id}`,
      );
    }

    this.logger.log(`Materials deducted successfully for batch ${batchId}`);
  }

  /**
   * Step 3: Create a new inventory lot for the finished product
   * @param batch - The production batch (now Complete)
   * @param performedBy - User performing the action
   * @returns The created inventory lot
   * @throws NotFoundException if material/product is not found
   */
  async createFinishedProductLot(
    batch: any,
    performedBy: string,
  ): Promise<InventoryLotDocument> {
    this.logger.log(
      `Creating finished product lot for batch ${batch.batch_id}`,
    );

    // Fetch material info (it's the product_id in batch)
    const material = await this.materialModel.findOne({ material_id: batch.product_id }).exec();
    if (!material) {
      throw new NotFoundException(
        `Material/Product with ID '${batch.product_id}' not found`,
      );
    }

    // Calculate expiration date
    const receivedDate = new Date();
    const expirationDate = this.calculateExpirationDate(
      receivedDate,
      batch.shelf_life_value,
      batch.shelf_life_unit,
    );

    // Create new inventory lot for finished product
    const newLot = new this.inventoryLotModel({
      lot_id: uuidv4(),
      material_id: batch.product_id,
      manufacturer_name: 'Internal',
      manufacturer_lot: batch.batch_number,
      received_date: receivedDate,
      expiration_date: expirationDate,
      status: InventoryLotStatus.QUARANTINE,
      quantity: Number(batch.batch_size), // Convert Decimal128 to number
      unit_of_measure: batch.unit_of_measure,
      is_sample: false,
      received_by: performedBy,
      notes: `Finished product from production batch ${batch.batch_number}`,
    });

    const savedLot = await newLot.save();
    this.logger.log(
      `Finished product lot created: ${savedLot.lot_id} with status Quarantine`,
    );

    return savedLot;
  }

  /**
   * Create a new production batch
   * Validates: batch_number unique, product_id exists
   * @param createDto - Batch creation data
   * @returns Created batch response
   * @throws ConflictException - If batch_number already exists
   * @throws NotFoundException - If product_id does not exist in Materials
   */
  async create(
    createDto: CreateProductionBatchDto,
  ): Promise<ProductionBatchResponseDto> {
    this.logger.log(`Creating production batch: ${createDto.batch_number}`);

    // Check batch_number uniqueness
    const existingBatch = await this.repository.findByBatchNumber(
      createDto.batch_number,
    );
    if (existingBatch) {
      this.logger.warn(
        `Duplicate batch_number attempted: ${createDto.batch_number}`,
      );
      throw new ConflictException(
        `Batch number '${createDto.batch_number}' already exists`,
      );
    }

    // Validate product_id exists in Materials
    const product = await this.materialModel
      .findOne({ material_id: createDto.product_id })
      .exec();
    if (!product) {
      throw new NotFoundException(
        `Product (material) with ID '${createDto.product_id}' not found`,
      );
    }

    // Validate shelf_life_value and shelf_life_unit
    if (createDto.shelf_life_value <= 0) {
      throw new BadRequestException('shelf_life_value must be a positive number');
    }
    const validUnits = ['day', 'month', 'year'];
    if (!validUnits.includes(createDto.shelf_life_unit)) {
      throw new BadRequestException('shelf_life_unit must be day, month, or year');
    }

    // Prepare batch object - no manufacture_date or expiration_date
    const batchToCreate = {
      ...createDto,
      batch_id: createDto.batch_id || createDto.batch_number, // Use provided batch_id or fallback to batch_number
      status: createDto.status || BatchStatus.OnHold,
    };

    const batch = await this.repository.create(batchToCreate);
    this.logger.log(`Production batch created successfully: ${batch.batch_id}`);

    return this.toResponseDto(batch);
  }

  /**
   * Get all production batches with pagination
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns Paginated batch response
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedProductionBatchResponseDto> {
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1) throw new BadRequestException('Limit must be >= 1');
    if (limit > 100) {
      this.logger.warn(`Limit capped at 100, requested: ${limit}`);
      limit = 100;
    }

    this.logger.debug(
      `Finding all production batches - page: ${page}, limit: ${limit}`,
    );

    const result = await this.repository.findAll(page, limit);

    return {
      data: result.data.map((b) => this.toResponseDto(b)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get a single production batch by batch_id
   * @param batchId - Batch UUID
   * @returns Batch response
   * @throws NotFoundException - If batch not found
   */
  async findOne(batchId: string): Promise<ProductionBatchResponseDto> {
    this.logger.debug(`Finding production batch: ${batchId}`);

    const batch = await this.repository.findByIdOrNumber(batchId);
    if (!batch) {
      throw new NotFoundException(
        `Production batch with ID '${batchId}' not found`,
      );
    }

    return this.toResponseDto(batch);
  }

  /**
   * Get all batches for a given product (material)
   * @param productId - Material product_id
   * @param page - Page number
   * @param limit - Records per page
   * @returns Paginated batch response
   */
  async findByProductId(
    productId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedProductionBatchResponseDto> {
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1) throw new BadRequestException('Limit must be >= 1');

    this.logger.debug(`Finding batches for product_id: ${productId}`);

    const result = await this.repository.findByProductId(productId, page, limit);

    return {
      data: result.data.map((b) => this.toResponseDto(b)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Get all batches with a given status
   * @param status - BatchStatus value
   * @param page - Page number
   * @param limit - Records per page
   * @returns Paginated batch response
   */
  async findByStatus(
    status: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedProductionBatchResponseDto> {
    const validStatuses = Object.values(BatchStatus) as string[];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
      );
    }
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1) throw new BadRequestException('Limit must be >= 1');

    this.logger.debug(`Finding batches by status: ${status}`);

    const result = await this.repository.findByStatus(status, page, limit);

    return {
      data: result.data.map((b) => this.toResponseDto(b)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Update a production batch
   * Validates status state-machine transitions if status is being changed
   * @param batchId - Batch UUID
   * @param updateDto - Fields to update
   * @returns Updated batch response
   * @throws NotFoundException - If batch not found
   * @throws BadRequestException - If status transition is invalid or date range invalid
   */
  async update(
    batchId: string,
    updateDto: UpdateProductionBatchDto,
  ): Promise<ProductionBatchResponseDto> {
    this.logger.log(`Updating production batch: ${batchId}`);

    const existing = await this.repository.findByIdOrNumber(batchId);
    if (!existing) {
      throw new NotFoundException(
        `Production batch with ID '${batchId}' not found`,
      );
    }

    // Validate status transition if status is being changed
    if (updateDto.status && updateDto.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(updateDto.status)) {
        throw new BadRequestException(
          `Cannot transition status from '${existing.status}' to '${updateDto.status}'. ` +
            `Allowed transitions: ${allowed.length ? allowed.join(', ') : 'none'}`,
        );
      }

      // Nếu chuyển sang Complete thì kiểm tra kho, trừ kho, và tạo lot hàng thành phẩm
      if (updateDto.status === BatchStatus.Complete) {
        try {
          // Step 1: Get batch components
          const components = await this.batchComponentRepository.findByBatchId(batchId);
          if (components.length === 0) {
            throw new BadRequestException(
              `Batch ${batchId} has no components. Cannot complete batch without components.`,
            );
          }

          // Step 2: Verify inventory availability
          await this.verifyInventoryAvailability(components);

          // Step 3: Deduct materials from inventory and create transactions
          // Extract user from request context (assuming it's passed via request)
          const performedBy = 'system'; // TODO: Get from request.user in controller
          await this.deductMaterialsFromInventory(batchId, components, performedBy);

          // Step 4: Create finished product lot
          const finishedLot = await this.createFinishedProductLot(existing, performedBy);

          this.logger.log(
            `Batch ${batchId} completed successfully. ` +
            `Materials deducted, new lot ${finishedLot.lot_id} created in Quarantine status`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to complete batch ${batchId}: ${error.message}`,
            error.stack,
          );
          throw error; // Re-throw to return appropriate HTTP status
        }
      }
    }

    // Note: manufacture_date and expiration_date are calculated when batch is approved
    // and converted to inventory_lot. Only shelf_life is stored in production_batch.

    const updated = await this.repository.update(batchId, updateDto);
    this.logger.log(`Production batch updated successfully: ${batchId}`);

    return this.toResponseDto(updated);
  }

  /**
   * Delete a production batch
   * Batches with status 'In Progress' cannot be deleted
   * @param batchId - Batch UUID
   * @returns Deletion confirmation message
   * @throws NotFoundException - If batch not found
   * @throws BadRequestException - If batch is In Progress
   */
  async remove(batchId: string): Promise<{ message: string }> {
    this.logger.log(`Deleting production batch: ${batchId}`);

    const existing = await this.repository.findByIdOrNumber(batchId);
    if (!existing) {
      throw new NotFoundException(
        `Production batch with ID '${batchId}' not found`,
      );
    }

    if (existing.status === BatchStatus.InProgress) {
      throw new BadRequestException(
        `Cannot delete a production batch with status 'In Progress'. ` +
          `Please cancel or complete the batch first.`,
      );
    }

    await this.repository.remove(batchId);
    this.logger.log(`Production batch deleted successfully: ${batchId}`);

    return { message: `Production batch '${batchId}' deleted successfully` };
  }

  /**
   * Convert a ProductionBatch document to response DTO
   * Handles Decimal128 → string serialization for batch_size
   */
  private toResponseDto(batch: any): ProductionBatchResponseDto {
    return {
      _id: batch._id?.toString() ?? '',
      batch_id: batch.batch_id,
      product_id: batch.product_id,
      batch_number: batch.batch_number,
      unit_of_measure: batch.unit_of_measure,
      shelf_life_value: batch.shelf_life_value,
      shelf_life_unit: batch.shelf_life_unit,
      status: batch.status,
      batch_size: batch.batch_size?.toString() ?? '0',
      created_date: batch.created_date,
      modified_date: batch.modified_date,
    };
  }
}
