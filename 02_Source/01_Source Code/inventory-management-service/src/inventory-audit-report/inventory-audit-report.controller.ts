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

/**
 * Controller xử lý các API liên quan đến báo cáo kiểm kê tồn kho
 * Chỉ cho phép Manager thực hiện các thao tác
 * Các route: POST /inventory-audit-reports (tạo), GET (danh sách), GET /:id (chi tiết), GET /:id/download (tải PDF)
 */
@Controller('inventory-audit-reports')
@UseGuards(RolesGuard)
export class InventoryAuditReportController {
  constructor(private readonly service: InventoryAuditReportService) {}

  /**
   * Lấy thông tin người thực hiện từ JWT token
   * Ưu tiên lấy: keycloak_id -> username -> email -> 'system' (mặc định)
   * @param req - Request object chứa thông tin user đã được xác thực bởi JWT strategy
   * @returns Object chứa actor (người thực hiện) và role của họ
   */
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

  /**
   * API tạo mới một báo cáo kiểm kê tồn kho
   * Quy trình: Tạo draft -> Đánh dấu PROCESSING -> Tạo snapshot dữ liệu -> Render PDF -> Ký số -> Lưu trữ -> Đánh dấu READY
   * Chỉ Manager mới có quyền thực hiện
   * 
   * @param dto - Dữ liệu tạo báo cáo (period_from, period_to, scope_warehouse_ids, ...)
   * @param req - Request object chứa thông tin user
   * @returns Thông tin báo cáo đã tạo (report_id, status, requested_by, requested_at)
   */
  @Post()
  @Roles(UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,        // Loại bỏ các field không khai báo trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu có field lạ
      transform: true,        // Tự động chuyển đổi kiểu dữ liệu
    }),
  )
  async create(
    @Body() dto: CreateInventoryAuditReportDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.service.create(dto, this.toRequester(req));
  }

  /**
   * API lấy danh sách các báo cáo kiểm kê (có phân trang và lọc)
   * Chỉ Manager mới có quyền xem
   * 
   * Các tham số query có thể dùng:
   * - status: Lọc theo trạng thái (PENDING, PROCESSING, READY, FAILED)
   * - requested_by: Lọc theo người yêu cầu
   * - from/to: Lọc theo khoảng thời gian tạo
   * - page/limit: Phân trang
   * 
   * @param query - Các tham số lọc và phân trang
   * @returns Danh sách báo cáo, tổng số bản ghi, page và limit hiện tại
   */
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

  /**
   * API lấy chi tiết một báo cáo kiểm kê theo ID
   * Chỉ Manager mới có quyền xem
   * 
   * @param reportId - ID của báo cáo cần tra cứu
   * @returns Thông tin chi tiết của báo cáo
   * @throws NotFoundException nếu không tìm thấy báo cáo
   */
  @Get(':id')
  @Roles(UserRole.MANAGER)
  async findOne(@Param('id') reportId: string) {
    return this.service.findOne(reportId);
  }

  /**
   * API tải xuống file PDF của báo cáo kiểm kê
   * Chỉ có thể tải khi báo cáo đã ở trạng thái READY
   * 
   * Headers trả về:
   * - Content-Type: application/pdf
   * - Content-Disposition: attachment; filename="<report_id>.pdf"
   * - Cache-Control: no-store (không cache file nhạy cảm)
   * 
   * @param reportId - ID của báo cáo cần tải
   * @param res - Response object để gửi file
   * @throws BadRequestException nếu báo cáo chưa sẵn sàng
   * @throws NotFoundException nếu không tìm thấy file
   */
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
