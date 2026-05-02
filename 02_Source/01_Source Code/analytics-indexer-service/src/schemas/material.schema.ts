/**
 * File: schemas/material.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho collection materials
 * 
 * Schema này chỉ sử dụng để đọc dữ liệu (read-only) phục vụ đồng bộ analytics
 * Không dùng để ghi dữ liệu - service khác (backend) sẽ làm việc đó
 * 
 * Collection: materials - Danh mục vật tư trong hệ thống
 * Đồng bộ vào ES index: materials_{YYYY}_{MM}
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MaterialDocument = Material & Document;

/**
 * Schema định nghĩa cấu trúc vật tư (material)
 * @collection: 'materials' - Tên collection trong MongoDB
 * @timestamps: Tự động thêm created_date và modified_date
 */
@Schema({
  collection: 'materials',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class Material {
  @Prop() material_id: string;      // Mã vật tư (unique identifier)
  @Prop() part_number: string;        // Mã phần (part number)
  @Prop() material_name: string;       // Tên vật tư
  @Prop() material_type: string;       // Loại vật tư (API, Excipient, etc.)
  @Prop() created_date: Date;          // Ngày tạo (tự động)
  @Prop() modified_date: Date;         // Ngày sửa đổi (tự động)
  @Prop({ default: false }) deleted?: boolean;    // Cờ soft delete
  @Prop() is_active?: boolean;                 // Trạng thái kích hoạt
}

// Tạo Mongoose Schema từ class và đánh index cho trường modified_date (dùng cho watermark query)
export const MaterialSchema = SchemaFactory.createForClass(Material);
MaterialSchema.index({ modified_date: 1 });
