import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { SystemMonitoringService } from './system-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

/**
 * System Monitoring Controller
 * REST API endpoints for System Monitoring
 * Routes: /api/system-monitoring
 */
@Controller('system-monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemMonitoringController {
  constructor(private readonly systemMonitoringService: SystemMonitoringService) {}

  /**
   * GET /system-monitoring/metrics
   * Get current system metrics (CPU, RAM, Disk, Services)
   * Accessible by: IT Administrator
   */
  @Get('metrics')
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async getMetrics() {
    return this.systemMonitoringService.getSystemMetrics();
  }

  /**
   * GET /system-monitoring/metrics/last
   * Get cached metrics from last collection
   * Accessible by: IT Administrator
   */
  @Get('metrics/last')
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async getLastMetrics() {
    const metrics = this.systemMonitoringService.getLastMetrics();
    if (!metrics) {
      return { message: 'No metrics available, please fetch metrics first' };
    }
    return metrics;
  }

  /**
   * GET /system-monitoring/alerts
   * Get recent system alerts
   * Query params: limit (default: 20)
   * Accessible by: IT Administrator
   */
  @Get('alerts')
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async getAlerts(
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number,
  ) {
    return {
      alerts: this.systemMonitoringService.getRecentAlerts(limit || 20),
    };
  }

  /**
   * GET /system-monitoring/thresholds
   * Get current alert thresholds
   * Accessible by: IT Administrator
   */
  @Get('thresholds')
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async getThresholds() {
    return {
      thresholds: this.systemMonitoringService.getAlertThresholds(),
    };
  }

  /**
   * POST /system-monitoring/thresholds
   * Set alert thresholds
   * Body: { cpu_percent?, memory_percent?, disk_percent? }
   * Accessible by: IT Administrator
   */
  @Post('thresholds')
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async setThresholds(
    @Body()
    thresholds: {
      cpu_percent?: number;
      memory_percent?: number;
      disk_percent?: number;
    },
  ) {
    return {
      thresholds: this.systemMonitoringService.setAlertThresholds(thresholds),
      message: 'Thresholds updated successfully',
    };
  }
}
