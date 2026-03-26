import {
  Controller,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { InventoryTransactionResponseDto } from './dto/inventory-transaction-response.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('inventory-transactions')
@UseGuards(RolesGuard)
export class InventoryTransactionController {
  constructor(private readonly service: InventoryTransactionService) {}

  /**
   * Get all inventory transactions with optional filters and pagination
   * Only accessible to MANAGER and QC_TECHNICIAN roles
   */
  @Get()
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  async findAll(
    @Query() filters: TransactionFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    // Additional validation
    if (limit > 100) {
      throw new BadRequestException('limit cannot exceed 100');
    }

    // Convert string dates to Date objects if provided
    const processedFilters: TransactionFiltersDto = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom as any) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo as any) : undefined,
    };

    const result = await this.service.findAll(processedFilters, page, limit);
    
    // Wrap in response format: { data: { transactions, pagination } }
    // apiClient checks for response.data.data, so we structure as:
    // response.data = { data: { transactions, pagination } }
    // which unwraps to { transactions, pagination }
    // But since our result is { data: [], pagination: {} }, we wrap it again
    // to prevent unwrapping: return { data: result }
    // Actually, to prevent unwrapping, use different property name
    return {
      code: 200,
      message: 'Success',
      payload: result,
    };
  }
}
