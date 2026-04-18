import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';

@Global()
@Module({
  providers: [
    {
      provide: ELASTICSEARCH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Client => {
        const node = config.get<string>('elasticsearch.node');
        const username = config.get<string>('elasticsearch.username');
        const password = config.get<string>('elasticsearch.password');
        const tlsCa = config.get<string>('elasticsearch.tlsCa');

        return new Client({
          node,
          ...(username && password ? { auth: { username, password } } : {}),
          ...(tlsCa ? { tls: { ca: tlsCa } } : {}),
        });
      },
    },
  ],
  exports: [ELASTICSEARCH_CLIENT],
})
export class ElasticsearchQueryModule {}
