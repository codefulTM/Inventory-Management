import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { WarehouseSlipService } from './warehouse-slip.service';
import { CreateWarehouseSlipDto } from './dto/create-warehouse-slip.dto';
import { QueryWarehouseSlipDto } from './dto/query-warehouse-slip.dto';
import { UploadWarehouseSlipAttachmentDto } from './dto/upload-warehouse-slip-attachment.dto';

const ATTACHMENT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'warehouse-slips');
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

@Controller('warehouse/slips')
@UseGuards(RolesGuard)
export class WarehouseSlipController {
  constructor(private readonly service: WarehouseSlipService) {}

  private toRequester(req: { user?: AuthenticatedUser }) {
    const actor =
      req.user?.username?.trim() ||
      req.user?.email?.trim() ||
      req.user?.keycloak_id ||
      'system';

    return { actor, role: req.user?.role };
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() dto: CreateWarehouseSlipDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.create(dto, requester);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async findAll(
    @Query() query: QueryWarehouseSlipDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const paging = { page: query.page ?? 1, limit: query.limit ?? 20 };
    const filters = {
      status: query.status,
      warehouse_id: query.warehouse_id,
      created_by: query.created_by,
      from: query.from,
      to: query.to,
    };
    const requester = this.toRequester(req);
    return this.service.getAll(filters, paging, requester);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.getOne(id, requester);
  }

  @Post(':id/attachments')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      dest: ATTACHMENT_UPLOAD_DIR,
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
    }),
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async uploadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      filename: string;
    },
    @Body() dto: UploadWarehouseSlipAttachmentDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      await unlink(join(ATTACHMENT_UPLOAD_DIR, file.filename)).catch(
        () => undefined,
      );
      throw new BadRequestException(
        'Invalid attachment type. Allowed: image/jpeg, image/png, application/pdf',
      );
    }

    const requester = this.toRequester(req);
    return this.service.addAttachment(id, file, requester, dto.source);
  }

  @Get(':id/print')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  async print(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    const slip = await this.service.getOne(id, requester);
    if (!slip) throw new NotFoundException('Warehouse slip not found');

    // Minimal HTML rendering for printing; can be replaced with template engine
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${slip.slip_number}</title></head><body><h1>Slip: ${slip.slip_number}</h1><p>Type: ${slip.type}</p><p>Warehouse: ${slip.warehouse_id}</p><p>Created by: ${slip.created_by}</p><h2>Lines</h2><ul>${(slip.lines || []).map((l: any) => `<li>${l.material_id ?? ''} - ${l.lot_id ?? ''} - ${l.quantity} ${l.unit}</li>`).join('')}</ul></body></html>`;

    return { html };
  }
}
