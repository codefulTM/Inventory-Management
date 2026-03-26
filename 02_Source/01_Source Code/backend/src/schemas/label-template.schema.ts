import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Document,
  SchemaOptions,
  Types,
  Schema as MongooseSchema,
} from 'mongoose';

export type LabelTemplateDocument = LabelTemplate & Document;

// Timestamps đồng bộ với model
const options: SchemaOptions = {
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * Template nhãn in cho nhiều loại sản phẩm/lô hàng
 */
@Schema(options)
export class LabelTemplate {
  @Prop({ type: String, required: true, maxlength: 20 })
  template_id: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  template_name: string;

  @Prop({
    type: String,
    enum: [
      'Raw Material',
      'Sample',
      'Intermediate',
      'Finished Product',
      'API',
      'Status',
    ],
    required: true,
  })
  label_type: string;

  @Prop({ type: String, required: true })
  template_content: string;

  @Prop({ type: Number, required: true })
  width: number;

  @Prop({ type: Number, required: true })
  height: number;
}

export const LabelTemplateSchema = SchemaFactory.createForClass(LabelTemplate);

// Indexes for fast queries
LabelTemplateSchema.index({ template_id: 1 }, { unique: true });
LabelTemplateSchema.index({ label_type: 1 });
LabelTemplateSchema.index({ template_name: 'text' });
LabelTemplateSchema.index({ created_date: -1 });
