// Import các decorator và pipe từ NestJS để xử lý request và validate dữ liệu
import {
  Controller,
  Get,
  Query,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
// Import kiểu Response từ Express để xử lý HTTP response
import type { Response } from 'express';
// Import service để xử lý logic nghiệp vụ audit log
import { AuditLogService } from './audit-log.service';
// Import enum định nghĩa các hành động có thể audit
import { AuditAction } from './audit-log.schema';
// Import decorator kiểm tra quyền truy cập
import { Roles } from '../common/auth/decorators/roles.decorator';
// Import enum các vai trò người dùng
import { UserRole } from '../schemas/user.schema';

/**
 * Controller quản lý các API liên quan đến Audit Log (Nhật ký kiểm toán)
 * Chỉ IT Administrator mới có quyền truy cập các API này
 */
@Controller('audit-logs')
@Roles(UserRole.IT_ADMINISTRATOR)
export class AuditLogController {
  /**
   * Constructor: Tiêm AuditLogService để sử dụng trong controller
   * @param auditLogService - Service xử lý logic nghiệp vụ audit log
   */
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * API lấy danh sách audit log với các bộ lọc và phân trang
   * GET /audit-logs
   * 
   * @param username - Lọc theo tên người dùng (tùy chọn)
   * @param action - Lọc theo loại hành động (tùy chọn, phải là giá trị trong AuditAction)
   * @param dateFrom - Lọc từ ngày (tùy chọn, định dạng chuỗi ngày)
   * @param dateTo - Lọc đến ngày (tùy chọn, định dạng chuỗi ngày)
   * @param page - Số trang (mặc định 1)
   * @param limit - Số lượng kết quả mỗi trang (mặc định 50)
   * @returns Danh sách audit log và thông tin phân trang
   */
  @Get()
  async findAll(
    @Query('username') username?: string,
    @Query('action') action?: AuditAction,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.auditLogService.findAll({
      username,
      action,
      date_from: dateFrom ? new Date(dateFrom) : undefined,
      date_to: dateTo ? new Date(dateTo) : undefined,
      page,
      limit,
    });
  }

  /**
   * API xuất audit log ra file CSV để tải xuống
   * GET /audit-logs/export/csv
   * 
   * @param res - Response object để trả về file
   * @param username - Lọc theo tên người dùng (tùy chọn)
   * @param action - Lọc theo loại hành động (tùy chọn)
   * @param dateFrom - Lọc từ ngày (tùy chọn)
   * @param dateTo - Lọc đến ngày (tùy chọn)
   * @returns File CSV đính kèm trong response
   */
  @Get('export/csv')
  async exportCsv(
    @Res() res: Response,
    @Query('username') username?: string,
    @Query('action') action?: AuditAction,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    // Gọi service để lấy dữ liệu CSV
    const csv = await this.auditLogService.exportCsv({
      username,
      action,
      date_from: dateFrom ? new Date(dateFrom) : undefined,
      date_to: dateTo ? new Date(dateTo) : undefined,
    });

    // Tạo tên file CSV với ngày hiện tại
    const filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    
    // Thiết lập header cho response để trình duyệt hiểu đây là file CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Thêm BOM (Byte Order Mark) để Excel hiển thị đúng tiếng Việt UTF-8
    res.send('\uFEFF' + csv);
  }
}
