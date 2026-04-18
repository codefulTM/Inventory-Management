import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions, Schema as MongooseSchema } from 'mongoose';

export type BatchComponentDocument = BatchComponent & Document;

const options: SchemaOptions = {
  collection: 'batch_components',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class BatchComponent {
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  component_id: string;

  @Prop({ type: String, required: true, maxlength: 36 })
  batch_id: string;

  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string;

  @Prop({ type: Number, required: true })
  planned_quantity: number;

  @Prop({ type: Number, required: false })
  actual_quantity?: number;

  @Prop({ type: String, required: true, maxlength: 10 })
  unit_of_measure: string;

  @Prop({ type: Date, required: false })
  addition_date?: Date;

  @Prop({ type: String, maxlength: 50, required: false })
  added_by?: string;
}

export const BatchComponentSchema =
  SchemaFactory.createForClass(BatchComponent);
