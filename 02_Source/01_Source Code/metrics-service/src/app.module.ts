import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ElasticsearchQueryModule } from './elasticsearch/elasticsearch.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ElasticsearchQueryModule,
    ReportsModule,
  ],
})
export class AppModule {}
