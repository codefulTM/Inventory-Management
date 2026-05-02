/**
 * File: schemas/import-export-order.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho collection import_export_orders
 * 
 * Schema này chỉ sử dụng để đọc dữ liệu phục vụ đồng bộ analytics
 * Collection: import_export_orders - Quản lý đơn nhập/xuất kho
 * Đồng bộ vào ES index: import_export_orders_{YYYY}_{MM}
 * 
 * Đơn hàng (Order) có thể là:
 * - Nhập kho (IMPORT): Tiếp nhận vật tư từ nhà cung cấp
 * - Xuất kho (EXPORT): Xuất vật tư từ kho
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImportExportOrderDocument = ImportExportOrder & Document;

/**
 * Schema định nghĩa cấu trúc đơn nhập/xuất kho
 * @collection: 'import_export_orders' - Tên collection trong MongoDB
 * @timestamps: Tự động thêm created_date và modified_date
 */
@Schema({
  collection: 'import_export_orders',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class ImportExportOrder {
  @Prop() order_id: string;              // Mã đơn hàng (unique identifier)
  @Prop() order_type: string;             // Loại đơn: IMPORT hoặc EXPORT
  @Prop() status: string;                 // Trạng thái (pending, completed, cancelled)
  @Prop() created_by: string;             // Người tạo đơn (user ID)
  @Prop() created_date: Date;            // Ngày tạo (tự động)
  @Prop() modified_date: Date;           // Ngày sửa đổi (tự động)
  @Prop({ default: false }) deleted?: boolean;   // Cờ soft delete
  @Prop() is_active?: boolean;                   // Trạng thái kích hoạt
}

export const ImportExportOrderSchema = SchemaFactory.createForClass(ImportExportOrder);
// Index cho modified_date (dùng cho watermark query)
ImportExportOrderSchema.index({ modified_date: 1 });
