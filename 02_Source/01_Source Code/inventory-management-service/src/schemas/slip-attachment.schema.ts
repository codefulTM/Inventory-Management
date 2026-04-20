import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ _id: false })
export class SlipAttachment {
  @Prop({ default: uuidv4 })
  file_id: string;

  @Prop({ required: true })
  original_name: string;

  @Prop({ required: true })
  mime_type: string;

  @Prop({ required: true })
  size_bytes: number;

  @Prop({ required: true })
  url: string;

  @Prop({ default: 'local' })
  storage_source: string; // 's3'|'minio'|'local'|'gridfs'

  @Prop({ default: null })
  uploaded_by?: string;

  @Prop({ default: () => new Date() })
  uploaded_at?: Date;
}

export const SlipAttachmentSchema = SchemaFactory.createForClass(SlipAttachment);
