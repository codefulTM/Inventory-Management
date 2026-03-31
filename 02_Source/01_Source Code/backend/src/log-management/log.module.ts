import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogService } from './log.service';
import { LogController } from './log.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'AppLog',
        schema: new (require('mongoose')).Schema(
          {
            level: String,
            message: String,
            error_code: String,
            session_id: String,
            user: String,
            module: String,
            stack: String,
            created_at: { type: Date, default: Date.now },
          },
          { collection: 'app_logs' },
        ),
      },
    ]),
  ],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
