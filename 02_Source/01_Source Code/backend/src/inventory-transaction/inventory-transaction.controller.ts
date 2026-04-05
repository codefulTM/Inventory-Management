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
  Req,
} from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { QueryMyHistoryDto } from './dto/query-my-history.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('transactions')
@UseGuards(RolesGuard)
export class InventoryTransactionController {
  constructor(private readonly service: InventoryTransactionService) {}

  private toRequester(req: { user?: AuthenticatedUser }) {
    const actor =
      req.user?.username?.trim() ||
      req.user?.email?.trim() ||
      req.user?.keycloak_id ||
      'system';

    return {
      actor,
      role: req.user?.role,
    };
  }

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

  @Get('my-history')
  @Roles(UserRole.OPERATOR)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async findMyHistory(
    @Query() query: QueryMyHistoryDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const filters = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      transaction_type: query.transaction_type,
      keyword: query.keyword,
    };
    const paging = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };

    const requester = this.toRequester(req);
    return this.service.getMyHistory(filters, paging, requester.actor);
  }

  @Get('my-history/:id')
  @Roles(UserRole.OPERATOR)
  async findMyHistoryDetail(
    @Param('id') transactionId: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.getMyHistoryDetail(transactionId, requester.actor);
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
