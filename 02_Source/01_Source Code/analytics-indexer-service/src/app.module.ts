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
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
      }),
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    RagModule,
    ElasticsearchIndexModule,
    SyncModule,
  ],
})
export class AppModule {}
