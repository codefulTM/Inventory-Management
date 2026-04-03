import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('transactions')
@UseGuards(RolesGuard)
export class InventoryTransactionController {
  constructor(private readonly service: InventoryTransactionService) {}

  // danh sách với filter & paging
  @Get()
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  async findAll(
    @Query('lot_id') lot_id?: string,
    @Query('transaction_type') transaction_type?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const filters: any = {};
    if (lot_id) filters.lot_id = lot_id;
    if (transaction_type) filters.transaction_type = transaction_type;
    if (search) filters.search = search;
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);

    const paging = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    return this.service.getAll(filters, paging);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOne(id);
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateInventoryTransactionDto) {
    return this.service.create(dto);
  }

  @Post('bulk')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createBulk(@Body() dtos: CreateInventoryTransactionDto[]) {
    return this.service.createMany(dtos);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryTransactionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
