import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

/**
 * InventoryValuationSummarySchema - Schema tính toán và lưu trữ tổng hợp giá trị tồn kho
 *
 * Collection: inventory_valuation_summaries
 *
 * Mô tả: Lưu trữ giá trị tồn kho tính toán được (valuation) cho từng vật tư.
 * Đây là bảng tổng hợp (summary table) giúp truy vấn nhanh tổng giá trị kho.
 * Được cập nhật mỗi khi có điều chỉnh tồn kho (inventory adjustment).
 *
 * Các trường chính:
 * - material_id: Mã vật tư (tham chiếu materials.material_id) - Unique
 * - unit_cost_reference: Đơn giá tham chiếu (đơn giá dùng để tính giá trị)
 * - total_quantity: Tổng số lượng tồn của vật tư này trên toàn kho
 * - total_value: Tổng giá trị tồn = total_quantity × unit_cost_reference
 * - last_adjustment_id: Mã phiếu điều chỉnh gần nhất
 * - last_updated_by: Người cập nhật gần nhất
 */
export type InventoryValuationSummaryDocument = InventoryValuationSummary &
  Document;

const options: SchemaOptions = {
  collection: 'inventory_valuation_summaries',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryValuationSummary {
  /** Mã vật tư (tham chiếu materials.material_id) - Unique */
  @Prop({ type: String, required: true, unique: true, maxlength: 20 })
  material_id: string;

  /** Đơn giá tham chiếu (đơn giá dùng để tính giá trị tồn kho) */
  @Prop({ type: Number, required: true, min: 0 })
  unit_cost_reference: number;

  /** Tổng số lượng tồn của vật tư này trên toàn kho */
  @Prop({ type: Number, required: true })
  total_quantity: number;

  /** Tổng giá trị tồn = total_quantity × unit_cost_reference */
  @Prop({ type: Number, required: true })
  total_value: number;

  /** Mã phiếu điều chỉnh gần nhất (tham chiếu inventory_adjustments.adjustment_id) */
  @Prop({ type: String, required: false, maxlength: 36 })
  last_adjustment_id?: string;

  /** Người cập nhật gần nhất (username hoặc user ID) */
  @Prop({ type: String, required: false, maxlength: 50 })
  last_updated_by?: string;
}

export const InventoryValuationSummarySchema = SchemaFactory.createForClass(
  InventoryValuationSummary,
);

// ==================== Indexes ====================

// Unique index trên material_id (business key)
InventoryValuationSummarySchema.index({ material_id: 1 }, { unique: true });

// Index sắp xếp theo ngày cập nhật mới nhất
InventoryValuationSummarySchema.index({ modified_date: -1 });
