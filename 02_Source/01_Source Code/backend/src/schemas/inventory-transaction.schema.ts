import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Document,
  SchemaOptions,
  Types,
  Schema as MongooseSchema,
} from 'mongoose';

export type InventoryTransactionDocument = InventoryTransaction & Document;

const options: SchemaOptions = {
  collection: 'inventory_transactions',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryTransaction {
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  transaction_id: string;

  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string;

  // Traceability: liên kết lô liên quan (chuyển lô, split, transfer...)
  @Prop({ type: String, maxlength: 36, required: false })
  related_lot_id?: string;

  @Prop({
    type: String,
    enum: ['Receipt', 'Usage', 'Split', 'Adjustment', 'Transfer', 'Disposal'],
    required: true,
  })
  transaction_type: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: true, maxlength: 10 })
  unit_of_measure: string;

  @Prop({ type: Date, required: true })
  transaction_date: Date;

  @Prop({ type: String, maxlength: 50, required: false })
  reference_number?: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  performed_by: string;

  @Prop({ type: String, required: false })
  notes?: string;
}

export const InventoryTransactionSchema =
  SchemaFactory.createForClass(InventoryTransaction);
