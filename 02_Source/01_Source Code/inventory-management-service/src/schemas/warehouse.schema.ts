import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

/**
 * WarehouseSchema - Schema định nghĩa kho hàng trong MongoDB
 *
 * Collection: warehouses
 *
 * Mô tả: Quản lý danh sách các kho hàng trong hệ thống.
 * Mỗi kho có thể có nhiều vị trí lưu kho (storage locations/bins).
 *
 * Các trường chính:
 * - warehouse_id: Mã kho duy nhất (WH-XXX)
 * - warehouse_name: Tên kho (vd: "Kho Hà Nội", "Cold Storage A")
 * - description: Mô tả thêm về kho
 * - is_active: Trạng thái hoạt động
 */
export type WarehouseDocument = Warehouse & Document;

const options: SchemaOptions = {
  collection: 'warehouses',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class Warehouse {
  /** Mã kho duy nhất (WH-XXX) - Business key */
  @Prop({ type: String, required: true, unique: true, maxlength: 50 })
  warehouse_id: string;

  /** Tên kho (vd: "Kho Hà Nội", "Cold Storage A", "Warehouse 01") */
  @Prop({ type: String, required: true, maxlength: 120 })
  warehouse_name: string;

  /** Mô tả chi tiết về kho (vị trí, đặc điểm, v.v.) */
  @Prop({ type: String, required: false, maxlength: 255 })
  description?: string;

  /** Trạng thái hoạt động (true: đang dùng, false: ngừng dùng) */
  @Prop({ type: Boolean, required: true, default: true })
  is_active: boolean;

  /** Ngày tạo bản ghi */
  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  /** Ngày sửa đổi cuối cùng */
  @Prop({ type: Date, default: Date.now })
  modified_date: Date;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

// ==================== Indexes ====================

// Unique index trên warehouse_id (business key)
WarehouseSchema.index({ warehouse_id: 1 }, { unique: true });

// Index lọc theo trạng thái hoạt động
WarehouseSchema.index({ is_active: 1 });

// Index tìm kiếm theo tên kho
WarehouseSchema.index({ warehouse_name: 1 });
