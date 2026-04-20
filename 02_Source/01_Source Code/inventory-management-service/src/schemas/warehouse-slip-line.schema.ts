import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ _id: false })
export class WarehouseSlipLine {
  @Prop({ default: uuidv4 })
  line_id: string;

  @Prop({ required: true })
  material_id: string;

  @Prop()
  sku?: string;

  @Prop()
  lot_id?: string;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  unit?: string;

  @Prop()
  unit_price?: number;

  @Prop()
  expiry_date?: Date;

  @Prop()
  notes?: string;
}

export const WarehouseSlipLineSchema = SchemaFactory.createForClass(WarehouseSlipLine);
