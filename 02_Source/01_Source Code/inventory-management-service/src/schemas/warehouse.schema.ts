import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type WarehouseDocument = Warehouse & Document;

const options: SchemaOptions = {
  collection: 'warehouses',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class Warehouse {
  @Prop({ type: String, required: true, unique: true, maxlength: 50 })
  warehouse_id: string;

  @Prop({ type: String, required: true, maxlength: 120 })
  warehouse_name: string;

  @Prop({ type: String, required: false, maxlength: 255 })
  description?: string;

  @Prop({ type: Boolean, required: true, default: true })
  is_active: boolean;

  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  @Prop({ type: Date, default: Date.now })
  modified_date: Date;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

WarehouseSchema.index({ warehouse_id: 1 }, { unique: true });
WarehouseSchema.index({ is_active: 1 });
WarehouseSchema.index({ warehouse_name: 1 });
