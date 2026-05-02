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
 * - warehouse_id, storage_location: Vị trí lưu kho
 * - parent_lot_id: ID lô cha (nếu là mẫu thử)
 * - is_sample: Có phải lô mẫu không
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { InventoryLotStatus } from '../inventory-lot/inventory-lot.dto';

export type InventoryLotDocument = InventoryLot & Document;

// Collection name và timestamps configuration
const options: SchemaOptions = {
  collection: 'inventory_lots',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryLot {
  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string;

  @Prop({ type: String, required: true, maxlength: 20 })
  material_id: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  manufacturer_name: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  manufacturer_lot: string;

  @Prop({ type: String, maxlength: 100, required: false })
  supplier_name?: string;

  @Prop({ type: Date, required: false })
  manufacture_date?: Date;

  @Prop({ type: Date, required: true })
  received_date: Date;

  @Prop({ type: Date, required: true })
  expiration_date: Date;

  @Prop({ type: Date, required: false })
  in_use_expiration_date?: Date;

  @Prop({
    type: String,
    enum: Object.values(InventoryLotStatus),
    required: true,
  })
  status: InventoryLotStatus;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: true, maxlength: 10 })
  unit_of_measure: string;

  @Prop({ type: String, maxlength: 50, required: false })
  warehouse_id?: string;

  @Prop({ type: String, maxlength: 100, required: false, trim: true, uppercase: true })
  storage_location?: string;

  @Prop({ type: Boolean, default: false })
  is_sample: boolean;

  @Prop({ type: String, maxlength: 36, required: false })
  parent_lot_id?: string;

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  @Prop({ type: Date, default: Date.now })
  modified_date: Date;

  // Traceability & workflow fields
  @Prop({ type: String, maxlength: 50, required: false })
  received_by?: string;

  @Prop({ type: String, maxlength: 50, required: false })
  qc_by?: string;

  @Prop({
    type: [Object],
    required: false,
    default: [],
    description: 'Lịch sử thay đổi trạng thái, traceability',
  })
  history?: Record<string, any>[];
}

export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);

// Create indexes for performance
InventoryLotSchema.index({ lot_id: 1 }, { unique: true });
InventoryLotSchema.index({ material_id: 1 });
InventoryLotSchema.index({ status: 1 });
InventoryLotSchema.index({ expiration_date: 1 });
InventoryLotSchema.index({ created_date: -1 });
InventoryLotSchema.index({ material_id: 1, status: 1 });
InventoryLotSchema.index({ is_sample: 1, parent_lot_id: 1 });

// Indexes to support bin worklist (using storage_location as bin_code)
InventoryLotSchema.index({ storage_location: 1 });
InventoryLotSchema.index({ storage_location: 1, modified_date: -1 });
