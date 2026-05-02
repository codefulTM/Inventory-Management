/**
 * WarehouseHierarchyModule - Module quản lý cấu trúc phân cấp kho
 *
 * Chức năng:
 * - Quản lý hệ thống phân cấp: Warehouse → Zone → Rack → Bin (vị trí lưu trữ)
 * - Cho phép tìm kiếm, duyệt cây phân cấp kho
 * - Theo dõi lô hàng đang ở vị trí nào trong kho
 * - Hỗ trợ các thao tác di chuyển lô giữa các vị trí
 *
 * Schema:
 * - WarehouseLocation: Vị trí lưu trữ trong kho (zone, rack, bin)
 * - InventoryLot: Để tham chiếu vị trí của lô hàng
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseHierarchyService } from './warehouse-hierarchy.service';
import { WarehouseHierarchyController } from './warehouse-hierarchy.controller';
import {
  WarehouseLocation,
  WarehouseLocationSchema,
} from '../schemas/warehouse-location.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarehouseLocation.name, schema: WarehouseLocationSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
    ]),
  ],
  controllers: [WarehouseHierarchyController],
  providers: [WarehouseHierarchyService],
  exports: [WarehouseHierarchyService],
})
export class WarehouseHierarchyModule {}
