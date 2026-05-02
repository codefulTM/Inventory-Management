/**
 * AiDataGrpcModule - Module cung cấp dữ liệu cho AI Service qua gRPC
 *
 * Chức năng:
 * - Expose gRPC endpoints để AI Service gọi lấy dữ liệu inventory
 * - Cung cấp dữ liệu về lô hàng, giao dịch, QC test cho AI phân tích
 * - Đọc dữ liệu từ các module: InventoryLot, InventoryTransaction, QCTest
 *
 * Luồng dữ liệu: AI Service → gRPC → AiDataGrpcController → Domain Services → MongoDB
 */
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
