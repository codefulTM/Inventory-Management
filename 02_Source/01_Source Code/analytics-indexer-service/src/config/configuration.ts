import * as path from 'node:path';

export default () => ({
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory',
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
    tlsCa: process.env.ELASTICSEARCH_TLS_CA || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    tls: process.env.REDIS_TLS === 'true',
  },
  sync: {
    intervalCron: process.env.SYNC_INTERVAL_CRON || '*/10 * * * *',
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '500', 10),
  },
  rag: {
    enabled: process.env.RAG_PHASE2_ENABLED !== 'false',
    embedding: {
      model:
        process.env.EMBEDDING_MODEL ||
        'sentence-transformers/all-MiniLM-L6-v2',
      apiUrl:
        process.env.EMBEDDING_API_URL ||
        'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      timeoutMs: parseInt(process.env.EMBEDDING_TIMEOUT_MS || '10000', 10),
      cacheTtlSeconds: parseInt(
        process.env.EMBEDDING_CACHE_TTL_SECONDS || '86400',
        10,
      ),
      vectorDims: parseInt(process.env.EMBEDDING_VECTOR_DIMS || '384', 10),
    },
    markdown: {
      rootDir:
        process.env.RAG_MARKDOWN_ROOT_DIR ||
        path.resolve(process.cwd(), '..', '..', '..', '01_Documents'),
    },
  },
});
