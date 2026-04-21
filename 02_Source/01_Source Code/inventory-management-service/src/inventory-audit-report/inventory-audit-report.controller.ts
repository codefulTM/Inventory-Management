import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { AuthenticatedUser } from '../common/auth/jwt.strategy';
import { CreateInventoryAuditReportDto } from './dto/create-inventory-audit-report.dto';
import { QueryInventoryAuditReportDto } from './dto/query-inventory-audit-report.dto';
import { InventoryAuditReportService } from './inventory-audit-report.service';

@Controller('inventory-audit-reports')
@UseGuards(RolesGuard)
export class InventoryAuditReportController {
  constructor(private readonly service: InventoryAuditReportService) {}

  private toRequester(req: { user?: AuthenticatedUser }) {
    const actor =
      req.user?.keycloak_id?.trim() ||
      req.user?.username?.trim() ||
      req.user?.email?.trim() ||
      'system';

    return {
      actor,
      role: req.user?.role,
    };
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Body() dto: CreateInventoryAuditReportDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.service.create(dto, this.toRequester(req));
  }

  @Get()
  @Roles(UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async findAll(@Query() query: QueryInventoryAuditReportDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  async findOne(@Param('id') reportId: string) {
    return this.service.findOne(reportId);
  }

  @Get(':id/download')
  @Roles(UserRole.MANAGER)
  async download(
    @Param('id') reportId: string,
    @Res() res: Response,
  ) {
    const { fileBuffer, fileName } = await this.service.download(reportId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    res.send(fileBuffer);
  }
}
