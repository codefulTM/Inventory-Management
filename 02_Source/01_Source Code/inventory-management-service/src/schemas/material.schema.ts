import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type MaterialDocument = Material & Document;

// Các trường thời gian đồng nhất với domain model
const options: SchemaOptions = {
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * Master data cho vật tư/khoáng chất
 */
@Schema(options)
export class Material {
  @Prop({ type: String, required: true, maxlength: 20 })
  material_id: string;

  @Prop({ type: String, required: true, maxlength: 20 })
  part_number: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  material_name: string;

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

  @Prop({ type: String, maxlength: 100, default: null })
  storage_conditions?: string;

  @Prop({ type: String, maxlength: 50, default: null })
  specification_document?: string;

  // Traceability & workflow fields
  @Prop({ type: String, maxlength: 50, required: false })
  created_by?: string;

  @Prop({ type: String, maxlength: 50, required: false })
  approved_by?: string;

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
// Database Indexes
// ============================================
// Create indexes for fast queries and unique constraints

// Unique index on material_id (business key)
MaterialSchema.index({ material_id: 1 }, { unique: true });

// Unique index on part_number (business key)
MaterialSchema.index({ part_number: 1 }, { unique: true });

// Text index on material_name for text search
MaterialSchema.index({ material_name: 'text' });

// Index on material_type for filtering
MaterialSchema.index({ material_type: 1 });

// Index on created_date for sorting by newest first
MaterialSchema.index({ created_date: -1 });

// Compound index for common queries (type + created_date)
MaterialSchema.index({ material_type: 1, created_date: -1 });
