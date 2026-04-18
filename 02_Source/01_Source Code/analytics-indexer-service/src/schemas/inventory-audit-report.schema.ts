import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryAuditReportDocument = InventoryAuditReport & Document;

/** Minimal read-only schema for analytics sync. Collection: inventory_audit_reports */
@Schema({
  collection: 'inventory_audit_reports',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class InventoryAuditReport {
  @Prop() report_id: string;
  @Prop() status: string;
  @Prop() period_from: Date;
  @Prop() period_to: Date;
  @Prop() created_date: Date;
  @Prop() modified_date: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const InventoryAuditReportSchema = SchemaFactory.createForClass(InventoryAuditReport);
InventoryAuditReportSchema.index({ modified_date: 1 });
