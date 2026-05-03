/**
 * InventoryLotSchema - Schema định nghĩa lô hàng tồn kho trong MongoDB
 *
 * Collection: inventory_lots
 *
 * Mô tả: Quản lý các lô hàng (lots) trong kho theo nguyên tắc FIFO/FEFO.
 * Mỗi lô đại diện cho một lần nhận vật tư cụ thể từ nhà cung cấp.
 *
 * Vòng đời lô hàng:
 * Quarantine → Accepted → Depleted (hoặc Rejected)
 *
 * Các trường chính:
 * - lot_id: ID lô duy nhất (LOT-XXXXX)
 * - material_id: Vật tư thuộc lô này
 * - manufacturer_name, manufacturer_lot: Thông tin nhà sản xuất
 * - supplier_name: Nhà cung cấp
 * - received_date, expiration_date: Ngày nhận và hạn sử dụng
 * - status: Trạng thái lô (Quarantine, Accepted, Rejected, Depleted)
 * - quantity, unit_of_measure: Số lượng và đơn vị
 * - warehouse_id, storage_location: Vị trí lưu kho (storage_location chính là bin)
 * - parent_lot_id: ID lô cha (nếu là mẫu thử)
 * - is_sample: Có phải lô mẫu không
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { InventoryLotStatus } from '../inventory-lot/inventory-lot.dto';

export type InventoryLotDocument = InventoryLot & Document;

// Collection name và timestamps configuration
// Sử dụng created_date/modified_date thay vì createdAt/updatedAt
const options: SchemaOptions = {
  collection: 'inventory_lots',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryLot {
  /** Mã lô hàng duy nhất (LOT-XXXXX) - Business key */
  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string;

  /** Mã vật tư thuộc lô này (tham chiếu đến material_id trong collection materials) */
  @Prop({ type: String, required: true, maxlength: 20 })
  material_id: string;

  /** Tên nhà sản xuất vật tư */
  @Prop({ type: String, required: true, maxlength: 100 })
  manufacturer_name: string;

  /** Mã lô của nhà sản xuất (lot number từ manufacturer) */
  @Prop({ type: String, required: true, maxlength: 50 })
  manufacturer_lot: string;

  /** Tên nhà cung cấp (supplier) - tùy chọn */
  @Prop({ type: String, maxlength: 100, required: false })
  supplier_name?: string;

  /** Ngày sản xuất (manufacture date) - tùy chọn */
  @Prop({ type: Date, required: false })
  manufacture_date?: Date;

  /** Ngày nhận hàng vào kho (ngày nhập kho) */
  @Prop({ type: Date, required: true })
  received_date: Date;

  /** Ngày hết hạn sử dụng (expiration date) - quan trọng để quản lý FEFO */
  @Prop({ type: Date, required: true })
  expiration_date: Date;

  /** Ngày hết hạn khi mở bao bì (in-use expiration) - tùy chọn */
  @Prop({ type: Date, required: false })
  in_use_expiration_date?: Date;

  /** Trạng thái lô hàng: Quarantine (cách ly), Accepted (chấp nhận), Rejected (từ chối), Depleted (đã hết) */
  @Prop({
    type: String,
    enum: Object.values(InventoryLotStatus),
    required: true,
  })
  status: InventoryLotStatus;

  /** Số lượng hiện tại trong lô (có thể thay đổi qua các giao dịch) */
  @Prop({ type: Number, required: true })
  quantity: number;

  /** Đơn vị tính (EA, kg, L, v.v.) */
  @Prop({ type: String, required: true, maxlength: 10 })
  unit_of_measure: string;

  /** Mã kho chứa lô hàng (tham chiếu warehouse_id) - tùy chọn */
  @Prop({ type: String, maxlength: 50, required: false })
  warehouse_id?: string;

  /** Vị trí lưu kho cụ thể (Bin/Rack) - được dùng như bin_code trong bin worklist */
  @Prop({ type: String, maxlength: 100, required: false, trim: true, uppercase: true })
  storage_location?: string;

  /** Đánh dấu đây là lô mẫu (sample) để kiểm tra chất lượng */
  @Prop({ type: Boolean, default: false })
  is_sample: boolean;

  /** Mã lô cha (nếu đây là lô mẫu được tách từ lô gốc) */
  @Prop({ type: String, maxlength: 36, required: false })
  parent_lot_id?: string;

  /** Ghi chú thêm về lô hàng */
  @Prop({ type: String, required: false })
  notes?: string;

  /** Ngày tạo bản ghi (tự động bởi timestamps) */
  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  /** Ngày sửa đổi cuối cùng (tự động bởi timestamps) */
  @Prop({ type: Date, default: Date.now })
  modified_date: Date;

  // Traceability & workflow fields - Truy vết và lịch sử

  /** Người nhận hàng (người nhập kho) */
  @Prop({ type: String, maxlength: 50, required: false })
  received_by?: string;

  /** Người kiểm tra QC (Quality Control) */
  @Prop({ type: String, maxlength: 50, required: false })
  qc_by?: string;

  /** Lịch sử thay đổi trạng thái và các sự kiện truy vết */
  @Prop({
    type: [Object],
    required: false,
    default: [],
    description: 'Lịch sử thay đổi trạng thái, traceability',
  })
  history?: Record<string, any>[];
}

export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);

// ==================== Indexes cho hiệu năng ====================

// Unique index trên lot_id (business key - khóa nghiệp vụ)
InventoryLotSchema.index({ lot_id: 1 }, { unique: true });

// Index tìm kiếm theo vật tư
InventoryLotSchema.index({ material_id: 1 });

// Index lọc theo trạng thái
InventoryLotSchema.index({ status: 1 });

// Index tìm lô sắp hết hạn/hết hạn (sắp xếp theo expiration_date)
InventoryLotSchema.index({ expiration_date: 1 });

// Index sắp xếp theo ngày tạo mới nhất
InventoryLotSchema.index({ created_date: -1 });

// Compound index cho query phổ biến: lô theo vật tư + trạng thái
InventoryLotSchema.index({ material_id: 1, status: 1 });

// Index cho query lô mẫu: is_sample + parent_lot_id
InventoryLotSchema.index({ is_sample: 1, parent_lot_id: 1 });

// ==================== Indexes hỗ trợ Bin Worklist ====================
// storage_location được dùng như bin_code trong bin worklist

// Index tìm lô theo vị trí lưu kho (bin)
InventoryLotSchema.index({ storage_location: 1 });

// Compound index cho bin worklist: bin + modified_date (sắp xếp lần đếm cuối)
InventoryLotSchema.index({ storage_location: 1, modified_date: -1 });
