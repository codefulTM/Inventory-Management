import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ProductionBatchService } from './production-batch.service';
import { BatchComponentService } from './batch-component.service';
import { CreateProductionBatchDto } from './dto/create-production-batch.dto';
import { UpdateProductionBatchDto } from './dto/update-production-batch.dto';
import { CreateBatchComponentDto } from './dto/create-batch-component.dto';
import { UpdateBatchComponentDto } from './dto/update-batch-component.dto';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { CurrentUser } from '../common/auth/decorators/current-user.decorator';
import { UserRole } from '../schemas/user.schema';
import type { AuthenticatedUser } from '../common/auth/jwt.strategy';

/**
 * ProductionBatch Controller
 * REST API endpoints for ProductionBatch and BatchComponent management
 * Routes: /production-batches
 */
@Controller('production-batches')
export class ProductionBatchController {
  constructor(
    private readonly productionBatchService: ProductionBatchService,
    private readonly batchComponentService: BatchComponentService,
  ) {}

  // ─── ProductionBatch endpoints ───────────────────────────────────────────────

  /**
   * GET /production-batches
   * List all production batches with pagination
   * Query params: page (default: 1), limit (default: 20)
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    // Trả về trực tiếp object phân trang, không bọc thêm { data: ... }
    return await this.productionBatchService.findAll(page, limit);
  }

  /**
   * GET /production-batches/product/:productId
   * List all batches for a given product (material)
   * Query params: page, limit
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  async findByProductId(
    @Param('productId') productId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return await this.productionBatchService.findByProductId(
      productId,
      page,
      limit,
    );
  }

  /**
   * GET /production-batches/status/:status
   * List all batches with a given status
   * Query params: page, limit
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get('status/:status')
  @HttpCode(HttpStatus.OK)
  async findByStatus(
    @Param('status') status: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return await this.productionBatchService.findByStatus(status, page, limit);
  }

  /**
   * GET /production-batches/:id
   * Get a single production batch by batch_id
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.productionBatchService.findOne(id);
  }

  /**
   * POST /production-batches
   * Create a new production batch
   * Body: CreateProductionBatchDto
   * Cho phép cả Operator và Manager tạo batch
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ transform: true }))
    createDto: CreateProductionBatchDto,
  ) {
    return this.productionBatchService.create(createDto);
  }

  /**
   * PATCH /production-batches/:id
   * Update a production batch (partial update)
   * Body: UpdateProductionBatchDto
   * Cho phép cả Operator và Manager cập nhật batch
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    updateDto: UpdateProductionBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const performedBy = user?.username || user?.email || user?.keycloak_id || 'system';
    return this.productionBatchService.update(id, updateDto, performedBy);
  }

  /**
   * DELETE /production-batches/:id
   * Delete a production batch
   * Batches with status 'In Progress' cannot be deleted
   */
  @Roles(UserRole.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.productionBatchService.remove(id);
  }

  // ─── BatchComponent nested endpoints ─────────────────────────────────────────

  /**
   * GET /production-batches/:id/components
   * List all components for a given production batch
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get(':id/components')
  @HttpCode(HttpStatus.OK)
  async findComponents(@Param('id') batchId: string) {
    return this.batchComponentService.findByBatchId(batchId);
  }

  /**
   * GET /production-batches/:id/components/:componentId
   * Get a single batch component
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get(':id/components/:componentId')
  @HttpCode(HttpStatus.OK)
  async findOneComponent(
    @Param('id') batchId: string,
    @Param('componentId') componentId: string,
  ) {
    return this.batchComponentService.findOne(batchId, componentId);
  }

  /**
   * POST /production-batches/:id/components
   * Add a component (inventory lot) to a production batch
   * Body: CreateBatchComponentDto
   * Cho phép cả Operator và Manager thêm nguyên liệu khi batch ở trạng thái pending
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Post(':id/components')
  @HttpCode(HttpStatus.CREATED)
  async createComponent(
    @Param('id') batchId: string,
    @Body(new ValidationPipe({ transform: true }))
    createDto: CreateBatchComponentDto,
  ) {
    console.log(`[Controller] POST /production-batches/${batchId}/components`);
    console.log(`[Controller] Body:`, createDto);
    console.log(`[Controller] Calling service.create(${batchId}, ...)`);
    return this.batchComponentService.create(batchId, createDto);
  }

  /**
   * PATCH /production-batches/:id/components/:componentId
   * Update a batch component (partial update)
   * Body: UpdateBatchComponentDto
   * Cho phép cả Operator và Manager cập nhật nguyên liệu khi batch ở trạng thái pending
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Patch(':id/components/:componentId')
  @HttpCode(HttpStatus.OK)
  async updateComponent(
    @Param('id') batchId: string,
    @Param('componentId') componentId: string,
    @Body(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    updateDto: UpdateBatchComponentDto,
  ) {
    return this.batchComponentService.update(batchId, componentId, updateDto);
  }

  /**
   * DELETE /production-batches/:id/components/:componentId
   * Remove a component from a production batch
   * Cho phép cả Operator và Manager xóa nguyên liệu khi batch ở trạng thái pending
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Delete(':id/components/:componentId')
  @HttpCode(HttpStatus.OK)
  async removeComponent(
    @Param('id') batchId: string,
    @Param('componentId') componentId: string,
  ) {
    return this.batchComponentService.remove(batchId, componentId);
  }
}
