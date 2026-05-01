import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BinCountRecordDocument = BinCountRecord & Document;

@Schema({ collection: 'bin_count_records', timestamps: true })
export class BinCountRecord {
  @Prop({ type: String, required: true, maxlength: 100 })
  bin_code: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  counted_by: string;

  @Prop({ type: Date, default: () => new Date() })
  counted_at: Date;

  @Prop({
    type: [
      {
        lot_id: { type: String },
        material_id: { type: String },
        expected_qty: { type: Number },
        counted_qty: { type: Number },
        unit_of_measure: { type: String },
        notes: { type: String },
      },
    ],
    default: [],
  })
  entries: Record<string, any>[];

  @Prop({ type: Boolean, default: false })
  flag_review: boolean;

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: [Object], default: [] })
  attachments?: Record<string, any>[];
}

export const BinCountRecordSchema =
  SchemaFactory.createForClass(BinCountRecord);

// Indexes to support queries
BinCountRecordSchema.index({ bin_code: 1 });
BinCountRecordSchema.index({ counted_at: -1 });
BinCountRecordSchema.index({ flag_review: 1 });
