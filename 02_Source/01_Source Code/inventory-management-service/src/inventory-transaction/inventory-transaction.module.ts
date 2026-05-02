import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryTransactionRepository } from './inventory-transaction.repository';
import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryTransactionController } from './inventory-transaction.controller';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';

/**
 * InventoryTransactionModule - Module quản lý giao dịch tồn kho
 * 
 * Chức năng chính:
 * - Ghi nhận tất cả các giao dịch nhập/xuất/điều chỉnh tồn kho
 * - Hỗ trợ nhiều loại giao dịch: Receipt, Usage, Split, Adjustment, Transfer, Disposal
 * - Cung cấp lịch sử giao dịch cho mỗi lô hàng
 * - Thống kê và báo cáo giao dịch
 * - Tracking giao dịch theo người thực hiện (performed_by)
 * 
 * Các loại giao dịch:
 * - Receipt: Nhập kho (số lượng dương)
 * - Usage: Xuất kho/sử dụng (số lượng âm)
 * - Split: Tách lô (chia lô lớn thành nhiều lô nhỏ)
 * - Adjustment: Điều chỉnh số lượng (kiểm kê, chênh lệch)
 * - Transfer: Chuyển kho (giữa các kho/vi trí)
 * - Disposal: Hủy bỏ (hàng hỏng, hết hạn)
 * 
 * Model đăng ký:
 * - InventoryTransaction: Lưu trữ tất cả giao dịch tồn kho
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
  ],
  controllers: [InventoryTransactionController],
  providers: [InventoryTransactionRepository, InventoryTransactionService],
  // Export Service để các module khác có thể sử dụng (InventoryLot, ImportExportOrder, etc.)
  exports: [InventoryTransactionService],
})
export class InventoryTransactionModule {}
