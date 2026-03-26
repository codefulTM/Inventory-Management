import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryTransactionRepository, PaginatedResponse } from './inventory-transaction.repository';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { InventoryTransactionResponseDto } from './dto/inventory-transaction-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InventoryTransactionService {
  constructor(
    private readonly repository: InventoryTransactionRepository,
  ) {}

  /**
   * Create a new inventory transaction with validation
   * @param dto Transaction creation DTO
   * @returns Created transaction
   */
  async create(
    dto: CreateInventoryTransactionDto,
  ): Promise<InventoryTransactionResponseDto> {
    // Validate required fields
    if (!dto.lot_id) {
      throw new BadRequestException('lot_id is required');
    }

    if (!dto.material_id) {
      throw new BadRequestException('material_id is required');
    }

    if (!dto.transaction_type || !['Receipt', 'Usage'].includes(dto.transaction_type)) {
      throw new BadRequestException('transaction_type must be either Receipt or Usage');
    }

    if (!dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    if (!dto.unit_of_measure) {
      throw new BadRequestException('unit_of_measure is required');
    }

    if (!dto.transaction_date) {
      throw new BadRequestException('transaction_date is required');
    }

    if (!dto.performed_by) {
      throw new BadRequestException('performed_by is required');
    }

    // Add transaction_id if not present
    const transactionData = {
      ...dto,
      transaction_id: uuidv4(),
    };

    try {
      return await this.repository.create(transactionData);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        throw new BadRequestException('Transaction with this ID already exists');
      }
      throw error;
    }
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
    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('page must be >= 1');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }

    return this.repository.findAll(filters, page, limit);
  }

  /**
   * Find all transactions for a specific lot
   * @param lotId Lot ID
   * @returns Array of transactions for the lot
   */
  async findByLotId(
    lotId: string,
  ): Promise<InventoryTransactionResponseDto[]> {
    if (!lotId) {
      throw new BadRequestException('lotId is required');
    }

    return this.repository.findByLotId(lotId);
  }
}
