/**
 * File: config/configuration.ts
 * Mục đích: Tập trung cấu hình của analytics-indexer-service
 * 
 * File này định nghĩa tất cả các cấu hình cần thiết cho service, bao gồm:
 * - Kết nối MongoDB (nguồn dữ liệu)
 * - Kết nối Elasticsearch (đích đến dữ liệu)
 * - Kết nối Redis (lưu watermark đồng bộ)
 * - Cấu hình đồng bộ (lịch trình, kích thước batch)
 * - Cấu hình RAG (Retrieval-Augmented Generation) cho việc tìm kiếm ngữ nghĩa
 * 
 * Tất cả các giá trị đều có thể được ghi đè bằng biến môi trường (environment variables)
 */
import * as path from 'node:path';

export default () => ({
  // Cấu hình kết nối MongoDB - nơi lưu trữ dữ liệu gốc
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory',
  },
  
  // Cấu hình kết nối Elasticsearch - nơi chỉ mục dữ liệu để tìm kiếm
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
    tlsCa: process.env.ELASTICSEARCH_TLS_CA || '',  // Chứng chỉ CA cho TLS
  },
  
  // Cấu hình kết nối Redis - dùng để lưu watermark (dấu thời gian đồng bộ cuối cùng)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    tls: process.env.REDIS_TLS === 'true',
  },
  
  // Cấu hình cơ chế đồng bộ dữ liệu
  sync: {
    // Biểu thức Cron quy định tần suất chạy đồng bộ (mặc định: mỗi 10 phút)
    intervalCron: process.env.SYNC_INTERVAL_CRON || '*/10 * * * *',
    // Số lượng bản ghi xử lý trong một lô (batch)
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '500', 10),
  },
  
  // Cấu hình RAG (Retrieval-Augmented Generation)
  rag: {
    // Bật/tắt tính năng RAG (mặc định: bật)
    enabled: process.env.RAG_PHASE2_ENABLED !== 'false',
    
    // Cấu hình tạo embedding vector cho tìm kiếm ngữ nghĩa
    embedding: {
      model:
        process.env.EMBEDDING_MODEL ||
        'sentence-transformers/all-MiniLM-L6-v2',
      apiUrl:
        process.env.EMBEDDING_API_URL ||
        'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      apiKey: process.env.HUGGINGFACE_API_KEY || '',  // API key cho HuggingFace
      timeoutMs: parseInt(process.env.EMBEDDING_TIMEOUT_MS || '10000', 10),
      // Thời gian cache embedding trong Redis (mặc định: 24 giờ)
      cacheTtlSeconds: parseInt(
        process.env.EMBEDDING_CACHE_TTL_SECONDS || '86400',
        10,
      ),
      // Số chiều của vector embedding (phụ thuộc vào mô hình)
      vectorDims: parseInt(process.env.EMBEDDING_VECTOR_DIMS || '384', 10),
    },
    
    // Cấu hình thư mục chứa tài liệu Markdown để đưa vào tìm kiếm
    markdown: {
      rootDir:
        process.env.RAG_MARKDOWN_ROOT_DIR ||
        path.resolve(process.cwd(), '..', '..', '..', '01_Documents'),
    },
  },
});
