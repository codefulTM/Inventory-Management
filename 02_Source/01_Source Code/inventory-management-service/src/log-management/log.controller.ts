import {
  Controller,
  Get,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LogService } from './log.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

/**
 * LogController - Điều khiển các API quản lý log hệ thống
 * Chỉ IT Administrator mới có quyền truy cập các endpoint này
 */
@Controller('logs')
// Sử dụng JWT Guard để xác thực người dùng và RolesGuard để kiểm tra quyền truy cập
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogController {
  constructor(private readonly logService: LogService) {}

  /**
   * API lấy danh sách log với các bộ lọc và phân trang
   * GET /logs
   * @param level - Mức độ log (info, warn, error, debug)
   * @param errorCode - Mã lỗi để lọc
   * @param module - Tên module phát sinh log
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số lượng log trên mỗi trang (mặc định: 50)
   * @returns Danh sách log kèm thông tin phân trang
   */
  @Get()
  // Chỉ IT Administrator mới được phép truy cập
  @Roles(UserRole.IT_ADMINISTRATOR)
  async getLogs(
    @Query('level') level?: string,
    @Query('error_code') errorCode?: string,
    @Query('module') module?: string,
    // ParseIntPipe với optional: true để chuyển đổi chuỗi sang số, cho phép giá trị rỗng
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<Record<string, unknown>> {
    return this.logService.getLogs(
      { level, error_code: errorCode, module },
      page,
      limit,
    );
  }

  /**
   * API tìm kiếm log theo từ khóa
   * GET /logs/search?q=từ_khóa
   * Tìm kiếm trong các trường: message, error_code, session_id
   * @param query - Từ khóa tìm kiếm
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số lượng kết quả trên mỗi trang (mặc định: 50)
   * @returns Danh sách log khớp với từ khóa tìm kiếm
   */
  @Get('search')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async searchLogs(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<Record<string, unknown>> {
    return this.logService.searchLogs(query, page, limit);
  }

  /**
   * API lấy thống kê log theo mức độ (level)
   * GET /logs/stats
   * Trả về số lượng log cho mỗi mức độ: info, warn, error, debug
   * @returns Mảng các object { _id: level, count: số_lượng }
   */
  @Get('stats')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async getStats(): Promise<unknown[]> {
    return (await this.logService.getDashboardStats()) as unknown[];
  }

  /**
   * API xóa log cũ được tạo trước một thời điểm nhất định
   * DELETE /logs?before=2026-05-01T00:00:00Z
   * @param before - Thời điểm chuẩn ISO 8601, các log trước thời điểm này sẽ bị xóa
   * @returns Kết quả thao tác xóa (deletedCount)
   */
  @Delete()
  @Roles(UserRole.IT_ADMINISTRATOR)
  // Trả về HTTP 200 OK thay vì 204 No Content mặc định của DELETE
  @HttpCode(HttpStatus.OK)
  async deleteLogs(
    @Query('before') before: string,
  ): Promise<Record<string, unknown>> {
    // Chuyển đổi chuỗi thời gian sang đối tượng Date
    const date = new Date(before);
    return await this.logService.deleteLogs(date);
  }
}
