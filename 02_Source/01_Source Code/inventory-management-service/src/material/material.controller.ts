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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { MaterialService } from './material.service';
import { CreateMaterialDto, UpdateMaterialDto } from './material.dto';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

/**
 * MaterialController - Controller quản lý vật tư
 * 
 * Định tuyến (Routing): /materials
 * Bảo vệ bởi: JwtAuthGuard (xác thực) + RolesGuard (phân quyền)
 * 
 * Các endpoints:
 * - GET /materials - Lấy danh sách vật tư (có phân trang)
 * - GET /materials/search?q=... - Tìm kiếm vật tư
 * - GET /materials/options - Lấy danh sách cho dropdown (options)
 * - GET /materials/type/:type - Lọc theo loại vật tư
 * - GET /materials/:id - Lấy chi tiết một vật tư
 * - POST /materials - Tạo mới vật tư (Manager, Operator, IT Admin)
 * - PUT /materials/:id - Cập nhật vật tư (Manager, IT Admin)
 * - DELETE /materials/:id - Xóa vật tư (IT Admin only)
 * - GET /materials/export/excel - Export Excel (Manager only)
 * - GET /materials/export/pdf - Export PDF (Manager only)
 */
@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard) // Áp dụng guards cho toàn bộ controller
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  /**
   * GET /materials
   * Lấy danh sách vật tư có phân trang
   * 
   * Query params:
   * - page: Số trang (mặc định: 1)
   * - limit: Số bản ghi/trang (mặc định: 20)
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.QC_TECHNICIAN)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number =1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number =20,
  ) {
    return this.materialService.findAll(page, limit);
  }

  /**
   * GET /materials/search?q=query
   * Tìm kiếm vật tư theo từ khóa
   * Tìm trong: material_name, material_id, part_number
   * 
   * Query params:
   * - q: Từ khóa tìm kiếm (bắt buộc)
   * - page: Số trang
   * - limit: Số bản ghi/trang
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number =1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number =20,
  ) {
    if (!query) {
      throw new BadRequestException('Search query parameter (q) is required');
    }
    return this.materialService.search(query, page, limit);
  }

  /**
   * GET /materials/options
   * Lấy danh sách vật tư dạng options (cho dropdown/select)
   * 
   * Query params:
   * - q: Từ khóa tìm kiếm (tùy chọn)
   * - status: Lọc theo trạng thái (tùy chọn)
   * - page: Số trang
   * - limit: Số bản ghi/trang
   */
  @Get('options')
  @HttpCode(HttpStatus.OK)
  async getOptions(
    @Query('q') query?: string,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number =1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number =20,
  ) {
    return this.materialService.getOptions(query, status, page, limit);
  }

  /**
   * GET /materials/type/:type
   * Lọc vật tư theo loại (material_type)
   * 
   * Route params:
   * - type: Loại vật tư (API, Excipient, Dietary Supplement...)
   * 
   * Query params:
   * - page: Số trang
   * - limit: Số bản ghi/trang
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get('type/:type')
  @HttpCode(HttpStatus.OK)
  async filterByType(
    @Param('type') type: string,
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number =1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number =20,
  ) {
    return this.materialService.filterByType(type, page, limit);
  }

  /**
   * GET /materials/:id
   * Lấy chi tiết một vật tư theo ID
   * 
   * Route params:
   * - id: MongoDB ObjectId hoặc material_id (MAT-XXX)
   * 
   * Phân quyền: Operator, Manager, QC Technician
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.materialService.findById(id);
  }

  /**
   * POST /materials
   * Tạo mới vật tư
   * 
   * Body: CreateMaterialDto
   * - material_id: Tự động sinh nếu không cung cấp
   * - part_number: Phải duy nhất
   * - material_name: Tên vật tư
   * - material_type: Loại vật tư
   * - storage_conditions: Điều kiện bảo quản (tùy chọn)
   * 
   * Phân quyền: Manager, Operator, IT Administrator
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
   * Cập nhật thông tin vật tư
   * 
   * Route params:
   * - id: MongoDB ObjectId hoặc material_id
   * 
   * Body: UpdateMaterialDto (các trường cần cập nhật)
   * 
   * Phân quyền: Manager, IT Administrator
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
   * Xóa vật tư
   * 
   * Route params:
   * - id: MongoDB ObjectId hoặc material_id
   * 
   * Phân quyền: IT Administrator only
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.materialService.delete(id);
  }

  /**
   * GET /materials/export/excel
   * Export danh sách vật tư ra file Excel
   * 
   * Query params:
   * - search: Từ khóa tìm kiếm trước khi export (tùy chọn)
   * 
   * Trả về: File Excel (.xlsx) để download
   * Phân quyền: Manager only
   */
  @Get('export/excel')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async exportToExcel(@Query('search') search?: string, @Res() res?: Response) {
    let materials: any[] = [];

    // Nếu có từ khóa tìm kiếm → chỉ export kết quả tìm kiếm
    if (search && search.trim().length >0) {
      const result = await this.materialService.search(search, 1, 10000);
      materials = result.data;
    } else {
      // Ngược lại export tất cả
      const result = await this.materialService.findAllWithoutPagination();
      materials = result;
    }

    const buffer = await this.materialService.exportToExcel(materials);

    if (res) {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="materials_${new Date().getTime()}.xlsx"`,
      );
      res.send(buffer);
    }
  }

  /**
   * GET /materials/export/pdf
   * Export danh sách vật tư ra file PDF
   * 
   * Query params:
   * - search: Từ khóa tìm kiếm trước khi export (tùy chọn)
   * 
   * Trả về: File PDF để download
   * Phân quyền: Manager only
   */
  @Get('export/pdf')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async exportToPDF(@Query('search') search?: string, @Res() res?: Response) {
    let materials: any[] = [];

    if (search && search.trim().length >0) {
      const result = await this.materialService.search(search, 1, 10000);
      materials = result.data;
    } else {
      const result = await this.materialService.findAllWithoutPagination();
      materials = result;
    }

    const buffer = await this.materialService.exportToPDF(materials);

    if (res) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="materials_${new Date().getTime()}.pdf"`,
      );
      res.send(buffer);
    }
  }
}
