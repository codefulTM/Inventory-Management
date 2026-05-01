import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type StorageLocationDocument = StorageLocation & Document;

const options: SchemaOptions = {
  collection: 'storage_locations',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class StorageLocation {
  @Prop({ type: String, required: true, unique: true, maxlength: 50 })
  location_id: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  warehouse_id: string;

  @Prop({ type: String, required: true, maxlength: 120 })
  location_name: string;

  @Prop({ type: String, required: false, maxlength: 50 })
  zone?: string;

  @Prop({ type: Number, required: false })
  expected_qty?: number;

  @Prop({ type: Boolean, required: true, default: true })
  is_active: boolean;

  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  @Prop({ type: Date, default: Date.now })
  modified_date: Date;
}

export const StorageLocationSchema =
  SchemaFactory.createForClass(StorageLocation);

StorageLocationSchema.index({ location_id: 1 }, { unique: true });
StorageLocationSchema.index({ warehouse_id: 1, is_active: 1 });
