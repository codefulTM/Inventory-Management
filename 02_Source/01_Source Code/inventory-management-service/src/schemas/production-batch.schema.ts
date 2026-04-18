import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type ProductionBatchDocument = ProductionBatch & Document;

const options: SchemaOptions = {
  collection: 'production_batches',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class ProductionBatch {
  @Prop({ type: String, required: true, unique: true, maxlength: 50 })
  batch_id: string;

  @Prop({ type: String, required: true, maxlength: 20 })
  product_id: string;

  @Prop({ type: String, required: true, unique: true, maxlength: 50 })
  batch_number: string;

  @Prop({ type: String, required: true, maxlength: 10 })
  unit_of_measure: string;

  @Prop({ type: Number, required: true, min: 1 })
  shelf_life_value: number;

  @Prop({ type: String, required: true })
  shelf_life_unit: string;

  @Prop({
    type: String,
    enum: ['In Progress', 'Complete', 'On Hold', 'Cancelled'],
    required: true,
  })
  status: string;

  @Prop({ type: Number, required: true })
  batch_size: number;

  // Traceability & audit
  @Prop({ type: String, maxlength: 50, required: false })
  created_by?: string;

  @Prop({ type: String, maxlength: 50, required: false })
  approved_by?: string;

  @Prop({ type: String, maxlength: 50, required: false })
  completed_by?: string;
}

export const ProductionBatchSchema =
  SchemaFactory.createForClass(ProductionBatch);
