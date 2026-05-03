import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

/**
 * WarehouseLocationSchema - Schema định nghĩa cấu trúc phân cấp lưu kho trong MongoDB
 *
 * Collection: warehouse_locations
 *
 * Mô tả: Quản lý hệ thống phân cấp lưu kho 4 cấp độ:
 * 1. Warehouse (Kho) - cấp độ cao nhất
 * 2. Zone (Khu vực) - phân vùng trong kho (vd: Zone A, Cold Storage)
 * 3. Shelf/Rack (Giá/Kệ) - nơi đặt các bins
 * 4. Bin (Vị trí cụ thể) - nơi chứa lô hàng (lots)
 *
 * Đây là schema "high-level" quản lý phân cấp, khác với StorageLocation
 * (dùng cho bin worklist, tập trung vào bin cụ thể).
 *
 * Các trường chính:
 * - location_code: Mã vị trí duy nhất (business key)
 * - location_name: Tên mô tả vị trí
 * - level: Cấp độ (warehouse/zone/shelf/bin)
 * - parent_code: Mã vị trí cha (dùng để tạo cây phân cấp)
 * - capacity: Sức chứa (tùy chọn)
 * - is_active: Trạng thái hoạt động
 */
export type WarehouseLocationDocument = WarehouseLocation & Document;

const options: SchemaOptions = {
  collection: 'warehouse_locations',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * Cấp độ vị trí lưu kho (phân cấp 4 cấp)
 * - WAREHOUSE: Kho (cấp cao nhất)
 * - ZONE: Khu vực trong kho (vd: Zone A, Cold Storage)
 * - SHELF: Giá/Kệ (nơi đặt các bins)
 * - BIN: Vị trí cụ thể (nơi chứa lô hàng - lots)
 */
export enum LocationLevel {
  WAREHOUSE = 'warehouse',
  ZONE = 'zone',
  SHELF = 'shelf',
  BIN = 'bin',
}

@Schema(options)
export class WarehouseLocation {
  /** Mã vị trí duy nhất - Business key (vd: "WH-HN-01", "ZONE-A", "RACK-B2", "BIN-B2-001") */
  @Prop({ type: String, required: true, maxlength: 50 })
  location_code: string;

  /** Tên mô tả vị trí (vd: "Kho Hà Nội", "Zone A", "Rack B2", "Bin B2-001") */
  @Prop({ type: String, required: true, maxlength: 100 })
  location_name: string;

  /** Cấp độ vị trí (warehouse/zone/shelf/bin) */
  @Prop({
    type: String,
    enum: Object.values(LocationLevel),
    required: true,
  })
  level: LocationLevel;

  /** Mã vị trí cha (dùng để tạo cây phân cấp)
   * Vd: parent_code của "BIN-B2-001" là "RACK-B2"
   * Vd: parent_code của "RACK-B2" là "ZONE-B"
   */
  @Prop({ type: String, maxlength: 50, required: false })
  parent_code?: string;

  /** Mô tả chi tiết về vị trí */
  @Prop({ type: String, maxlength: 500, required: false })
  description?: string;

  /** Sức chứa tối đa (tùy chọn, vd: số lượng pallets, kg, ...) */
  @Prop({ type: Number, required: false })
  capacity?: number;

  /** Trạng thái hoạt động (true: đang dùng, false: ngừng dùng) */
  @Prop({ type: Boolean, default: false })
  is_active: boolean;

  /** Ngày tạo bản ghi */
  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  /** Ngày sửa đổi cuối cùng */
  @Prop({ type: Date, default: Date.now })
  modified_date: Date;

  /** Ghi chú thêm về vị trí */
  @Prop({ type: String, maxlength: 500, required: false })
  notes?: string;
}

export const WarehouseLocationSchema =
  SchemaFactory.createForClass(WarehouseLocation);

// ==================== Indexes ====================

// Unique index trên location_code (business key)
WarehouseLocationSchema.index({ location_code: 1 }, { unique: true });

// Index lọc theo cấp độ (warehouse/zone/shelf/bin)
WarehouseLocationSchema.index({ level: 1 });

// Index tìm vị trí con theo mã cha (dùng để duyệt cây phân cấp)
WarehouseLocationSchema.index({ parent_code: 1 });

// Index lọc theo trạng thái hoạt động
WarehouseLocationSchema.index({ is_active: 1 });
