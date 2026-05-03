import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * BinCountRecordSchema - Schema lưu trữ kết quả đếm tồn kho tại Bin (vị trí lưu kho)
 *
 * Collection: bin_count_records
 *
 * Mô tả: Ghi nhận kết quả kiểm kê (cycle count) tại từng vị trí lưu kho (bin).
 * Mỗi bản ghi đại diện cho một lần đếm tồn kho tại một bin cụ thể.
 *
 * Quy trình: Người đếm (counted_by) đi đếm số lượng thực tế tại bin,
 * sau đó hệ thống so sánh với số lượng kỳ vọng (expected_qty) để phát hiện chênh lệch.
 *
 * Các trường chính:
 * - bin_code: Mã vị trí lưu kho (tham chiếu đến storage_location.location_id)
 * - counted_by: Người thực hiện đếm (username hoặc ID)
 * - counted_at: Thời điểm đếm
 * - entries: Danh sách các lô hàng đã đếm (lot_id, material_id, expected_qty, counted_qty, ...)
 * - flag_review: Cờ đánh dấu cần review (khi chênh lệch >= 50%)
 * - notes: Ghi chú cho lần đếm
 * - attachments: Danh sách tệp đính kèm (hình ảnh, file, ...)
 */
export type BinCountRecordDocument = BinCountRecord & Document;

@Schema({ collection: 'bin_count_records', timestamps: true })
export class BinCountRecord {
  /** Mã vị trí lưu kho (bin_code) - tham chiếu storage_location.location_id */
  @Prop({ type: String, required: true, maxlength: 100 })
  bin_code: string;

  /** Người thực hiện đếm tồn kho (username hoặc user ID) */
  @Prop({ type: String, required: true, maxlength: 50 })
  counted_by: string;

  /** Thời điểm thực hiện đếm (mặc định: hiện tại) */
  @Prop({ type: Date, default: () => new Date() })
  counted_at: Date;

  /** Danh sách các lô hàng đã đếm trong lần này
   * Mỗi entry gồm:
   * - lot_id: Mã lô hàng
   * - material_id: Mã vật tư
   * - expected_qty: Số lượng kỳ vọng (từ hệ thống)
   * - counted_qty: Số lượng thực tế đếm được
   * - unit_of_measure: Đơn vị tính
   * - notes: Ghi chú cho entry này
   */
  @Prop({
    type: [
      {
        lot_id: { type: String },
        material_id: { type: String },
        expected_qty: { type: Number },
        counted_qty: { type: Number },
        unit_of_measure: { type: String },
        notes: { type: String },
      },
    ],
    default: [],
  })
  entries: Record<string, any>[];

  /** Cờ đánh dấu cần review (true: có chênh lệch lớn >= 50%, cần Manager xem xét) */
  @Prop({ type: Boolean, default: false })
  flag_review: boolean;

  /** Ghi chú chung cho lần đếm này */
  @Prop({ type: String, required: false })
  notes?: string;

  /** Danh sách tệp đính kèm (hình ảnh, PDF, ...) - tùy chọn */
  @Prop({ type: [Object], default: [] })
  attachments?: Record<string, any>[];
}

export const BinCountRecordSchema =
  SchemaFactory.createForClass(BinCountRecord);

// ==================== Indexes hỗ trợ truy vấn ====================

// Index tìm kiếm theo bin_code (lấy lịch sử đếm của một bin)
BinCountRecordSchema.index({ bin_code: 1 });

// Index sắp xếp theo thời gian đếm (mới nhất đầu tiên)
BinCountRecordSchema.index({ counted_at: -1 });

// Index lọc theo flag_review (lấy các bản ghi cần review)
BinCountRecordSchema.index({ flag_review: 1 });
