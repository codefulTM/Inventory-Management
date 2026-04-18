import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type InventoryValuationSummaryDocument = InventoryValuationSummary &
  Document;

const options: SchemaOptions = {
  collection: 'inventory_valuation_summaries',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryValuationSummary {
  @Prop({ type: String, required: true, unique: true, maxlength: 20 })
  material_id: string;

  @Prop({ type: Number, required: true, min: 0 })
  unit_cost_reference: number;

  @Prop({ type: Number, required: true })
  total_quantity: number;

  @Prop({ type: Number, required: true })
  total_value: number;

  @Prop({ type: String, required: false, maxlength: 36 })
  last_adjustment_id?: string;

  @Prop({ type: String, required: false, maxlength: 50 })
  last_updated_by?: string;
}

export const InventoryValuationSummarySchema = SchemaFactory.createForClass(
  InventoryValuationSummary,
);

InventoryValuationSummarySchema.index({ material_id: 1 }, { unique: true });
InventoryValuationSummarySchema.index({ modified_date: -1 });
