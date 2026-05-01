import { Module } from '@nestjs/common';
import { AiQcController } from './ai-qc.controller';
import { AiQcService } from './ai-qc.service';

@Module({
  controllers: [AiQcController],
  providers: [AiQcService],
  exports: [AiQcService],
})
export class AiModule {}
