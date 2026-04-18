import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema({ collection: 'counters' })
export class Counter {
  @Prop({ type: String, required: true, unique: true, maxlength: 100 })
  name: string;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
CounterSchema.index({ name: 1 }, { unique: true });
