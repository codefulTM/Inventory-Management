import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
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
import { RolesGuard } from '../common/auth/roles.guard';
import { AuthenticatedUser } from '../common/auth/jwt.strategy';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { WarehouseSlipService } from './warehouse-slip.service';
import { CreateWarehouseSlipDto } from './dto/create-warehouse-slip.dto';
import { QueryWarehouseSlipDto } from './dto/query-warehouse-slip.dto';
import { UploadWarehouseSlipAttachmentDto } from './dto/upload-warehouse-slip-attachment.dto';
import { RejectWarehouseSlipDto } from './dto/reject-warehouse-slip.dto';

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

  @Post(':id/approve')
  @Roles(UserRole.MANAGER)
  async approve(
    @Param('id') id: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.approve(id, requester);
  }

  @Post(':id/reject')
  @Roles(UserRole.MANAGER)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectWarehouseSlipDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.reject(id, dto.reason, requester);
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
      type: query.type,
    };
    const requester = this.toRequester(req);
    return this.service.getAll(filters, paging, requester);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  async findOne(
    @Param('id') id: string,
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
    @Param('id') id: string,
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
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  async print(
    @Param('id') id: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    const slip = await this.service.getOne(id, requester);
    if (!slip) throw new NotFoundException('Warehouse slip not found');

    const linesHtml = (slip.lines || [])
      .map(
        (l: any) =>
          `      <li>${l.material_id || ''} - ${l.quantity} ${l.unit || ''}</li>`,
      )
      .join('\n');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${slip.slip_number}</title>
    <style>
      body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 16px; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      h2 { margin-top: 12px; }
      ul { margin: 6px 0 0 18px; }
      .meta { margin-bottom: 8px; }
      .attachments { margin-top: 12px; }
      .attachment { margin: 6px 0; }
      img.preview { max-width: 200px; max-height: 200px; display:block; margin-top:4px; }
    </style>
  </head>
  <body>
    <h1>${slip.slip_number}</h1>
    <p class="meta">Type: ${slip.type} &nbsp; | &nbsp; Warehouse: ${slip.warehouse_id} &nbsp; | &nbsp; Created by: ${slip.created_by}</p>
    <h2>Lines</h2>
    <ul>
${linesHtml}
    </ul>
    ${
      Array.isArray(slip.attachments) && slip.attachments.length
        ? `
    <h2>Attachments</h2>
    <div class="attachments">
      ${slip.attachments
        .map((a: any) => {
          const safeUrl = a.url || '';
          if ((a.mime_type || '').startsWith('image/')) {
            return `<div class="attachment"><div>${a.original_name}</div><img class="preview" src="${safeUrl}" alt="${a.original_name}"/></div>`;
          }
          return `<div class="attachment"><a href="${safeUrl}">${a.original_name}</a></div>`;
        })
        .join('\n')}
    </div>
    `
        : ''
    }
  </body>
</html>`;

    return html;
  }
}
