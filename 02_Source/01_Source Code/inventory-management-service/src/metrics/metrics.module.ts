/**
 * MetricsModule - Module expose metrics cho Prometheus scraping
 *
 * Chức năng:
 * - Cung cấp endpoint GET /metrics cho Prometheus thu thập metrics
 * - Metrics bao gồm: HTTP request duration, request count, active requests
 * - Sử dụng thư viện prom-client để thu thập metrics
 * - Endpoint /metrics được đánh dấu @Public() (không cần xác thực)
 */
import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
})
export class MetricsModule {}
