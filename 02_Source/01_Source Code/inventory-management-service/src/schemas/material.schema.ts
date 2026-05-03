/**
 * MaterialSchema - Schema định nghĩa cấu trúc vật tư trong MongoDB
 *
 * Collection: materials
 *
 * Mô tả: Master data cho vật tư/nguyên liệu sử dụng trong hệ thống quản lý kho.
 * Mỗi vật tư đại diện cho một loại nguyên liệu, thành phẩm, hoặc phụ liệu.
 *
 * Các trường chính:
 * - material_id: ID nghiệp vụ duy nhất (MAT-XXX, sinh bởi Redis)
 * - part_number: Mã part number duy nhất
 * - material_name: Tên vật tư
 * - material_type: Loại (API, Excipient, Container, v.v.)
 * - storage_conditions: Điều kiện bảo quản (2-8C, 15-25C, Dry place)
 * - status: Trạng thái phê duyệt (Pending, Approved, Rejected)
 *
 * Timestamps: created_date, modified_date (tự động quản lý bởi Mongoose)
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type MaterialDocument = Material & Document;

// Cấu hình timestamps: dùng tên field created_date/modified_date thay vì createdAt/updatedAt
const options: SchemaOptions = {
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * Master data cho vật tư/khoáng chất
 * Đây là dữ liệu gốc (master data) cho tất cả vật tư trong hệ thống.
 * Mọi lô hàng (lots) đều phải tham chiếu đến một material_id.
 */
@Schema(options)
export class Material {
  /** Mã vật tư duy nhất (MAT-XXX) - Business key, sinh bởi Redis ID service */
  @Prop({ type: String, required: true, maxlength: 20 })
  material_id: string;

  /** Mã part number (mã định danh vật tư từ nhà sản xuất) - Unique */
  @Prop({ type: String, required: true, maxlength: 20 })
  part_number: string;

  /** Tên vật tư/khoáng chất (vd: "Vitamin D3", "Gelatin") */
  @Prop({ type: String, required: true, maxlength: 100 })
  material_name: string;

  /** Loại vật tư:
   * - API: Hoạt chất (Active Pharmaceutical Ingredient)
   * - Excipient: Tá dược
   * - Dietary Supplement: Thực phẩm chức năng
   * - Container: Bao bì chứa đựng
   * - Closure: Nắp đậy, seal
   * - Process Chemical: Hóa chất quy trình
   * - Testing Material: Vật tư thử nghiệm
   */
  @Prop({
    type: String,
    enum: [
      'API',
      'Excipient',
      'Dietary Supplement',
      'Container',
      'Closure',
      'Process Chemical',
      'Testing Material',
    ],
    required: true,
  })
  material_type: string;

  /** Điều kiện bảo quản (vd: "2-8°C", "15-25°C", "Dry place") */
  @Prop({ type: String, maxlength: 100, default: null })
  storage_conditions?: string;

  /** Đường dẫn tài liệu đặc tả kỹ thuật (specification document) */
  @Prop({ type: String, maxlength: 50, default: null })
  specification_document?: string;

  // Traceability & workflow fields - Truy vết và luồng công việc

  /** Người tạo vật tư (username hoặc user ID) */
  @Prop({ type: String, maxlength: 50, required: false })
  created_by?: string;

  /** Người phê duyệt vật tư (Manager) */
  @Prop({ type: String, maxlength: 50, required: false })
  approved_by?: string;

  /** Trạng thái phê duyệt:
   * - Pending: Chờ phê duyệt
   * - Approved: Đã phê duyệt (có thể sử dụng)
   * - Rejected: Bị từ chối
   */
  @Prop({
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: true,
  })
  status: string;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);

// ============================================
// Database Indexes - Các chỉ mục cơ sở dữ liệu
// ============================================

// Unique index trên material_id (business key - khóa nghiệp vụ)
MaterialSchema.index({ material_id: 1 }, { unique: true });

// Unique index trên part_number (business key - mã định danh từ nhà sản xuất)
MaterialSchema.index({ part_number: 1 }, { unique: true });

// Text index trên material_name để tìm kiếm toàn văn (full-text search)
MaterialSchema.index({ material_name: 'text' });

// Index lọc theo loại vật tư
MaterialSchema.index({ material_type: 1 });

// Index sắp xếp theo ngày tạo (mới nhất đầu tiên)
MaterialSchema.index({ created_date: -1 });

// Compound index cho query phổ biến: loại vật tư + ngày tạo
MaterialSchema.index({ material_type: 1, created_date: -1 });
