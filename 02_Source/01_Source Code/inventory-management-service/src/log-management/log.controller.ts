// === LOG CONTROLLER ===
// Controller xử lý các API quản lý log hệ thống
// Chỉ IT Administrator mới có quyền truy cập các endpoint này
// Sử dụng JWT Guard và RolesGuard để xác thực

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

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogController {
  constructor(private readonly logService: LogService) {}

  // GET /logs
  // Lấy danh sách log với filters và phân trang
  // Query params: level?, error_code?, module?, page (default 1), limit (default 50)
  // Chỉ IT_ADMINISTRATOR được truy cập
  @Get()
  @Roles(UserRole.IT_ADMINISTRATOR)
  async getLogs(
    @Query('level') level?: string,
    @Query('error_code') errorCode?: string,
    @Query('module') module?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<Record<string, unknown>> {
    // [RÚT GỌN: Gọi logService.getLogs({ level, error_code: errorCode, module }, page, limit)]
  }

  // GET /logs/search?q=từ_khóa
  // Tìm kiếm log theo từ khóa trong message, error_code, session_id
  // Query params: q, page (default 1), limit (default 50)
  // Chỉ IT_ADMINISTRATOR được truy cập
  @Get('search')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async searchLogs(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<Record<string, unknown>> {
    // [RÚT GỌN: Gọi logService.searchLogs(query, page, limit)]
  }

  // GET /logs/stats
  // Lấy thống kê log theo mức độ (level)
  // Output: [{ _id: 'error', count: 15 }, { _id: 'info', count: 200 }]
  // Chỉ IT_ADMINISTRATOR được truy cập
  @Get('stats')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async getStats(): Promise<unknown[]> {
    // [RÚT GỌN: Gọi logService.getDashboardStats()]
  }

  // DELETE /logs?before=2026-05-01T00:00:00Z
  // Xóa log cũ được tạo trước một thời điểm nhất định
  // Query params: before (ISO 8601 Date)
  // Output: { deletedCount }
  // Chỉ IT_ADMINISTRATOR được truy cập
  @Delete()
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async deleteLogs(
    @Query('before') before: string,
  ): Promise<Record<string, unknown>> {
    // [RÚT GỌN: Parse string to Date → gọi logService.deleteLogs(date)]
  }
}