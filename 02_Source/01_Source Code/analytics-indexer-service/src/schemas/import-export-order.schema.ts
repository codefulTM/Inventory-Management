import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImportExportOrderDocument = ImportExportOrder & Document;

/** Minimal read-only schema for analytics sync. Collection: import_export_orders */
@Schema({
  collection: 'import_export_orders',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class ImportExportOrder {
  @Prop() order_id: string;
  @Prop() order_type: string;
  @Prop() status: string;
  @Prop() created_by: string;
  @Prop() created_date: Date;
  @Prop() modified_date: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const ImportExportOrderSchema = SchemaFactory.createForClass(ImportExportOrder);
ImportExportOrderSchema.index({ modified_date: 1 });
