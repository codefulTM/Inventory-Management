import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type InventoryAdjustmentDocument = InventoryAdjustment & Document;

export enum InventoryAdjustmentReasonCode {
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  EXPIRED = 'EXPIRED',
  COUNT_CORRECTION = 'COUNT_CORRECTION',
  SYSTEM_CORRECTION = 'SYSTEM_CORRECTION',
  OTHER = 'OTHER',
}

const options: SchemaOptions = {
  collection: 'inventory_adjustments',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryAdjustment {
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  adjustment_id: string; // Mã phiếu điều chỉnh

  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string; // Mã lô

  @Prop({ type: String, required: true, maxlength: 20 })
  material_id: string; // Mã vật tư

  @Prop({ type: Number, required: true })
  adjustment_quantity: number; // Số lượng điều chỉnh (dương: tăng, âm: giảm)

  @Prop({ type: Number, required: true })
  quantity_before: number; // Số lượng trước

  @Prop({ type: Number, required: true })
  quantity_after: number; // Số lượng sau

  @Prop({
    type: String,
    enum: Object.values(InventoryAdjustmentReasonCode),
    required: true,
  })
  reason_code: InventoryAdjustmentReasonCode; // Mã lý do: DAMAGED|LOST|EXPIRED|COUNT_CORRECTION|SYSTEM_CORRECTION|OTHER

  @Prop({ type: String, required: false, maxlength: 500 })
  reason_note?: string; // Ghi chú lý do

  @Prop({ type: Number, required: true, min: 0 })
  unit_cost_snapshot: number; // Giá vốn tức thời (đ/unit) - dùng tính giá trị tồn kho

  @Prop({ type: Number, required: true })
  valuation_before: number; // Giá trị trước = quantity_before × unit_cost_snapshot

  @Prop({ type: Number, required: true })
  valuation_after: number; // Giá trị sau = quantity_after × unit_cost_snapshot

  @Prop({ type: Number, required: true })
  valuation_delta: number; // Lệch giá trị = valuation_after - valuation_before

  @Prop({ type: String, required: true, maxlength: 50 })
  performed_by: string; // Thực hiện bởi (user_id)

  @Prop({ type: String, required: false, maxlength: 50 })
  approved_by?: string; // Phê duyệt bởi (manager user_id)

  @Prop({ type: String, required: true, maxlength: 36 })
  linked_transaction_id: string; // Mã giao dịch liên kết (inventory_transaction.id)

  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  @Prop({ type: Date, default: Date.now })
  modified_date: Date;
}

export const InventoryAdjustmentSchema =
  SchemaFactory.createForClass(InventoryAdjustment);

InventoryAdjustmentSchema.index({ adjustment_id: 1 }, { unique: true });
InventoryAdjustmentSchema.index({ lot_id: 1, created_date: -1 });
InventoryAdjustmentSchema.index({ material_id: 1, created_date: -1 });
InventoryAdjustmentSchema.index({ reason_code: 1, created_date: -1 });
InventoryAdjustmentSchema.index({ performed_by: 1, created_date: -1 });
