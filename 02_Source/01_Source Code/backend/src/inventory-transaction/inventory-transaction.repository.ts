import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from '../schemas/inventory-transaction.schema';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { InventoryTransactionResponseDto } from './dto/inventory-transaction-response.dto';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable()
export class InventoryTransactionRepository {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private model: Model<InventoryTransactionDocument>,
  ) {}

  /**
   * Create a new inventory transaction
   * @param dto Transaction creation DTO
   * @returns Created transaction document
   */
  async create(
    dto: CreateInventoryTransactionDto,
  ): Promise<InventoryTransactionResponseDto> {
    const now = new Date();
    const transaction = new this.model({
      ...dto,
      created_date: now,
      modified_date: now,
    });

    const savedTransaction = await transaction.save();
    return this.mapToResponseDto(savedTransaction);
  }

  /**
   * Find all transactions with optional filtering and pagination
   * @param filters Query filters
   * @param page Page number (1-indexed)
   * @param limit Results per page
   * @returns Paginated transaction list
   */
  async findAll(
    filters: TransactionFiltersDto,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<InventoryTransactionResponseDto>> {
    // Build query object from filters (only include provided filters)
    const query: any = {};

    if (filters.lot_id) {
      query.lot_id = filters.lot_id;
    }

    if (filters.material_id) {
      query.material_id = filters.material_id;
    }

    if (filters.transaction_type) {
      query.transaction_type = filters.transaction_type;
    }

    if (filters.performed_by) {
      query.performed_by = filters.performed_by;
    }

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      query.transaction_date = {};
      if (filters.dateFrom) {
        query.transaction_date.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.transaction_date.$lte = new Date(filters.dateTo);
      }
    }

    // Reference number text search
    if (filters.reference_number) {
      query.reference_number = {
        $regex: filters.reference_number,
        $options: 'i',
      };
    }

    // Execute query with pagination
    const [data, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ transaction_date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.model.countDocuments(query),
    ]);

    return {
      data: data.map((doc) => this.mapToResponseDto(doc)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all transactions for a specific lot
   * @param lotId Lot ID
   * @returns Array of transactions sorted by date (newest first)
   */
  async findByLotId(
    lotId: string,
  ): Promise<InventoryTransactionResponseDto[]> {
    const transactions = await this.model
      .find({ lot_id: lotId })
      .sort({ transaction_date: -1 })
      .lean();

    return transactions.map((doc) => this.mapToResponseDto(doc));
  }

  /**
   * Map document to response DTO
   * @param doc Mongoose document
   * @returns Response DTO
   */
  private mapToResponseDto(
    doc: any,
  ): InventoryTransactionResponseDto {
    return {
      _id: doc._id?.toString(),
      transaction_id: doc.transaction_id,
      lot_id: doc.lot_id,
      material_id: doc.material_id,
      transaction_type: doc.transaction_type,
      quantity: doc.quantity,
      unit_of_measure: doc.unit_of_measure,
      transaction_date: doc.transaction_date,
      reference_number: doc.reference_number,
      performed_by: doc.performed_by,
      notes: doc.notes,
      created_date: doc.created_date,
      modified_date: doc.modified_date,
    };
  }
}
