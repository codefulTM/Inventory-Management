import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BinCountRecord,
  BinCountRecordDocument,
} from '../schemas/bin-count-record.schema';

@Injectable()
export class BinCountRecordRepository {
  constructor(
    @InjectModel(BinCountRecord.name)
    private binCountModel: Model<BinCountRecordDocument>,
  ) {}

  async create(data: Partial<BinCountRecordDocument>) {
    const rec = new this.binCountModel(data);
    return rec.save();
  }

  async findById(id: string) {
    return this.binCountModel.findById(id).exec();
  }

  async findByBin(bin_code: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const query = { bin_code };
    const data = await this.binCountModel
      .find(query)
      .sort({ counted_at: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.binCountModel.countDocuments(query).exec();
    return { data, total };
  }
}
