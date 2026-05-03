import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

/**
 * StorageLocationSchema - Schema định nghĩa vị trí lưu kho (Bin/Rack/Zone) trong MongoDB
 *
 * Collection: storage_locations
 *
 * Mô tả: Quản lý hệ thống phân cấp lưu kho:
 * Warehouse (Kho) → Zone (Khu vực) → Rack (Giá) → Bin (Vị trí cụ thể)
 *
 * Storage Location thường được gọi là "Bin" trong ngữ cảnh Bin Worklist.
 * Mỗi bin có thể chứa nhiều lô hàng (lots) của các vật tư khác nhau.
 *
 * Các trường chính:
 * - location_id: Mã vị trí duy nhất (dùng như bin_code)
 * - warehouse_id: Kho chứa vị trí này
 * - location_name: Tên mô tả vị trí (vd: "COLD-STORE-A1")
 * - zone: Khu vực (tùy chọn, vd: "Zone A", "Cold Storage")
 * - expected_qty: Số lượng kỳ vọng (dùng để so sánh khi đếm kiểm kê)
 * - is_active: Trạng thái hoạt động
 */
export type StorageLocationDocument = StorageLocation & Document;

const options: SchemaOptions = {
  collection: 'storage_locations',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class StorageLocation {
  /** Mã vị trí duy nhất (dùng như bin_code trong bin worklist) - Unique */
  @Prop({ type: String, required: true, unique: true, maxlength: 50 })
  location_id: string;

  /** Mã kho chứa vị trí này (tham chiếu warehouse_id) */
  @Prop({ type: String, required: true, maxlength: 50 })
  warehouse_id: string;

  /** Tên mô tả vị trí lưu kho (vd: "COLD-STORE-A1", "RACK-B2-SHELF-3") */
  @Prop({ type: String, required: true, maxlength: 120 })
  location_name: string;

  /** Khu vực lưu kho (tùy chọn, vd: "Zone A", "Cold Storage", "Ambient") */
  @Prop({ type: String, required: false, maxlength: 50 })
  zone?: string;

  /** Số lượng kỳ vọng tại vị trí này (dùng để so sánh khi kiểm kê) */
  @Prop({ type: Number, required: false })
  expected_qty?: number;

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

export const StorageLocationSchema =
  SchemaFactory.createForClass(StorageLocation);

// ==================== Indexes ====================

// Unique index trên location_id (business key)
StorageLocationSchema.index({ location_id: 1 }, { unique: true });

// Compound index cho query bins theo kho và trạng thái hoạt động
StorageLocationSchema.index({ warehouse_id: 1, is_active: 1 });
