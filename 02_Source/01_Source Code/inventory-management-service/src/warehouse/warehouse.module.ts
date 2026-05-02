/**
 * WarehouseModule - Module quản lý kho (Warehouse)
 *
 * Chức năng:
 * - CRUD thông tin kho (tên, địa chỉ, trạng thái, sức chứa)
 * - Quản lý danh sách các kho trong hệ thống
 * - Mỗi kho có warehouse_id duy nhất (WH-XX)
 *
 * Phụ thuộc: Chỉ Mongoose (độc lập với các module khác)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from './warehouse.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Warehouse.name, schema: WarehouseSchema },
    ]),
  ],
  controllers: [WarehouseController],
  providers: [WarehouseRepository, WarehouseService],
  exports: [WarehouseService, WarehouseRepository],
})
export class WarehouseModule {}
