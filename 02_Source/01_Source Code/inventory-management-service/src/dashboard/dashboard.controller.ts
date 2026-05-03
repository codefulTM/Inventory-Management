import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  /**
   * Lấy số liệu tổng quan của hệ thống kho
   * @param warehouseId - ID kho cần xem (không truyền thì lấy tất cả)
   * @param from - Ngày bắt đầu (yyyy-mm-dd), mặc định 30 ngày trước
   * @param to - Ngày kết thúc (yyyy-mm-dd), mặc định hôm nay
   * @returns Tổng số lô hàng, tổng nhập, tổng xuất, tồn kho hiện tại
   */
  @Get('summary')
  async summary(
    @Query('warehouseId') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getSummary({ warehouseId, from, to });
  }

  /**
   * Lấy dữ liệu xu hướng nhập/xuất kho theo thời gian
   * @param metric - Loại dữ liệu: 'in' (nhập kho) hoặc 'out' (xuất kho)
   * @param from - Ngày bắt đầu (yyyy-mm-dd)
   * @param to - Ngày kết thúc (yyyy-mm-dd)
   * @param interval - Khoảng thời gian gom nhóm: 'day', 'week', hoặc 'month'
   * @param warehouseId - ID kho cần xem (không truyền thì lấy tất cả)
   * @returns Mảng dữ liệu theo từng khoảng thời gian để vẽ biểu đồ
   */
  @Get('trends')
  async trends(
    @Query('metric') metric: 'in' | 'out',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('interval') interval?: 'day' | 'week' | 'month',
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.svc.getTrends({ metric, from, to, interval, warehouseId });
  }

  /**
   * Xem chi tiết từng dòng giao dịch nhập/xuất kho (phân trang)
   * @param metric - Lọc theo loại: 'in' (nhập) hoặc 'out' (xuất), không truyền thì lấy cả hai
   * @param page - Trang hiện tại (mặc định trang 1)
   * @param limit - Số dòng mỗi trang (mặc định 50)
   * @param materialId - Lọc theo ID vật tư cụ thể
   * @param from - Ngày bắt đầu (yyyy-mm-dd)
   * @param to - Ngày kết thúc (yyyy-mm-dd)
   * @returns Danh sách giao dịch chi tiết kèm phân trang
   */
  @Get('drilldown')
  async drilldown(
    @Query('metric') metric?: 'in' | 'out',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('materialId') materialId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getDrilldown({
      metric,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      materialId,
      from,
      to,
    });
  }
}
