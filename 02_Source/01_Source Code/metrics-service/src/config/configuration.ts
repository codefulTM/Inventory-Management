// =============================================================================
// File: config/configuration.ts
// Mục đích: Định nghĩa cấu hình cho metrics-service, đọc từ environment variables
// 
// Các biến môi trường hỗ trợ:
// - GRPC_PORT: port gRPC server lắng nghe (mặc định: 6741)
// - ELASTICSEARCH_NODE: URL của Elasticsearch cluster (mặc định: http://localhost:9200)
// - ELASTICSEARCH_USERNAME / ELASTICSEARCH_PASSWORD: credentials xác thực ES
// - ELASTICSEARCH_TLS_CA: đường dẫn đến CA certificate nếu dùng TLS
// =============================================================================

export default () => ({
  // Cấu hình gRPC server port
  grpc: {
    port: parseInt(process.env.GRPC_PORT ?? '6741', 10),
  },
  // Cấu hình kết nối Elasticsearch
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME ?? '',
    password: process.env.ELASTICSEARCH_PASSWORD ?? '',
    tlsCa: process.env.ELASTICSEARCH_TLS_CA ?? '',
  },
});
