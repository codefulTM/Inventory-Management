import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryLotDocument = InventoryLot & Document;

/** Minimal read-only schema for analytics sync. Collection: inventory_lots */
@Schema({
  collection: 'inventory_lots',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class InventoryLot {
  @Prop() lot_id: string;
  @Prop() material_id: string;
  @Prop() supplier_name: string;
  @Prop() manufacturer_name: string;
  @Prop() status: string;
  @Prop() quantity: number;
  @Prop() unit_of_measure: string;
  @Prop() created_date: Date;
  @Prop() modified_date: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);
InventoryLotSchema.index({ modified_date: 1 });
