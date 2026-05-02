/**
 * SystemMonitoringModule - Module giám sát hệ thống
 *
 * Chức năng:
 * - Kiểm tra sức khỏe hệ thống (health check)
 * - Thu thập thông tin hệ thống: CPU, memory, uptime, database connection
 * - Cung cấp API cho các công cụ monitoring bên ngoài
 * - Export SystemMonitoringService để các module khác sử dụng
 */
import { Module } from '@nestjs/common';
import { SystemMonitoringService } from './system-monitoring.service';
import { SystemMonitoringController } from './system-monitoring.controller';

@Module({
  controllers: [SystemMonitoringController],
  providers: [SystemMonitoringService],
  exports: [SystemMonitoringService],
})
export class SystemMonitoringModule {}
