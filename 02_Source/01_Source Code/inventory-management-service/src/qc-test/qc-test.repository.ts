import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QCTest, QCTestDocument } from '../schemas/qc-test.schema';

@Injectable()
export class QCTestRepository {
  constructor(
    @InjectModel(QCTest.name)
    private readonly qcTestModel: Model<QCTestDocument>,
  ) {}

  async findAll(filter?: {
    result_status?: string;
    test_type?: string;
    performed_by?: string;
  }): Promise<QCTestDocument[]> {
    const query: Record<string, any> = {};
    if (filter?.result_status) query.result_status = filter.result_status;
    if (filter?.test_type) query.test_type = filter.test_type;
    if (filter?.performed_by) query.performed_by = filter.performed_by;
    return this.qcTestModel.find(query).sort({ test_date: -1 }).exec();
  }

  async findByLotId(lot_id: string): Promise<QCTestDocument[]> {
    return this.qcTestModel.find({ lot_id }).sort({ test_date: -1 }).exec();
  }

  async findByTestId(test_id: string): Promise<QCTestDocument | null> {
    return this.qcTestModel.findOne({ test_id }).exec();
  }

  async create(data: Partial<QCTest>): Promise<QCTestDocument> {
    const test = new this.qcTestModel(data);
    return test.save();
  }

  async updateByTestId(
    test_id: string,
    data: Partial<QCTest>,
  ): Promise<QCTestDocument | null> {
    return this.qcTestModel
      .findOneAndUpdate({ test_id }, { $set: data }, { new: true })
      .exec();
  }

  async updateManyByLotId(
    lot_id: string,
    filter: { result_status?: string },
    data: Partial<QCTest>,
  ): Promise<QCTestDocument[]> {
    const query: Record<string, any> = { lot_id };
    if (filter.result_status) query.result_status = filter.result_status;
    await this.qcTestModel.updateMany(query, { $set: data }).exec();
    return this.qcTestModel.find({ lot_id }).exec();
  }

  async deleteByTestId(test_id: string): Promise<boolean> {
    const result = await this.qcTestModel.deleteOne({ test_id }).exec();
    return result.deletedCount > 0;
  }

  async countByResultStatus(
    result_status: string,
    from?: Date,
    to?: Date,
  ): Promise<number> {
    const query: Record<string, any> = { result_status };
    if (from || to) {
      query.test_date = {};
      if (from) query.test_date.$gte = from;
      if (to) query.test_date.$lte = to;
    }
    return this.qcTestModel.countDocuments(query).exec();
  }

  async findInDateRange(from?: Date, to?: Date): Promise<QCTestDocument[]> {
    const query: Record<string, any> = {};
    if (from || to) {
      query.test_date = {};
      if (from) query.test_date.$gte = from;
      if (to) query.test_date.$lte = to;
    }
    return this.qcTestModel.find(query).exec();
  }
}
