import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('summary')
  async summary(
    @Query('warehouseId') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getSummary({ warehouseId, from, to });
  }

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
