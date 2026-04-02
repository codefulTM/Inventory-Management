import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { ImportExportAttachmentSource } from '../schemas/import-export-order.schema';
import { ImportExportOrderService } from './import-export-order.service';
import { CreateImportExportOrderDto } from './dto/create-import-export-order.dto';
import {
  QueryImportExportOrderDto,
  ResolveImportExportOrderScanDto,
} from './dto/query-import-export-order.dto';
import { UpdateImportExportOrderDto } from './dto/update-import-export-order.dto';
import { UploadImportExportOrderAttachmentDto } from './dto/upload-import-export-order-attachment.dto';

const ATTACHMENT_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'import-export-orders',
);
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

@Controller('import-export-orders')
@UseGuards(RolesGuard)
export class ImportExportOrderController {
  constructor(private readonly service: ImportExportOrderService) {}

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

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() dto: CreateImportExportOrderDto,
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
    @Query() query: QueryImportExportOrderDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const paging = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };

    const filters = {
      status: query.status,
      order_type: query.order_type,
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

  @Post('scan/resolve')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resolveScan(
    @Body() dto: ResolveImportExportOrderScanDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return await this.service.resolveScanCode(dto.scan_code, requester);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImportExportOrderDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return await this.service.update(id, dto, requester);
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
    @Body() dto: UploadImportExportOrderAttachmentDto,
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
    return this.service.addAttachment(
      id,
      file,
      requester,
      dto.source ?? ImportExportAttachmentSource.UPLOAD,
    );
  }
}
