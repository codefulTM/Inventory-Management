// =============================================================================
// File: app.module.ts
// Mục đích: Root module của metrics-service, nơi khai báo tất cả các module con
// 
// Cấu trúc module:
// - ConfigModule: quản lý cấu hình từ env vars (GRPC_PORT, ELASTICSEARCH_*, etc.)
// - ElasticsearchQueryModule: cung cấp Elasticsearch client dùng chung cho toàn app
// - ReportsModule: chứa controller, service, repository xử lý logic báo cáo
// =============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ElasticsearchQueryModule } from './elasticsearch/elasticsearch.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // ConfigModule được đánh dấu isGlobal: true để có thể inject ConfigService ở mọi nơi
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Module cung cấp Elasticsearch client đã được cấu hình
    ElasticsearchQueryModule,
    // Module xử lý tất cả logic liên quan đến báo cáo
    ReportsModule,
  ],
})
export class AppModule {}
