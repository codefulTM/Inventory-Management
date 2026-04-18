import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiSupplierService } from './ai-supplier.service';
import { BackendClientModule } from '../backend-client/backend-client.module';

@Module({
  imports: [BackendClientModule],
  controllers: [AiController],
  providers: [AiSupplierService],
})
export class AiModule {}
