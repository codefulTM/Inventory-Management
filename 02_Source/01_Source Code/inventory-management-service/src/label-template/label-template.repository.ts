import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LabelTemplate,
  LabelTemplateDocument,
} from '../schemas/label-template.schema';
import {
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  LabelType,
} from './label-template.dto';

/**
 * LabelTemplate Repository
 * Handles all MongoDB operations for the LabelTemplates collection
 */
@Injectable()
export class LabelTemplateRepository {
  private readonly logger = new Logger(LabelTemplateRepository.name);

  constructor(
    @InjectModel(LabelTemplate.name)
    private readonly labelTemplateModel: Model<LabelTemplateDocument>,
  ) {}

  async create(dto: CreateLabelTemplateDto): Promise<LabelTemplateDocument> {
    this.logger.debug(`Creating label template: ${dto.template_id}`);
    const doc = new this.labelTemplateModel(dto);
    return doc.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: LabelTemplateDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.labelTemplateModel
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ created_date: -1 })
        .exec(),
      this.labelTemplateModel.countDocuments(),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<LabelTemplateDocument | null> {
    return this.labelTemplateModel.findById(id).exec();
  }

  async findByTemplateId(
    templateId: string,
  ): Promise<LabelTemplateDocument | null> {
    return this.labelTemplateModel.findOne({ template_id: templateId }).exec();
  }

  async findByLabelType(
    labelType: LabelType,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: LabelTemplateDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.labelTemplateModel
        .find({ label_type: labelType })
        .skip(skip)
        .limit(limit)
        .sort({ created_date: -1 })
        .exec(),
      this.labelTemplateModel.countDocuments({ label_type: labelType }),
    ]);
    return { data, total, page, limit };
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: LabelTemplateDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const filter = {
      $or: [
        { template_id: { $regex: query, $options: 'i' } },
        { template_name: { $regex: query, $options: 'i' } },
      ],
    };
    const [data, total] = await Promise.all([
      this.labelTemplateModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ created_date: -1 })
        .exec(),
      this.labelTemplateModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async update(
    id: string,
    dto: UpdateLabelTemplateDto,
  ): Promise<LabelTemplateDocument | null> {
    return this.labelTemplateModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<LabelTemplateDocument | null> {
    return this.labelTemplateModel.findByIdAndDelete(id).exec();
  }
}
