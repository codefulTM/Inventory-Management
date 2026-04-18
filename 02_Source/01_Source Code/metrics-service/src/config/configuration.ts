export default () => ({
  grpc: {
    port: parseInt(process.env.GRPC_PORT ?? '6741', 10),
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME ?? '',
    password: process.env.ELASTICSEARCH_PASSWORD ?? '',
    tlsCa: process.env.ELASTICSEARCH_TLS_CA ?? '',
  },
});
