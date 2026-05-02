// =============================================================================
// File: elasticsearch/elasticsearch.module.ts
// Mục đích: Module cung cấp Elasticsearch Client được cấu hình sẵn cho toàn bộ ứng dụng
// 
// Đặc điểm:
// - Được đánh dấu @Global() để có thể inject ở bất kỳ module nào
// - Sử dụng factory provider để khởi tạo Client với cấu hình từ ConfigService
// - Hỗ trợ xác thực username/password và TLS qua CA certificate
// =============================================================================

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';

@Global()
@Module({
  providers: [
    {
      // Token để inject Elasticsearch client
      provide: ELASTICSEARCH_CLIENT,
      // Inject ConfigService để đọc cấu hình
      inject: [ConfigService],
      // Factory function tạo Elasticsearch Client instance
      useFactory: (config: ConfigService): Client => {
        const node = config.get<string>('elasticsearch.node');
        const username = config.get<string>('elasticsearch.username');
        const password = config.get<string>('elasticsearch.password');
        const tlsCa = config.get<string>('elasticsearch.tlsCa');

        return new Client({
          node,
          // Chỉ thêm auth nếu có username và password
          ...(username && password ? { auth: { username, password } } : {}),
          // Chỉ thêm TLS config nếu có CA certificate
          ...(tlsCa ? { tls: { ca: tlsCa } } : {}),
        });
      },
    },
  ],
  // Export token để các module khác có thể sử dụng
  exports: [ELASTICSEARCH_CLIENT],
})
export class ElasticsearchQueryModule {}
