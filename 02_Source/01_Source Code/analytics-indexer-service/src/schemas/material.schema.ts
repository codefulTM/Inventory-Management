import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MaterialDocument = Material & Document;

/** Minimal read-only schema for analytics sync. Collection: materials */
@Schema({
  collection: 'materials',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class Material {
  @Prop() material_id: string;
  @Prop() part_number: string;
  @Prop() material_name: string;
  @Prop() material_type: string;
  @Prop() created_date: Date;
  @Prop() modified_date: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
MaterialSchema.index({ modified_date: 1 });
