/**
 * File: schemas/qc-test.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho collection qc_tests
 * 
 * Schema này chỉ sử dụng để đọc dữ liệu phục vụ đồng bộ analytics
 * Collection: qc_tests - Kết quả kiểm tra chất lượng (Quality Control)
 * Đồng bộ vào ES index: qc_tests_{YYYY}_{MM}
 * 
 * QC Test (Kiểm tra chất lượng) được thực hiện trên một lô hàng (lot)
 * Để đảm bảo vật tư đạt tiêu chuẩn trước khi nhập kho
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QCTestDocument = QCTest & Document;

/**
 * Schema định nghĩa cấu trúc kết quả kiểm tra chất lượng
 * @collection: 'qc_tests' - Tên collection trong MongoDB
 * @timestamps: Tự động thêm created_date và modified_date
 */
@Schema({
  collection: 'qc_tests',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class QCTest {
  @Prop() test_id: string;                // Mã kiểm tra (unique identifier)
  @Prop() lot_id: string;                  // ID lô hàng được kiểm tra
  @Prop() test_type: string;                // Loại kiểm tra (API, vi sinh, etc.)
  @Prop() test_date: Date;                  // Ngày thực hiện kiểm tra
  @Prop() result_status: string;            // Kết quả (PASS, FAIL, PENDING)
  @Prop() created_date: Date;              // Ngày tạo (tự động)
  @Prop() modified_date: Date;             // Ngày sửa đổi (tự động)
  @Prop({ default: false }) deleted?: boolean;     // Cờ soft delete
  @Prop() is_active?: boolean;                     // Trạng thái kích hoạt
}

export const QCTestSchema = SchemaFactory.createForClass(QCTest);
// Index cho modified_date (dùng cho watermark query)
QCTestSchema.index({ modified_date: 1 });
