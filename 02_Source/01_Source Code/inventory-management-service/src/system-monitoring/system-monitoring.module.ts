import { Module } from '@nestjs/common';
import { SystemMonitoringService } from './system-monitoring.service';
import { SystemMonitoringController } from './system-monitoring.controller';

@Module({
  controllers: [SystemMonitoringController],
  providers: [SystemMonitoringService],
  exports: [SystemMonitoringService],
})
export class SystemMonitoringModule {}
