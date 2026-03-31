import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory-status')
  getInventoryStatus() {
    return this.reportsService.getInventoryStatusReport();
  }

  @Get('material-usage')
  getMaterialUsage(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getMaterialUsageReport(from, to);
  }

  @Get('qc-performance')
  getQcPerformance() {
    return this.reportsService.getQcPerformanceReport();
  }

  @Get('audit')
  getAuditReport() {
    return this.reportsService.getAuditReport();
  }
}
