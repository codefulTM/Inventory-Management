import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Post,
} from '@nestjs/common';
import { WarehouseHierarchyService } from './warehouse-hierarchy.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

/**
 * Warehouse Hierarchy Controller
 * REST API endpoints for Warehouse Hierarchy management
 * Routes: /api/warehouse
 */
@Controller('warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseHierarchyController {
  constructor(
    private readonly warehouseHierarchyService: WarehouseHierarchyService,
  ) {}

  /**
   * GET /warehouse/hierarchy
   * Get complete warehouse hierarchy with real-time inventory counts
   * Accessible by: Manager
   * Returns: Tree structure of warehouse -> zone -> shelf -> bin with quantities
   */
  @Get('hierarchy')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async getWarehouseHierarchy() {
    return this.warehouseHierarchyService.getWarehouseHierarchy();
  }

  /**
   * GET /warehouse/location/:code
   * Get details of a specific location with current inventory snapshot
   * Route params: code (location code)
   * Accessible by: Manager
   */
  @Get('location/:code')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async getLocationDetails(
    @Param('code') code: string,
  ): Promise<Record<string, unknown>> {
    return this.warehouseHierarchyService.getLocationDetails(code);
  }

  /**
   * GET /warehouse/inventory/:code
   * Get total inventory count for a location (including children)
   * Route params: code (location code)
   * Accessible by: Manager
   */
  @Get('inventory/:code')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async getLocationInventoryCount(@Param('code') code: string) {
    const count =
      await this.warehouseHierarchyService.getLocationInventoryCount(code);
    return { location_code: code, total_quantity: count };
  }

  /**
   * PUT /warehouse/location/:code/notes
   * Update notes for a location (add notes directly on bin level)
   * Route params: code (location code)
   * Body: { notes: string }
   * Accessible by: Manager
   */
  @Put('location/:code/notes')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async updateLocationNotes(
    @Param('code') code: string,
    @Body('notes') notes: string,
  ) {
    return this.warehouseHierarchyService.updateLocationNotes(code, notes);
  }

  /**
   * POST /warehouse/initialize-example
   * Initialize example warehouse hierarchy (for development/testing only)
   * Accessible by: IT Administrator
   */
  @Post('initialize-example')
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.CREATED)
  async initializeExampleHierarchy() {
    await this.warehouseHierarchyService.initializeExampleHierarchy();
    return { message: 'Example warehouse hierarchy initialized successfully' };
  }
}
