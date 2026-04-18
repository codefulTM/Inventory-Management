import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
  LOGOUT_FAILED = 'LOGOUT_FAILED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_LOCKED = 'USER_LOCKED',
  USER_UNLOCKED = 'USER_UNLOCKED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  INVENTORY_LOT_UPDATED = 'INVENTORY_LOT_UPDATED',
}

@Schema({ collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true })
  username: string;

  @Prop()
  user_id?: string;

  @Prop({ required: true, enum: Object.values(AuditAction) })
  action: AuditAction;

  @Prop()
  ip?: string;

  @Prop()
  user_agent?: string;

  @Prop({ type: Object })
  details?: Record<string, any>;

  @Prop({ type: Date, default: () => new Date() })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ username: 1 });
AuditLogSchema.index({ action: 1 });
