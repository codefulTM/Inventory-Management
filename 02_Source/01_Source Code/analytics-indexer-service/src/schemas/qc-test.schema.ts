import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QCTestDocument = QCTest & Document;

/** Minimal read-only schema for analytics sync. Collection: qc_tests */
@Schema({
  collection: 'qc_tests',
  timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' },
})
export class QCTest {
  @Prop() test_id: string;
  @Prop() lot_id: string;
  @Prop() test_type: string;
  @Prop() test_date: Date;
  @Prop() result_status: string;
  @Prop() created_date: Date;
  @Prop() modified_date: Date;
  @Prop({ default: false }) deleted?: boolean;
  @Prop() is_active?: boolean;
}

export const QCTestSchema = SchemaFactory.createForClass(QCTest);
QCTestSchema.index({ modified_date: 1 });
