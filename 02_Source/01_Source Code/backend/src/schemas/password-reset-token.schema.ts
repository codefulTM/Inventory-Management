import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: false, collection: 'password_reset_tokens' })
export class PasswordResetToken {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  expires_at: Date;

  @Prop({ default: false })
  used: boolean;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
