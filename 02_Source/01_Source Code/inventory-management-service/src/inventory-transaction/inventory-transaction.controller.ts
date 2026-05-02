import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { RolesGuard } from '../common/auth/roles.guard';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { AuthenticatedUser } from '../common/auth/jwt.strategy';
import { QueryMyHistoryDto } from './dto/query-my-history.dto';
import { CurrentUser } from '../common/auth/decorators/current-user.decorator';

/**
 * InventoryTransactionController - Controller quản lý giao dịch tồn kho
 * 
 * Định tuyến (Routing): /transactions
 * Bảo vệ bởi: RolesGuard (JwtAuthGuard đã đăng ký global)
 * 
 * Các endpoints:
 * - GET /transactions - Lấy danh sách có phân trang (Manager, QC)
 * - GET /transactions/my-history - Lịch sử giao dịch cá nhân (Operator only)
 * - GET /transactions/my-history/:id - Chi tiết giao dịch cá nhân (Operator only)
 * - GET /transactions/:id - Chi tiết giao dịch (Manager, QC)
 * - POST /transactions - Tạo giao dịch (Manager, QC)
 * - POST /transactions/bulk - Tạo hàng loạt (Manager, QC)
 * - PATCH /transactions/:id - Cập nhật (Manager, QC)
 * - DELETE /transactions/:id - Xóa (Manager, QC)
 */
@Controller('transactions')
@UseGuards(RolesGuard)
export class InventoryTransactionController {
  constructor(private readonly service: InventoryTransactionService) {}

  /**
   * Helper: Lấy thông tin người yêu cầu từ request
   * Ưu tiên: username → email → keycloak_id → 'system'
   */
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

  // ==================== Lấy danh sách giao dịch ====================

  /**
   * GET /transactions
   * Lấy danh sách giao dịch có phân trang và lọc
   * 
   * Query params:
   * - lot_id: Lọc theo lô hàng
   * - transaction_type: Lọc theo loại giao dịch
   * - search: Tìm kiếm theo transaction_id, performed_by
   * - from, to: Lọc theo khoảng thời gian (transaction_date)
   * - page: Số trang (mặc định: 1)
   * - limit: Số bản ghi/trang (mặc định: 20)
   * 
   * Phân quyền: Manager, QC Technician
   */
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

  // ==================== Lịch sử cá nhân ====================

  /**
   * GET /transactions/my-history
   * Lấy lịch sử giao dịch của người dùng hiện tại
   * 
   * Query params (DTO): from, to, transaction_type, keyword, page, limit
   * Sử dụng ValidationPipe với whitelist để chỉ lấy các trường hợp lệ
   * 
   * Phân quyền: Operator only
   */
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

  /**
   * GET /transactions/my-history/:id
   * Xem chi tiết một giao dịch trong lịch sử cá nhân
   * Kiểm tra quyền: chỉ người thực hiện mới được xem
   * 
   * Route params: id (transaction_id)
   * Phân quyền: Operator only
   */
  @Get('my-history/:id')
  @Roles(UserRole.OPERATOR)
  async findMyHistoryDetail(
    @Param('id') transactionId: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.getMyHistoryDetail(transactionId, requester.actor);
  }

  // ==================== Chi tiết giao dịch ====================

  /**
   * GET /transactions/:id
   * Xem chi tiết một giao dịch
   * Tìm được cả theo MongoDB _id và transaction_id
   * 
   * Route params: id (_id hoặc transaction_id)
   * Phân quyền: Manager, QC Technician
   */
  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  async findOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  // ==================== Tạo giao dịch ====================

  /**
   * POST /transactions
   * Tạo mới một giao dịch tồn kho
   * Tự động phân loại theo transaction_type để xử lý nghiệp vụ
   * 
   * Body: CreateInventoryTransactionDto
   * Phân quyền: Manager, QC Technician
   */
  @Post()
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateInventoryTransactionDto) {
    return this.service.create(dto);
  }

  /**
   * POST /transactions/bulk
   * Tạo hàng loạt giao dịch
   * Tái sử dụng create() để đảm bảo validation cho từng cái
   * 
   * Body: CreateInventoryTransactionDto[]
   * Phân quyền: Manager, QC Technician
   */
  @Post('bulk')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createBulk(@Body() dtos: CreateInventoryTransactionDto[]) {
    return this.service.createMany(dtos);
  }

  // ==================== Cập nhật/Xóa ====================

  /**
   * PATCH /transactions/:id
   * Cập nhật giao dịch (một số trường)
   * 
   * Route params: id (transaction_id - không phải _id)
   * Body: UpdateInventoryTransactionDto
   * Phân quyền: Manager, QC Technician
   */
  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryTransactionDto,
  ) {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /transactions/:id
   * Xóa giao dịch
   * 
   * Route params: id (transaction_id - không phải _id)
   * Phân quyền: Manager, QC Technician
   */
  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
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
  async findOne(@Param('id') id: string) {
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
    @Param('id') id: string,
    @Body() dto: UpdateInventoryTransactionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
