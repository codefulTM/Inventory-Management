/**
 * File: elasticsearch/elasticsearch.module.ts
 * Mục đích: Module quản lý kết nối và các dịch vụ liên quan đến Elasticsearch
 * 
 * Module này được đánh dấu @Global() để có thể sử dụng ở bất kỳ đâu
 * Cung cấp:
 * - Elasticsearch Client: Để kết nối và thao tác với ES cluster
 * - IndexNamingService: Tạo tên index theo định dạng phân vùng theo tháng
 * - ElasticsearchBulkService: Thực hiện bulk index/delete operations
 * - IndexTemplateService: Quản lý ES index templates
 */
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { IndexNamingService } from './index-naming.service';
import { ElasticsearchBulkService } from './elasticsearch-bulk.service';
import { IndexTemplateService } from './index-template.service';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';

@Global()
@Module({
  providers: [
    // Provider cho Elasticsearch Client - kết nối tới ES cluster
    {
      provide: ELASTICSEARCH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Client => {
        // Đọc cấu hình từ environment variables
        const node = config.get<string>('elasticsearch.node');
        const username = config.get<string>('elasticsearch.username');
        const password = config.get<string>('elasticsearch.password');
        const tlsCa = config.get<string>('elasticsearch.tlsCa');

        // Khởi tạo ES client với authentication và TLS nếu có
        return new Client({
          node,
          ...(username && password
            ? { auth: { username, password } }
            : {}),
          ...(tlsCa
            ? { tls: { ca: tlsCa } }
            : {}),
        });
      },
    },
    // Service đặt tên index theo định dạng: {collection}_{year}_{month}
    IndexNamingService,
    // Service thực hiện bulk operations (index, delete) với ES
    ElasticsearchBulkService,
    // Service quản lý index templates cho ES
    IndexTemplateService,
  ],
  // Export tất cả để các module khác có thể sử dụng
  exports: [
    ELASTICSEARCH_CLIENT,
    IndexNamingService,
    ElasticsearchBulkService,
    IndexTemplateService,
  ],
})
export class ElasticsearchIndexModule {}
