import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { InventoryLotService } from './inventory-lot.service';
import {
  CreateInventoryLotDto,
  UpdateInventoryLotDto,
  InventoryLotSearchParams,
  InventoryLotStatus,
} from './inventory-lot.dto';
import { BulkQuarantineDto } from '../qc-test/dto/bulk-quarantine.dto';
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { RolesGuard } from "../common/auth/roles.guard";
import { Roles } from "../common/auth/decorators/roles.decorator";
import { UserRole } from "../schemas/user.schema";
import { CurrentUser } from "../common/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/auth/jwt.strategy";

/**
 * InventoryLotController - Controller quản lý lô hàng tồn kho
 * 
 * Định tuyến (Routing): /inventory-lots
 * Bảo vệ bởi: JwtAuthGuard + RolesGuard
 * 
 * Các endpoints:
 * - POST /inventory-lots - Tạo mới lô hàng (Operator, Manager, QC)
 * - POST /inventory-lots/bulk-quarantine - Cập nhật hàng loạt sang Quarantine (QC, Manager)
 * - GET /inventory-lots - Lấy danh sách có phân trang (Operator, Manager, QC)
 * - GET /inventory-lots/statistics - Thống kê lô hàng (Operator, Manager, QC)
 * - GET /inventory-lots/expiring-soon - Lô sắp hết hạn (Operator, Manager, QC)
 * - GET /inventory-lots/expired - Lô đã hết hạn (Operator, Manager, QC)
 * - GET /inventory-lots/samples - Lô mẫu (Operator, Manager, QC)
 * - GET /inventory-lots/search - Tìm kiếm lô hàng (Operator, Manager, QC)
 * - GET /inventory-lots/options - Lấy options cho dropdown (Operator, Manager, QC)
 * - GET /inventory-lots/filter - Lọc lô theo nhiều tiêu chí (Operator, Manager, QC)
 * - GET /inventory-lots/material/:material_id - Lô theo vật tư (Operator, Manager, QC)
 * - GET /inventory-lots/samples/:parent_lot_id - Mẫu của lô cha (Operator, Manager, QC)
 * - GET /inventory-lots/:id - Chi tiết lô hàng (Operator, Manager, QC)
 * - PUT /inventory-lots/:id - Cập nhật lô (Manager only)
 * - PUT /inventory-lots/:id/status/:status - Cập nhật trạng thái (Manager only)
 * - DELETE /inventory-lots/:id - Xóa lô (Manager only)
 */
@Controller('inventory-lots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryLotController {
  constructor(private readonly inventoryLotService: InventoryLotService) {}

  // ==================== CRUD Operations ====================

  /**
   * POST /inventory-lots
   * Tạo mới lô hàng
   * Tự động sinh lot_id nếu không cung cấp
   * Tự động tạo Receipt transaction
   * 
   * Body: CreateInventoryLotDto
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @Post()
  async create(@Body(ValidationPipe) dto: CreateInventoryLotDto) {
    return await this.inventoryLotService.create(dto);
  }

  /**
   * POST /inventory-lots/bulk-quarantine
   * Cập nhật hàng loạt nhiều lô sang trạng thái Quarantine
   * 
   * Body: { lot_ids: string[] }
   * Phân quyền: QC Technician, Manager
   */
  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Post('bulk-quarantine')
  async bulkQuarantine(@Body(ValidationPipe) dto: BulkQuarantineDto) {
    return await this.inventoryLotService.bulkQuarantine(dto.lot_ids);
  }

  /**
   * GET /inventory-lots
   * Lấy danh sách lô hàng có phân trang
   * 
   * Query params:
   * - page: Số trang (mặc định: 1)
   * - limit: Số bản ghi/trang (mặc định: 10)
   * - status: Lọc theo trạng thái (tùy chọn)
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    if (status) {
      return await this.inventoryLotService.findByStatus(
        status,
        parseInt(page, 10),
        parseInt(limit, 10),
      );
    }
    return await this.inventoryLotService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * GET /inventory-lots/statistics
   * Thống kê lô hàng
   * Bao gồm: tổng, theo trạng thái, sắp hết hạn, đã hết hạn
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('statistics')
  async getStatistics() {
    return await this.inventoryLotService.getLotsStatistics();
  }

  /**
   * GET /inventory-lots/expiring-soon
   * Lấy danh sách lô sắp hết hạn
   * 
   * Query params:
   * - days: Số ngày tới (mặc định: 30)
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('expiring-soon')
  async getExpiringSoon(@Query('days') days: string = '30') {
    return await this.inventoryLotService.getExpiringSoon(parseInt(days, 10));
  }

  /**
   * GET /inventory-lots/expired
   * Lấy danh sách lô đã hết hạn
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('expired')
  async getExpiredLots() {
    return await this.inventoryLotService.getExpiredLots();
  }

  /**
   * GET /inventory-lots/samples
   * Lấy danh sách lô mẫu (is_sample = true)
   * 
   * Query params: page, limit
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('samples')
  async findSampleLots(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return await this.inventoryLotService.findSampleLots(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * GET /inventory-lots/search
   * Tìm kiếm lô hàng theo từ khóa
   * Tìm trong: manufacturer_name, manufacturer_lot, supplier_name, lot_id
   * 
   * Query params: q (bắt buộc), page, limit
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!query) {
      return { data: [], total: 0, page: 1, limit };
    }
    return await this.inventoryLotService.search(
      query,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * GET /inventory-lots/options
   * Lấy danh sách lô dạng options (cho dropdown)
   * 
   * Query params: q, material_id, status, exclude_status, warehouse_id, page, limit
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('options')
  async getOptions(
    @Query('q') q?: string,
    @Query('material_id') material_id?: string,
    @Query('status') status?: string,
    @Query('exclude_status') exclude_status?: string,
    @Query('warehouse_id') warehouse_id?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const exclude_statuses = exclude_status
      ? exclude_status
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined;

    return await this.inventoryLotService.getOptions(
      {
        q,
        material_id,
        status,
        exclude_statuses,
        warehouse_id,
      },
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * GET /inventory-lots/filter
   * Lọc lô hàng theo nhiều tiêu chí
   * 
   * Query params: material_id, status, is_sample, manufacturer_name, page, limit
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('filter')
  async filter(
    @Query('material_id') material_id?: string,
    @Query('status') status?: string,
    @Query('is_sample') is_sample?: string,
    @Query('manufacturer_name') manufacturer_name?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const filter: InventoryLotSearchParams = {};
    if (material_id) filter.material_id = material_id;
    if (status) filter.status = status as InventoryLotStatus;
    if (is_sample) filter.is_sample = is_sample === 'true';
    if (manufacturer_name) filter.manufacturer_name = manufacturer_name;

    return await this.inventoryLotService.filterLots(
      filter,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * GET /inventory-lots/material/:material_id
   * Lấy tất cả lô của một vật tư
   * 
   * Route params: material_id
   * Query params: page, limit
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('material/:material_id')
  async findByMaterialId(
    @Param('material_id') material_id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return await this.inventoryLotService.findByMaterialId(
      material_id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * GET /inventory-lots/samples/:parent_lot_id
   * Lấy các lô mẫu của một lô cha
   * 
   * Route params: parent_lot_id
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('samples/:parent_lot_id')
  async findSamplesByParentLot(@Param('parent_lot_id') parent_lot_id: string) {
    return await this.inventoryLotService.findSamplesByParentLot(parent_lot_id);
  }

  /**
   * GET /inventory-lots/:id
   * Lấy chi tiết một lô hàng
   * 
   * Route params: id (lot_id)
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.inventoryLotService.findById(id);
  }

  /**
   * PUT /inventory-lots/:id
   * Cập nhật lô hàng
   * Tự động tạo InventoryTransaction nếu số lượng thay đổi
   * Tự động ghi Audit Log
   * 
   * Route params: id (lot_id)
   * Body: UpdateInventoryLotDto
   * Phân quyền: Manager only
   */
  @Roles(UserRole.MANAGER)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateInventoryLotDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const actor = user
      ? { username: user.username, user_id: user.keycloak_id }
      : undefined;
    const ctx = {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    return await this.inventoryLotService.update(id, dto, actor, ctx);
  }

  /**
   * PUT /inventory-lots/:id/status/:status
   * Cập nhật trạng thái lô hàng
   * Validate chuyển đổi trạng thái hợp lệ
   * 
   * Route params: id (lot_id), status
   * Phân quyền: Manager only
   */
  @Put(':id/status/:status')
  async updateStatus(@Param('id') id: string, @Param('status') status: string) {
    return await this.inventoryLotService.updateStatus(id, status);
  }

  /**
   * DELETE /inventory-lots/:id
   * Xóa lô hàng
   * Chỉ cho phép xóa lô Quarantine và chưa có giao dịch
   * 
   * Route params: id (lot_id)
   * Phân quyền: Manager only
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.inventoryLotService.delete(id);
  }
}
