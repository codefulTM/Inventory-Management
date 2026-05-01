import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

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

  @Prop({ type: String, required: false, maxlength: 36 })
  adjustment_id?: string;

  @Prop({ type: String, required: false, maxlength: 50 })
  adjustment_reason_code?: string;
}

export const InventoryTransactionSchema =
  SchemaFactory.createForClass(InventoryTransaction);

// thêm chỉ mục một cách rõ ràng vì SchemaOptions không có trường này
InventoryTransactionSchema.index({ lot_id: 1, transaction_date: -1 });
InventoryTransactionSchema.index({ transaction_date: -1 });
InventoryTransactionSchema.index({ transaction_type: 1 });
InventoryTransactionSchema.index({ performed_by: 1, transaction_date: -1 });
InventoryTransactionSchema.index({ performed_by: 1, reference_number: 1 });
InventoryTransactionSchema.index({ performed_by: 1, lot_id: 1 });
InventoryTransactionSchema.index({ adjustment_id: 1 });
