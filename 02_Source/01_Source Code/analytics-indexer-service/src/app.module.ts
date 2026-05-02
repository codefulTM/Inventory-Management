/**
 * File: app.module.ts
 * Mục đích: Module gốc (root module) của analytics-indexer-service
 * Khởi tạo và cấu hình tất cả các module cần thiết cho việc đồng bộ dữ liệu
 * từ MongoDB sang Elasticsearch theo lịch trình (scheduled sync)
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { RedisModule } from './redis/redis.module';
import { RagModule } from './rag/rag.module';
import { ElasticsearchIndexModule } from './elasticsearch/elasticsearch.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    // Cấu hình module - đọc biến môi trường, áp dụng cấu hình từ file configuration.ts
    // isGlobal: true giúp ConfigService có thể được inject ở bất kỳ đâu trong ứng dụng
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Kết nối MongoDB thông qua Mongoose
    // Sử dụng forRootAsync để lấy URI từ ConfigService (đọc từ biến môi trường)
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
      }),
    }),
    // Kích hoạt tính năng lập lịch (scheduler) để chạy các tác vụ định kỳ
    // Mặc định chạy mỗi 10 phút (cấu hình qua biến môi trường SYNC_INTERVAL_CRON)
    ScheduleModule.forRoot(),
    // Module quản lý kết nối Redis - dùng để lưu watermark đồng bộ
    RedisModule,
    // Module RAG (Retrieval-Augmented Generation) - xử lý embedding và enricher tài liệu
    RagModule,
    // Module quản lý Elasticsearch - kết nối, index naming, bulk operations
    ElasticsearchIndexModule,
    // Module đồng bộ dữ liệu - chứa logic sync từng collection và scheduler
    SyncModule,
  ],
})
export class AppModule {}
