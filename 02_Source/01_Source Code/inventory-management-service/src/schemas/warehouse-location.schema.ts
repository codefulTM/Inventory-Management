import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type WarehouseLocationDocument = WarehouseLocation & Document;

const options: SchemaOptions = {
  collection: 'warehouse_locations',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

export enum LocationLevel {
  WAREHOUSE = 'warehouse',
  ZONE = 'zone',
  SHELF = 'shelf',
  BIN = 'bin',
}

@Schema(options)
export class WarehouseLocation {
  @Prop({ type: String, required: true, maxlength: 50 })
  location_code: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  location_name: string;

  @Prop({
    type: String,
    enum: Object.values(LocationLevel),
    required: true,
  })
  level: LocationLevel;

  @Prop({ type: String, maxlength: 50, required: false })
  parent_code?: string;

  @Prop({ type: String, required: false, maxlength: 500 })
  description?: string;

  @Prop({ type: Number, required: false })
  capacity?: number;

  @Prop({ type: Boolean, default: false })
  is_active: boolean;

  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  @Prop({ type: Date, default: Date.now })
  modified_date: Date;

  @Prop({ type: String, maxlength: 500, required: false })
  notes?: string;
}

export const WarehouseLocationSchema =
  SchemaFactory.createForClass(WarehouseLocation);

// Create indexes
WarehouseLocationSchema.index({ location_code: 1 }, { unique: true });
WarehouseLocationSchema.index({ level: 1 });
WarehouseLocationSchema.index({ parent_code: 1 });
WarehouseLocationSchema.index({ is_active: 1 });
