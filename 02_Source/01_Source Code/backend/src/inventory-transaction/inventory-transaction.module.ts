import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryTransactionController } from './inventory-transaction.controller';
import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryTransactionRepository } from './inventory-transaction.repository';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: InventoryTransaction.name,
        schema: InventoryTransactionSchema,
      },
    ]),
  ],
  controllers: [InventoryTransactionController],
  providers: [InventoryTransactionService, InventoryTransactionRepository],
  exports: [InventoryTransactionService],
})
export class InventoryTransactionModule {}
