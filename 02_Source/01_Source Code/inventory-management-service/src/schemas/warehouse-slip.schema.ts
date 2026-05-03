import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { SlipAttachmentSchema, SlipAttachment } from './slip-attachment.schema';
import {
  WarehouseSlipLineSchema,
  WarehouseSlipLine,
} from './warehouse-slip-line.schema';

/**
 * WarehouseSlipSchema - Schema định nghĩa phiếu nhập/xuất kho trong MongoDB
 *
 * Collection: warehouse_slips
 *
 * Mô tả: Quản lý các phiếu nhập kho (IN) và xuát kho (OUT).
 * Mỗi phiếu đại diện cho một lần nhập/xuất hàng với nhiều mặt hàng (lines).
 *
 * Trạng thái phiếu:
 * - PENDING: Chờ xác nhận
 * - CONFIRMED: Đã xác nhận (hàng đã nhập/xuất)
 * - REJECTED: Bị từ chối
 *
 * Các trường chính:
 * - slip_id: ID nội bộ (UUID)
 * - slip_number: Số phiếu duy nhất (business key)
 * - type: Loại phiếu (IN/OUT)
 * - warehouse_id: Kho thực hiện
 * - status: Trạng thái phiếu
 * - confirmed_by/at: Người và thời điểm xác nhận
 * - rejected_by/at/reason: Thông tin từ chối
 * - locked: Khóa phiếu (không cho sửa)
 * - processed_transactions: Danh sách giao dịch kho đã tạo
 * - lines: Chi tiết phiếu (nhiều dòng hàng)
 * - attachments: Tệp đính kèm (hóa đơn, chứng từ, ...)
 */
export type WarehouseSlipDocument = WarehouseSlip & Document;

// Align timestamps naming with existing schemas (created_date / modified_date)
const options: SchemaOptions = {
  collection: 'warehouse_slips',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

// SlipAttachment and WarehouseSlipLine moved to separate files

@Schema(options)
export class WarehouseSlip {
  /** ID nội bộ (UUID) - tự động sinh */
  @Prop({ default: uuidv4 })
  slip_id: string;

  /** Số phiếu duy nhất (business key) - Vd: "NK-001", "XK-042" */
  @Prop({ unique: true, required: true })
  slip_number: string;

  /** Loại phiếu:
   * - 'IN': Phiếu nhập kho (tăng tồn)
   * - 'OUT': Phiếu xuát kho (giảm tồn)
   */
  @Prop({ required: true, enum: ['IN', 'OUT'] })
  type: 'IN' | 'OUT';

  /** Mã kho thực hiện (tham chiếu warehouse_id) */
  @Prop({ required: true })
  warehouse_id: string;

  /** Trạng thái phiếu:
   * - 'PENDING': Chờ xác nhận
   * - 'CONFIRMED': Đã xác nhận (hàng đã nhập/xuất)
   * - 'REJECTED': Bị từ chối
   */
  @Prop({ enum: ['PENDING', 'CONFIRMED', 'REJECTED'], default: 'PENDING' })
  status: string;

  /** Người xác nhận phiếu (Manager/Operator) */
  @Prop()
  confirmed_by?: string;

  /** Thời điểm xác nhận */
  @Prop({ type: Date })
  confirmed_at?: Date;

  /** Người từ chối phiếu */
  @Prop()
  rejected_by?: string;

  /** Thời điểm từ chối */
  @Prop({ type: Date })
  rejected_at?: Date;

  /** Lý do từ chối phiếu */
  @Prop()
  reject_reason?: string;

  /** Khóa phiếu (true: không cho phép sửa/xóa) */
  @Prop({ default: false })
  locked?: boolean;

  /** Danh sách IDs giao dịch kho đã tạo từ phiếu này */
  @Prop({ type: [String], default: [] })
  processed_transactions?: string[];

  /** Số tham chiếu (vd: mã đơn hàng, mã hợp đồng) */
  @Prop()
  reference_number?: string;

  /** Tổng số lượng trên phiếu */
  @Prop({ default: 0 })
  total_quantity?: number;

  /** Tổng giá trị phiếu (nếu có) */
  @Prop({ default: 0 })
  total_value?: number;

  /** Người tạo phiếu */
  @Prop()
  created_by?: string;

  /** Ghi chú thêm về phiếu */
  @Prop()
  notes?: string;

  /** Chi tiết phiếu (nhiều dòng hàng - mỗi dòng là một lô) */
  @Prop({ type: [WarehouseSlipLineSchema], default: [] })
  lines: WarehouseSlipLine[];

  /** Tệp đính kèm (hóa đơn, chứng từ, hình ảnh...) */
  @Prop({ type: [SlipAttachmentSchema], default: [] })
  attachments: SlipAttachment[];
}

export const WarehouseSlipSchema = SchemaFactory.createForClass(WarehouseSlip);

// ==================== Indexes ====================

// Unique index trên slip_number (business key)
WarehouseSlipSchema.index({ slip_number: 1 }, { unique: true });

// Compound index: kho + trạng thái (truy vấn phiếu theo kho và trạng thái)
WarehouseSlipSchema.index({ warehouse_id: 1, status: 1 });

// Unique index trên slip_id (nội bộ)
WarehouseSlipSchema.index({ slip_id: 1 }, { unique: true });
