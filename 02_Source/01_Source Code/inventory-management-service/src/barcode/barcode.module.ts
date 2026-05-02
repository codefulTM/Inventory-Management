/**
 * BarcodeModule - Module tạo và quản lý mã vạch (barcode/QR)
 *
 * Chức năng:
 * - Tạo mã vạch cho lô hàng (Code128, EAN13, QR Code)
 * - Quét mã vạch để tra cứu thông tin lô hàng (US41)
 * - Download mã vạch đơn hoặc hàng loạt (US40)
 * - Sử dụng thư viện bwip-js để render barcode
 *
 * Endpoints:
 * - POST /barcode/query - Tra cứu lô theo mã vạch
 * - GET /barcode/download/:lot_id - Tải mã vạch cho 1 lô
 * - POST /barcode/batch-download - Tải nhiều mã vạch
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BarcodeService } from './barcode.service';
import { BarcodeController } from './barcode.controller';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';

/**
 * BarcodeModule - Cung cấp dịch vụ tạo mã vạch và tra cứu
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLot.name, schema: InventoryLotSchema },
    ]),
  ],
  controllers: [BarcodeController],
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
