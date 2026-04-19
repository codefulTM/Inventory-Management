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
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.warehouseService.findAll(page, limit);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    if (!query)
      throw new BadRequestException('Search query parameter (q) is required');
    return this.warehouseService.search(query, page, limit);
  }

  @Get('options')
  @HttpCode(HttpStatus.OK)
  async getOptions(
    @Query('q') query?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.warehouseService.getOptions(query, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.warehouseService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(new ValidationPipe({ transform: true })) createDto: any) {
    return this.warehouseService.create(createDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    updateDto: any,
  ) {
    return this.warehouseService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.warehouseService.delete(id);
  }

  // Example export endpoint placeholder (optional)
  @Get('export/sample')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async exportSample(@Res() res?: Response) {
    // Minimal example: return a small CSV as attachment
    if (res) {
      const csv = 'warehouse_id,warehouse_name\nSAMPLE,Sample Warehouse\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="warehouses_sample.csv"`,
      );
      res.send(csv);
    }
  }
}
