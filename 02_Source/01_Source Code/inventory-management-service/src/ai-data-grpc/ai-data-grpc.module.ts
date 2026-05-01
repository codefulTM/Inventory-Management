import { Module } from '@nestjs/common';
import { AiDataGrpcController } from './ai-data-grpc.controller';
import { InventoryLotModule } from '../inventory-lot/inventory-lot.module';
import { InventoryTransactionModule } from '../inventory-transaction/inventory-transaction.module';
import { QCTestModule } from '../qc-test/qc-test.module';

@Module({
  imports: [InventoryLotModule, InventoryTransactionModule, QCTestModule],
  controllers: [AiDataGrpcController],
})
export class AiDataGrpcModule {}
