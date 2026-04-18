import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryTransactionDocument = InventoryTransaction & Document;

/** Minimal read-only schema for analytics sync. Collection: inventory_transactions */
@Schema({
  collection: 'inventory_transactions',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class InventoryTransaction {
  @Prop() transaction_id: string;
  @Prop() lot_id: string;
  @Prop() transaction_type: string;
  @Prop() quantity: number;
  @Prop() unit_of_measure: string;
  @Prop() transaction_date: Date;
  @Prop() performed_by: string;
  @Prop() created_date: Date;
  @Prop() modified_date: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);
InventoryTransactionSchema.index({ modified_date: 1 });
