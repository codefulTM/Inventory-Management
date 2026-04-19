import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('summary')
  async summary(@Query('warehouseId') warehouseId?: string) {
    return this.svc.getSummary({ warehouseId });
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('materialId') materialId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getDrilldown({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      materialId,
      from,
      to,
    });
  }
}
