import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

/**
 * InventoryTransactionSchema - Schema định nghĩa giao dịch tồn kho trong MongoDB
 *
 * Collection: inventory_transactions
 *
 * Mô tả: Ghi nhận tất cả các giao dịch làm thay đổi số lượng tồn kho.
 * Đây là bảng "nhật ký" (audit trail) cho mọi thay đổi số lượng lô hàng.
 *
 * Các loại giao dịch (transaction_type):
 * - Receipt: Nhập kho (tăng tồn)
 * - Usage: Xuất kho (giảm tồn) - sử dụng trong sản xuất
 * - Split: Tách lô (một lô lớn thành nhiều lô nhỏ)
 * - Adjustment: Điều chỉnh tồn kho (do kiểm kê, hư hỏng, hết hạn)
 * - Transfer: Chuyển kho (từ kho này sang kho khác)
 * - Disposal: Hủy hàng (tiêu hủy)
 *
 * Các trường chính:
 * - transaction_id: ID giao dịch duy nhất (TXN-XXX)
 * - lot_id: Lô hàng chịu tác động
 * - related_lot_id: Lô liên quan (vd: lô đích khi chuyển/split)
 * - transaction_type: Loại giao dịch
 * - quantity: Số lượng giao dịch (+tăng/-giảm)
 * - unit_of_measure: Đơn vị tính
 * - transaction_date: Ngày giờ giao dịch
 * - performed_by: Người thực hiện
 * - reference_number: Số tham chiếu (vd: receipt_id, adjustment_id)
 * - adjustment_id: ID phiếu điều chỉnh (nếu là giao dịch điều chỉnh)
 * - adjustment_reason_code: Mã lý do điều chỉnh
 */
export type InventoryTransactionDocument = InventoryTransaction & Document;

const options: SchemaOptions = {
  collection: 'inventory_transactions',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryTransaction {
  /** Mã giao dịch duy nhất (TXN-XXX) - Business key */
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  transaction_id: string;

  /** Mã lô hàng chịu tác động (tham chiếu inventory_lots.lot_id) */
  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string;

  // Traceability: liên kết lô liên quan (chuyển lô, split, transfer...)
  /** Mã lô liên quan (vd: lô đích khi chuyển kho, lô mới khi tách) */
  @Prop({ type: String, maxlength: 36, required: false })
  related_lot_id?: string;

  /** Loại giao dịch:
   * - Receipt: Nhập kho (tăng số lượng)
   * - Usage: Xuất kho (giảm số lượng)
   * - Split: Tách lô (một lô thành nhiều)
   * - Adjustment: Điều chỉnh (kiểm kê, hư hỏng)
   * - Transfer: Chuyển kho (từ kho A sang kho B)
   * - Disposal: Hủy hàng (tiêu hủy)
   */
  @Prop({
    type: String,
    enum: ['Receipt', 'Usage', 'Split', 'Adjustment', 'Transfer', 'Disposal'],
    required: true,
  })
  transaction_type: string;

  /** Số lượng giao dịch (dương = nhập/tăng, âm = xuất/giảm) */
  @Prop({ type: Number, required: true })
  quantity: number;

  /** Đơn vị tính (EA, kg, L, v.v.) */
  @Prop({ type: String, required: true, maxlength: 10 })
  unit_of_measure: string;

  /** Ngày giờ thực hiện giao dịch */
  @Prop({ type: Date, required: true })
  transaction_date: Date;

  /** Số tham chiếu (vd: receipt_id, adjustment_id, slip_id...) */
  @Prop({ type: String, maxlength: 50, required: false })
  reference_number?: string;

  /** Người thực hiện giao dịch (username hoặc user ID) */
  @Prop({ type: String, required: true, maxlength: 50 })
  performed_by: string;

  /** Ghi chú thêm về giao dịch */
  @Prop({ type: String, required: false })
  notes?: string;

  /** ID phiếu điều chỉnh (nếu là giao dịch Adjustment) */
  @Prop({ type: String, required: false, maxlength: 36 })
  adjustment_id?: string;

  /** Mã lý do điều chỉnh (count, damage, expiry, other) */
  @Prop({ type: String, required: false, maxlength: 50 })
  adjustment_reason_code?: string;
}

export const InventoryTransactionSchema =
  SchemaFactory.createForClass(InventoryTransaction);

// ==================== Indexes - Chỉ mục cơ sở dữ liệu ====================

// Compound index: lô hàng + ngày giao dịch (dùng cho lịch sử lô)
InventoryTransactionSchema.index({ lot_id: 1, transaction_date: -1 });

// Index sắp xếp theo ngày giao dịch mới nhất
InventoryTransactionSchema.index({ transaction_date: -1 });

// Index lọc theo loại giao dịch
InventoryTransactionSchema.index({ transaction_type: 1 });

// Compound index: người thực hiện + ngày (dùng cho báo cáo cá nhân)
InventoryTransactionSchema.index({ performed_by: 1, transaction_date: -1 });

// Compound index: người thực hiện + tham chiếu (vd: lấy all transactions của 1 receipt)
InventoryTransactionSchema.index({ performed_by: 1, reference_number: 1 });

// Compound index: người thực hiện + lô (dùng cho lịch sử thao tác của 1 người trên 1 lô)
InventoryTransactionSchema.index({ performed_by: 1, lot_id: 1 });

// Index tham chiếu phiếu điều chỉnh (nếu là Adjustment transaction)
InventoryTransactionSchema.index({ adjustment_id: 1 });
