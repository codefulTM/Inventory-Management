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
});
