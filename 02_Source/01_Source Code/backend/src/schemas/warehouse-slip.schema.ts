import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { SlipAttachmentSchema, SlipAttachment } from './slip-attachment.schema';
import {
  WarehouseSlipLineSchema,
  WarehouseSlipLine,
} from './warehouse-slip-line.schema';

export type WarehouseSlipDocument = WarehouseSlip & Document;

// Align timestamps naming with existing schemas (created_date / modified_date)
const options: SchemaOptions = {
  collection: 'warehouse_slips',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

// SlipAttachment and WarehouseSlipLine moved to separate files

@Schema(options)
export class WarehouseSlip {
  @Prop({ default: uuidv4 })
  slip_id: string;

  @Prop({ unique: true, required: true })
  slip_number: string;

  @Prop({ required: true, enum: ['IN', 'OUT'] })
  type: 'IN' | 'OUT';

  @Prop({ required: true })
  warehouse_id: string;

  @Prop({ enum: ['PENDING', 'CONFIRMED', 'REJECTED'], default: 'PENDING' })
  status: string;

  @Prop()
  confirmed_by?: string;

  @Prop({ type: Date })
  confirmed_at?: Date;

  @Prop()
  rejected_by?: string;

  @Prop({ type: Date })
  rejected_at?: Date;

  @Prop()
  reject_reason?: string;

  @Prop({ default: false })
  locked?: boolean;

  @Prop({ type: [String], default: [] })
  processed_transactions?: string[];

  @Prop()
  reference_number?: string;

  @Prop({ default: 0 })
  total_quantity?: number;

  @Prop({ default: 0 })
  total_value?: number;

  @Prop()
  created_by?: string;

  @Prop()
  notes?: string;

  @Prop({ type: [WarehouseSlipLineSchema], default: [] })
  lines: WarehouseSlipLine[];

  @Prop({ type: [SlipAttachmentSchema], default: [] })
  attachments: SlipAttachment[];
}

export const WarehouseSlipSchema = SchemaFactory.createForClass(WarehouseSlip);

// Indexes
WarehouseSlipSchema.index({ slip_number: 1 }, { unique: true });
WarehouseSlipSchema.index({ warehouse_id: 1, status: 1 });
WarehouseSlipSchema.index({ slip_id: 1 }, { unique: true });
