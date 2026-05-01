import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type InventoryAuditReportDocument = InventoryAuditReport & Document;

export enum InventoryAuditReportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

const options: SchemaOptions = {
  collection: 'inventory_audit_reports',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema(options)
export class InventoryAuditReport {
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  report_id: string;

  @Prop({ type: Date, required: true })
  period_from: Date;

  @Prop({ type: Date, required: true })
  period_to: Date;

  @Prop({ type: [String], default: [] })
  scope_warehouse_ids: string[];

  @Prop({
    type: String,
    required: true,
    maxlength: 50,
    default: 'STATUTORY_V1',
  })
  report_template_code: string;

  @Prop({
    type: String,
    enum: Object.values(InventoryAuditReportStatus),
    required: true,
  })
  status: InventoryAuditReportStatus;

  @Prop({ type: Number, default: 0 })
  summary_total_items: number;

  @Prop({ type: Number, default: 0 })
  summary_total_quantity: number;

  @Prop({ type: Number, default: 0 })
  summary_total_value: number;

  @Prop({ type: String, maxlength: 300, required: false })
  file_storage_key?: string;

  @Prop({ type: String, maxlength: 128, required: false })
  file_sha256?: string;

  @Prop({ type: Number, required: false })
  file_size_bytes?: number;

  @Prop({ type: String, maxlength: 20, required: false })
  pdf_version?: string;

  @Prop({ type: Date, required: false })
  signed_at?: Date;

  @Prop({ type: String, maxlength: 50, required: false })
  signature_provider?: string;

  @Prop({ type: String, maxlength: 128, required: false })
  signature_serial_number?: string;

  @Prop({ type: Date, required: false })
  signature_valid_from?: Date;

  @Prop({ type: Date, required: false })
  signature_valid_to?: Date;

  @Prop({ type: String, required: true, maxlength: 50 })
  requested_by: string;

  @Prop({ type: String, required: false, maxlength: 50 })
  approved_by?: string;

  @Prop({ type: String, required: false, maxlength: 500 })
  note?: string;

  @Prop({ type: String, required: false, maxlength: 500 })
  failure_reason?: string;
}

export const InventoryAuditReportSchema =
  SchemaFactory.createForClass(InventoryAuditReport);

InventoryAuditReportSchema.index({ report_id: 1 }, { unique: true });
InventoryAuditReportSchema.index({ status: 1, created_date: -1 });
InventoryAuditReportSchema.index({ requested_by: 1, created_date: -1 });
InventoryAuditReportSchema.index({ period_from: 1, period_to: 1 });
