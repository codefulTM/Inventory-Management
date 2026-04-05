import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';

export type ImportExportOrderDocument = ImportExportOrder & Document;

export enum ImportExportOrderType {
  INBOUND = 'Inbound',
  OUTBOUND = 'Outbound',
}

export enum ImportExportOrderStatus {
  PENDING_CONFIRMATION = 'PendingConfirmation',
  CONFIRMED = 'Confirmed',
  REJECTED = 'Rejected',
}

export enum ImportExportAttachmentSource {
  CAMERA = 'camera',
  UPLOAD = 'upload',
}

const options: SchemaOptions = {
  collection: 'import_export_orders',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

@Schema({ _id: false })
export class ImportExportOrderItem {
  @Prop({ type: String, required: true, maxlength: 36 })
  material_id: string;

  @Prop({ type: String, required: false, maxlength: 36 })
  lot_id?: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: String, required: true, maxlength: 20 })
  unit_of_measure: string;

  @Prop({ type: String, required: false, maxlength: 50 })
  expected_location?: string;
}

@Schema({ _id: false })
export class ImportExportOrderAttachment {
  @Prop({ type: String, required: true, maxlength: 36 })
  file_id: string;

  @Prop({ type: String, required: true, maxlength: 255 })
  original_name: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  mime_type: string;

  @Prop({ type: Number, required: true, min: 1 })
  size_bytes: number;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({
    type: String,
    enum: Object.values(ImportExportAttachmentSource),
    required: true,
  })
  source: ImportExportAttachmentSource;

  @Prop({ type: String, required: true, maxlength: 100 })
  uploaded_by: string;

  @Prop({ type: Date, required: true })
  uploaded_at: Date;
}

const ImportExportOrderItemSchema = SchemaFactory.createForClass(
  ImportExportOrderItem,
);
const ImportExportOrderAttachmentSchema = SchemaFactory.createForClass(
  ImportExportOrderAttachment,
);

@Schema({ _id: false })
export class ConfirmedImportExportOrderItem {
  @Prop({ type: String, required: true, maxlength: 36 })
  material_id: string;

  @Prop({ type: String, required: false, maxlength: 36 })
  lot_id?: string;

  @Prop({ type: Number, required: true, min: 0 })
  expected_quantity: number;

  @Prop({ type: Number, required: true, min: 1 })
  actual_quantity: number;

  @Prop({ type: Number, required: true })
  variance_quantity: number;

  @Prop({ type: String, required: true, maxlength: 20 })
  unit_of_measure: string;
}

const ConfirmedImportExportOrderItemSchema = SchemaFactory.createForClass(
  ConfirmedImportExportOrderItem,
);

@Schema(options)
export class ImportExportOrder {
  @Prop({ type: String, required: true, unique: true, maxlength: 36 })
  order_id: string;

  @Prop({
    type: String,
    enum: Object.values(ImportExportOrderType),
    required: true,
  })
  order_type: ImportExportOrderType;

  @Prop({
    type: String,
    enum: Object.values(ImportExportOrderStatus),
    default: ImportExportOrderStatus.PENDING_CONFIRMATION,
    required: true,
  })
  status: ImportExportOrderStatus;

  @Prop({ type: String, required: true, maxlength: 50 })
  warehouse_id: string;

  @Prop({ type: String, required: false, maxlength: 255 })
  reason?: string;

  @Prop({ type: String, required: false, maxlength: 100 })
  reference_number?: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  created_by: string;

  @Prop({ type: [ImportExportOrderItemSchema], required: true, default: [] })
  items: ImportExportOrderItem[];

  @Prop({
    type: [ImportExportOrderAttachmentSchema],
    required: true,
    default: [],
  })
  attachments: ImportExportOrderAttachment[];

  @Prop({ type: String, required: false, maxlength: 100 })
  confirmed_by?: string;

  @Prop({ type: Date, required: false })
  confirmed_at?: Date;

  @Prop({ type: String, required: false, maxlength: 255 })
  confirm_note?: string;

  @Prop({ type: Boolean, required: true, default: true })
  blind_count_required: boolean;

  @Prop({
    type: [ConfirmedImportExportOrderItemSchema],
    required: true,
    default: [],
  })
  confirmed_items: ConfirmedImportExportOrderItem[];
}

export const ImportExportOrderSchema =
  SchemaFactory.createForClass(ImportExportOrder);

ImportExportOrderSchema.index({ order_id: 1 }, { unique: true });
ImportExportOrderSchema.index({ status: 1, created_date: -1 });
ImportExportOrderSchema.index({ created_by: 1, created_date: -1 });
ImportExportOrderSchema.index({ order_type: 1, status: 1 });
ImportExportOrderSchema.index({ created_by: 1, status: 1, created_date: -1 });
ImportExportOrderSchema.index({ status: 1, modified_date: -1 });
