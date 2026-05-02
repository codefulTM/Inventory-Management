/**
 * InventoryAdjustmentModule - Module điều chỉnh tồn kho
 *
 * Chức năng:
 * - Ghi nhận các điều chỉnh tồn kho do kiểm kê, chênh lệch, hủy hàng
 * - Tự động cập nhật số lượng lô hàng khi điều chỉnh
 * - Tạo giao dịch tồn kho (Adjustment transaction) tương ứng
 * - Tính toán lại giá trị tồn kho (inventory valuation)
 * - Các lý do điều chỉnh: count (kiểm kê), damage (hư hỏng), expiry (hết hạn), other
 *
 * Schema đăng ký:
 * - InventoryAdjustment: Bản ghi điều chỉnh tồn kho
 * - InventoryLot, InventoryTransaction, InventoryValuationSummary: Cập nhật liên quan
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryAdjustment,
  InventoryAdjustmentSchema,
} from '../schemas/inventory-adjustment.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import {
  InventoryValuationSummary,
  InventoryValuationSummarySchema,
} from '../schemas/inventory-valuation-summary.schema';
import { InventoryAdjustmentController } from './inventory-adjustment.controller';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import { InventoryAdjustmentRepository } from './inventory-adjustment.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryAdjustment.name, schema: InventoryAdjustmentSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      {
        name: InventoryValuationSummary.name,
        schema: InventoryValuationSummarySchema,
      },
    ]),
  ],
  controllers: [InventoryAdjustmentController],
  providers: [InventoryAdjustmentService, InventoryAdjustmentRepository],
})
export class InventoryAdjustmentModule {}
