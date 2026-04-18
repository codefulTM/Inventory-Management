import {
  Controller,
  Get,
  Query,
  Inject,
  OnModuleInit,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { METRICS_SERVICE_TOKEN } from '../grpc/grpc.module';

interface MetricsReportsGrpcService {
  GetInventoryStatus(data: Record<string, never>): Observable<any>;
  GetMaterialUsage(data: { from?: string; to?: string }): Observable<any>;
  GetQcPerformance(data: Record<string, never>): Observable<any>;
  GetAuditReport(data: { page?: number; size?: number }): Observable<any>;
}

@Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
@Controller('reports')
export class ReportsController implements OnModuleInit {
  private readonly logger = new Logger(ReportsController.name);
  private metricsService: MetricsReportsGrpcService;

  constructor(@Inject(METRICS_SERVICE_TOKEN) private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.metricsService = this.client.getService<MetricsReportsGrpcService>('MetricsReportsService');
  }

  @Get('inventory-status')
  async getInventoryStatus() {
    try {
      return await firstValueFrom(this.metricsService.GetInventoryStatus({}));
    } catch (err) {
      this.logger.error(`[GET /reports/inventory-status] ${err.message}`);
      throw new InternalServerErrorException('metrics-service unavailable');
    }
  }

  @Get('material-usage')
  async getMaterialUsage(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return await firstValueFrom(this.metricsService.GetMaterialUsage({ from, to }));
    } catch (err) {
      this.logger.error(`[GET /reports/material-usage] ${err.message}`);
      throw new InternalServerErrorException('metrics-service unavailable');
    }
  }

  @Get('qc-performance')
  async getQcPerformance() {
    try {
      return await firstValueFrom(this.metricsService.GetQcPerformance({}));
    } catch (err) {
      this.logger.error(`[GET /reports/qc-performance] ${err.message}`);
      throw new InternalServerErrorException('metrics-service unavailable');
    }
  }

  @Get('audit')
  async getAuditReport(
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetAuditReport({
          page: page ? parseInt(page, 10) : 0,
          size: size ? parseInt(size, 10) : 20,
        }),
      );
    } catch (err) {
      this.logger.error(`[GET /reports/audit] ${err.message}`);
      throw new InternalServerErrorException('metrics-service unavailable');
    }
  }
}
