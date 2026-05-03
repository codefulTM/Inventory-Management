import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

/**
 * InventoryAdjustmentSchema - Schema định nghĩa phiếu điều chỉnh tồn kho trong MongoDB
 *
 * Collection: inventory_adjustments
 *
 * Mô tả: Ghi nhận các điều chỉnh tồn kho do kiểm kê, chênh lệch, hư hỏng, hết hạn.
 * Mỗi phiếu điều chỉnh đại diện cho một lần thay đổi số lượng tồn kho (tăng hoặc giảm).
 * Tự động tạo một InventoryTransaction liên kết để ghi nhận lịch sử.
 *
 * Các mã lý do điều chỉnh (reason_code):
 * - DAMAGED: Hư hỏng trong quá trình lưu kho/vận chuyển
 * - LOST: Mất mát (không rõ nguyên nhân)
 * - EXPIRED: Hết hạn sử dụng (tự động hoặc thủ công)
 * - COUNT_CORRECTION: Điều chỉnh sau kiểm kê (count correction)
 * - SYSTEM_CORRECTION: Điều chỉnh do lỗi hệ thống
 * - OTHER: Lý do khác (phải có reason_note chi tiết)
 *
 * Các trường chính:
 * - adjustment_id: Mã phiếu điều chỉnh duy nhất (ADJ-XXX)
 * - lot_id: Lô hàng bị điều chỉnh
 * - material_id: Vật tư bị điều chỉnh
 * - adjustment_quantity: Số lượng điều chỉnh (+tăng, -giảm)
 * - quantity_before/after: Số lượng trước và sau điều chỉnh
 * - reason_code: Mã lý do điều chỉnh
 * - unit_cost_snapshot: Giá vốn tại thời điểm điều chỉnh
 * - valuation_before/after/delta: Giá trị tồn kho trước, sau và chênh lệch
 * - performed_by: Người thực hiện
 * - approved_by: Người phê duyệt (Manager)
 * - linked_transaction_id: ID giao dịch kho liên kết
 */
export type InventoryAdjustmentDocument = InventoryAdjustment & Document;

export enum InventoryAdjustmentReasonCode {
  DAMAGED = 'DAMAGED',           // Hư hỏng (trong kho hoặc vận chuyển)
  LOST = 'LOST',                 // Mất mát (không rõ nguyên nhân)
  EXPIRED = 'EXPIRED',           // Hết hạn sử dụng
  COUNT_CORRECTION = 'COUNT_CORRECTION', // Điều chỉnh sau kiểm kê (count correction)
  SYSTEM_CORRECTION = 'SYSTEM_CORRECTION', // Điều chỉnh do lỗi hệ thống
  OTHER = 'OTHER',               // Lý do khác (phải có reason_note)
}

const options: SchemaOptions = {
  collection: 'inventory_adjustments',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryAdjustment {
  /** Mã phiếu điều chỉnh duy nhất (ADJ-XXX) - Business key */
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  adjustment_id: string;

  /** Mã lô hàng bị điều chỉnh (tham chiếu inventory_lots.lot_id) */
  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string;

  /** Mã vật tư bị điều chỉnh (tham chiếu materials.material_id) */
  @Prop({ type: String, required: true, maxlength: 20 })
  material_id: string;

  /** Số lượng điều chỉnh (dương = tăng tồn, âm = giảm tồn) */
  @Prop({ type: Number, required: true })
  adjustment_quantity: number;

  /** Số lượng tồn trước khi điều chỉnh */
  @Prop({ type: Number, required: true })
  quantity_before: number;

  /** Số lượng tồn sau khi điều chỉnh */
  @Prop({ type: Number, required: true })
  quantity_after: number;

  /** Mã lý do điều chỉnh (DAMAGED|LOST|EXPIRED|COUNT_CORRECTION|SYSTEM_CORRECTION|OTHER) */
  @Prop({
    type: String,
    enum: Object.values(InventoryAdjustmentReasonCode),
    required: true,
  })
  reason_code: InventoryAdjustmentReasonCode;

  /** Ghi chú chi tiết lý do (bắt buộc nếu reason_code = OTHER) */
  @Prop({ type: String, required: false, maxlength: 500 })
  reason_note?: string;

  /** Giá vốn tức thời (đ/unit) - dùng để tính giá trị tồn kho */
  @Prop({ type: Number, required: true, min: 0 })
  unit_cost_snapshot: number;

  /** Giá trị tồn kho trước điều chỉnh = quantity_before × unit_cost_snapshot */
  @Prop({ type: Number, required: true })
  valuation_before: number;

  /** Giá trị tồn kho sau điều chỉnh = quantity_after × unit_cost_snapshot */
  @Prop({ type: Number, required: true })
  valuation_after: number;

  /** Lệch giá trị tồn kho = valuation_after - valuation_before */
  @Prop({ type: Number, required: true })
  valuation_delta: number;

  /** Người thực hiện điều chỉnh (username hoặc user ID) */
  @Prop({ type: String, required: true, maxlength: 50 })
  performed_by: string;

  /** Người phê duyệt điều chỉnh (Manager - bắt buộc với số lượng lớn) */
  @Prop({ type: String, required: false, maxlength: 50 })
  approved_by?: string;

  /** Mã giao dịch kho liên kết (tham chiếu inventory_transactions.transaction_id) */
  @Prop({ type: String, required: true, maxlength: 36 })
  linked_transaction_id: string;

  /** Ngày tạo phiếu điều chỉnh */
  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  /** Ngày sửa đổi cuối cùng */
  @Prop({ type: Date, default: Date.now })
  modified_date: Date;
}

export const InventoryAdjustmentSchema =
  SchemaFactory.createForClass(InventoryAdjustment);

// ==================== Indexes ====================

// Unique index trên adjustment_id (business key)
InventoryAdjustmentSchema.index({ adjustment_id: 1 }, { unique: true });

// Compound index: lô hàng + ngày tạo (lịch sử điều chỉnh của 1 lô)
InventoryAdjustmentSchema.index({ lot_id: 1, created_date: -1 });

// Compound index: vật tư + ngày tạo (lịch sử điều chỉnh của 1 vật tư)
InventoryAdjustmentSchema.index({ material_id: 1, created_date: -1 });

// Compound index: lý do + ngày tạo (thống kê theo lý do)
InventoryAdjustmentSchema.index({ reason_code: 1, created_date: -1 });

// Compound index: người thực hiện + ngày tạo (báo cáo cá nhân)
InventoryAdjustmentSchema.index({ performed_by: 1, created_date: -1 });
