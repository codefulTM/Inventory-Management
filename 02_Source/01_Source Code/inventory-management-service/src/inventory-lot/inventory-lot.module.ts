import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  StorageLocation,
  StorageLocationSchema,
} from '../schemas/storage-location.schema';
import {
  BinCountRecord,
  BinCountRecordSchema,
} from '../schemas/bin-count-record.schema';
import { InventoryLotController } from './inventory-lot.controller';
import { InventoryLotService } from './inventory-lot.service';
import { InventoryLotRepository } from './inventory-lot.repository';
import { BinWorklistController } from './bin-worklist.controller';
import { BinWorklistService } from './bin-worklist.service';
import { BinCountRecordRepository } from './bin-count-record.repository';
import { InventoryTransactionModule } from '../inventory-transaction/inventory-transaction.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WarehouseSlipModule } from '../warehouse-slip';
import { MailModule } from '../mail/mail.module';
import { MaterialModule } from '../material/material.module';
import { UserModule } from '../user/user.module';

/**
 * InventoryLotModule - Module quản lý lô hàng tồn kho
 * 
 * Chức năng chính:
 * - Quản lý các lô hàng (lots) trong kho theo nguyên tắc FIFO/FEFO
 * - Theo dõi thông tin: số lượng, hạn sử dụng, ngày sản xuất, ngày nhận
 * - Quản lý trạng thái lô: Quarantine → Accepted/Rejected → Depleted
 * - Hỗ trợ mẫu thử (sample lots) từ lô cha (parent_lot_id)
 * - Quản lý vị trí lưu kho (storage_location, warehouse_id)
 * - Tự động tạo giao dịch tồn kho khi có thay đổi số lượng
 * - Quản lý bin count records (kiểm kê tồn kho định kỳ)
 * - Cung cấp danh sách lô sắp hết hạn và đã hết hạn
 * 
 * Các thành phần:
 * - InventoryLotController: REST API endpoints cho lô hàng
 * - InventoryLotService: Xử lý nghiệp vụ lô hàng
 * - InventoryLotRepository: Thao tác MongoDB với collection inventory_lots
 * - BinWorklistController/Service: Quản lý danh sách kiểm kê bin
 * - BinCountRecordRepository: Lưu trữ lịch sử kiểm kê
 * 
 * Model đăng ký:
 * - InventoryLot: Thông tin lô hàng
 * - StorageLocation: Vị trí lưu kho
 * - BinCountRecord: Lịch sử kiểm kê
 * 
 * Module phụ thuộc:
 * - InventoryTransactionModule: Tạo giao dịch khi thay đổi số lượng lô
 * - AuditLogModule: Ghi log kiểm toán khi cập nhật lô
 * - WarehouseSlipModule: forwardRef để tránh circular dependency
 * - MaterialModule: Lấy thông tin vật tư liên quan
 * - MailModule: Gửi email thông báo
 * - UserModule: Lấy thông tin người dùng
 */
@Module({
  imports: [
    // Đăng ký các Schema với Mongoose
    MongooseModule.forFeature([
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: StorageLocation.name, schema: StorageLocationSchema },
      { name: BinCountRecord.name, schema: BinCountRecordSchema },
    ]),
    // Module giao dịch tồn kho (tạo transaction khi thay đổi số lượng)
    InventoryTransactionModule,
    // Module ghi log kiểm toán
    AuditLogModule,
    // Module phiếu nhập/xuất kho (forwardRef để tránh circular dependency)
    forwardRef(() => WarehouseSlipModule),
    // Module vật tư (để lấy thông tin material)
    MaterialModule,
    // Module gửi email
    MailModule,
    // Module người dùng
    UserModule,
  ],
  controllers: [InventoryLotController, BinWorklistController],
  providers: [
    InventoryLotService,
    InventoryLotRepository,
    BinCountRecordRepository,
    BinWorklistService,
  ],
  // Export để các module khác có thể sử dụng
  exports: [InventoryLotService, InventoryLotRepository, BinWorklistService],
})
export class InventoryLotModule {}
