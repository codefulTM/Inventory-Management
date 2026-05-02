/**
 * File: schemas/inventory-transaction.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho collection inventory_transactions
 * 
 * Schema này chỉ sử dụng để đọc dữ liệu phục vụ đồng bộ analytics
 * Collection: inventory_transactions - Lưu trữ tất cả giao dịch kho (IN/OUT)
 * Đồng bộ vào ES index: inventory_transactions_{YYYY}_{MM}
 * 
 * Giao dịch (Transaction) ghi nhận việc:
 * - Nhập kho (IN): Tăng số lượng lô hàng
 * - Xuất kho (OUT): Giảm số lượng lô hàng
 * - Mỗi giao dịch liên kết với một lô hàng (lot_id)
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryTransactionDocument = InventoryTransaction & Document;

/**
 * Schema định nghĩa cấu trúc giao dịch kho
 * @collection: 'inventory_transactions' - Tên collection trong MongoDB
 * @timestamps: Tự động thêm created_date và modified_date
 */
@Schema({
  collection: 'inventory_transactions',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class InventoryTransaction {
  @Prop() transaction_id: string;          // Mã giao dịch (unique identifier)
  @Prop() lot_id: string;                  // ID lô hàng liên kết
  @Prop() transaction_type: string;          // Loại giao dịch (IN/OUT)
  @Prop() quantity: number;                 // Số lượng giao dịch
  @Prop() unit_of_measure: string;          // Đơn vị tính
  @Prop() transaction_date: Date;           // Ngày thực hiện giao dịch
  @Prop() performed_by: string;             // Người thực hiện (user ID)
  @Prop() created_date: Date;              // Ngày tạo (tự động)
  @Prop() modified_date: Date;             // Ngày sửa đổi (tự động)
  @Prop({ default: false }) deleted?: boolean;     // Cờ soft delete
  @Prop() is_active?: boolean;                     // Trạng thái kích hoạt
}

// Tạo Mongoose Schema và đánh index cho modified_date (dùng cho watermark query)
export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);
InventoryTransactionSchema.index({ modified_date: 1 });
