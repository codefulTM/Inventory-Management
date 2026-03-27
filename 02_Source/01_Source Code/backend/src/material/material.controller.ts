import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { MaterialService } from './material.service';
import { CreateMaterialDto, UpdateMaterialDto } from './material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

/**
 * Material Controller
 * REST API endpoints for Material management
 * Routes: /api/materials
 */
@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  /**
   * GET /materials
   * List all materials with pagination
   * Query params: page (default: 1), limit (default: 20)
   * Accessible by: All authenticated users
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true }))
    page?: number,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number,
  ) {
    return this.materialService.findAll(page, limit);
  }

  /**
   * GET /materials/search?q=query
   * Search materials by name, material_id, or part_number
   * Query params: q (search query), page, limit
   * Accessible by: All authenticated users
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number = 20,
  ) {
    if (!query) {
      throw new BadRequestException('Search query parameter (q) is required');
    }
    return this.materialService.search(query, page, limit);
  }

  /**
   * GET /materials/type/:type
   * Filter materials by material_type
   * Route params: type (material type)
   * Query params: page, limit
   * Accessible by: All authenticated users
   */
  @Get('type/:type')
  @HttpCode(HttpStatus.OK)
  async filterByType(
    @Param('type') type: string,
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number = 20,
  ) {
    return this.materialService.filterByType(type, page, limit);
  }

  /**
   * GET /materials/:id
   * Get single material by MongoDB ID
   * Route params: id (MongoDB ObjectId)
   * Accessible by: All authenticated users
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.materialService.findById(id);
  }

  /**
   * POST /materials
   * Create new material
   * Body: CreateMaterialDto
   * Accessible by: Manager, Operator, IT Administrator
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ transform: true }))
    createDto: CreateMaterialDto,
  ) {
    return this.materialService.create(createDto);
  }

  /**
   * PUT /materials/:id
   * Update material
   * Route params: id (MongoDB ObjectId)
   * Body: UpdateMaterialDto
   * Accessible by: Manager, IT Administrator
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    updateDto: UpdateMaterialDto,
  ) {
    return this.materialService.update(id, updateDto);
  }

  /**
   * DELETE /materials/:id
   * Delete material
   * Route params: id (MongoDB ObjectId)
   * Accessible by: IT Administrator only
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.materialService.delete(id);
  }
}
