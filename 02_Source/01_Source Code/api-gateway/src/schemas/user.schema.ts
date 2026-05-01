import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaOptions } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

export enum UserRole {
  MANAGER = 'Manager',
  OPERATOR = 'Operator',
  QC_TECHNICIAN = 'Quality Control Technician',
  IT_ADMINISTRATOR = 'IT Administrator',
}

// Trường thời gian (timestamp) được đổi tên để khớp với tên trong mô hình miền
const options: SchemaOptions = {
  collection: 'users',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
};

/**
 * Người dùng hệ thống
 */
@Schema(options)
export class User {
  @Prop({ type: String, default: uuidv4 })
  user_id: string;

  /** ID của user bên Keycloak — dùng để tra cứu / đồng bộ */
  @Prop({ type: String })
  keycloak_id?: string;

  @Prop({ type: String, required: true, maxlength: 50 })
  username: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  email: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.OPERATOR,
  })
  role: UserRole;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: String, enum: ['locked', 'deactivated'], default: null })
  lock_type?: 'locked' | 'deactivated';

  @Prop({ type: String, default: null })
  lock_reason?: string;

  @Prop({ type: Date, default: null })
  last_login?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ user_id: 1 }, { unique: true });
UserSchema.index({ keycloak_id: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ is_active: 1 });
