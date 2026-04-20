import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { InventoryLotStatus } from '../inventory-lot/inventory-lot.dto';

export type InventoryLotDocument = InventoryLot & Document;

const options: SchemaOptions = {
  collection: 'inventory_lots',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryLot {
  @Prop({ type: String, required: true, maxlength: 36 })
  lot_id: string;

  @Prop({ type: String, required: true, maxlength: 20 })
  material_id: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  manufacturer_name: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  manufacturer_lot: string;

  @Prop({ type: String, maxlength: 100, required: false })
  supplier_name?: string;

  @Prop({ type: Date, required: false })
  manufacture_date?: Date;

  @Prop({ type: Date, required: true })
  received_date: Date;

  @Prop({ type: Date, required: true })
  expiration_date: Date;

  @Prop({ type: Date, required: false })
  in_use_expiration_date?: Date;

  @Prop({
    type: String,
    enum: Object.values(InventoryLotStatus),
    required: true,
  })
  status: InventoryLotStatus;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: true, maxlength: 10 })
  unit_of_measure: string;

  @Prop({ type: String, maxlength: 50, required: false })
  warehouse_id?: string;

  @Prop({ type: String, maxlength: 100, required: false, trim: true, uppercase: true })
  storage_location?: string;

  @Prop({ type: Boolean, default: false })
  is_sample: boolean;

  @Prop({ type: String, maxlength: 36, required: false })
  parent_lot_id?: string;

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  created_date: Date;

  @Prop({ type: Date, default: Date.now })
  modified_date: Date;

  // Traceability & workflow fields
  @Prop({ type: String, maxlength: 50, required: false })
  received_by?: string;

  @Prop({ type: String, maxlength: 50, required: false })
  qc_by?: string;

  @Prop({
    type: [Object],
    required: false,
    default: [],
    description: 'Lịch sử thay đổi trạng thái, traceability',
  })
  history?: Record<string, any>[];
}

export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);

// Create indexes for performance
InventoryLotSchema.index({ lot_id: 1 }, { unique: true });
InventoryLotSchema.index({ material_id: 1 });
InventoryLotSchema.index({ status: 1 });
InventoryLotSchema.index({ expiration_date: 1 });
InventoryLotSchema.index({ created_date: -1 });
InventoryLotSchema.index({ material_id: 1, status: 1 });
InventoryLotSchema.index({ is_sample: 1, parent_lot_id: 1 });

// Indexes to support bin worklist (using storage_location as bin_code)
InventoryLotSchema.index({ storage_location: 1 });
InventoryLotSchema.index({ storage_location: 1, modified_date: -1 });
