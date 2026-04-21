import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * Minimal read-only schema for analytics sync.
 * Collection: audit_logs
 * Captures real-time user activity events (login, CRUD operations, etc.)
 */
@Schema({
  collection: 'audit_logs',
  timestamps: false,
})
export class AuditLog {
  @Prop() username: string;
  @Prop() user_id: string;
  @Prop() action: string;
  @Prop() ip: string;
  @Prop({ type: Object }) details?: Record<string, any>;
  /** Primary date field for this collection */
  @Prop() timestamp: Date;
  /**
   * Alias used by BaseCollectionSync watermark queries.
   * We declare this so Mongoose reads it if present; the sync subclass
   * remaps `timestamp` → `modified_date` on every document before indexing.
   */
  @Prop() modified_date?: Date;
  @Prop() created_date?: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
// Index on timestamp for watermark-based incremental sync
AuditLogSchema.index({ timestamp: 1 });
AuditLogSchema.index({ modified_date: 1 });
