/**
 * File: schemas/inventory-lot.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho collection inventory_lots
 * 
 * Schema này chỉ sử dụng để đọc dữ liệu phục vụ đồng bộ analytics
 * Collection: inventory_lots - Quản lý các lô hàng tồn kho
 * Đồng bộ vào ES index: inventory_lots_{YYYY}_{MM}
 * 
 * Lô hàng (Lot) là đơn vị quản lý tồn kho, mỗi lô có:
 * - Một vật tư (material) liên kết
 * - Số lượng, nhà cung cấp, hạn sử dụng
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryLotDocument = InventoryLot & Document;

/**
 * Schema định nghĩa cấu trúc lô hàng tồn kho
 * @collection: 'inventory_lots' - Tên collection trong MongoDB
 * @timestamps: Tự động thêm created_date và modified_date
 */
@Schema({
  collection: 'inventory_lots',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class InventoryLot {
  @Prop() lot_id: string;                // Mã lô hàng (unique identifier)
  @Prop() material_id: string;             // ID vật tư liên kết
  @Prop() supplier_name: string;           // Tên nhà cung cấp
  @Prop() manufacturer_name: string;        // Tên nhà sản xuất
  @Prop() status: string;                  // Trạng thái (active, expired, etc.)
  @Prop() quantity: number;                // Số lượng hiện tại
  @Prop() unit_of_measure: string;         // Đơn vị tính (kg, unit, v.v.)
  @Prop() created_date: Date;              // Ngày tạo (tự động)
  @Prop() modified_date: Date;             // Ngày sửa đổi (tự động)
  @Prop({ default: false }) deleted?: boolean;     // Cờ soft delete
  @Prop() is_active?: boolean;                     // Trạng thái kích hoạt
}

// Tạo Mongoose Schema và đánh index cho modified_date (dùng cho watermark query)
export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);
InventoryLotSchema.index({ modified_date: 1 });
