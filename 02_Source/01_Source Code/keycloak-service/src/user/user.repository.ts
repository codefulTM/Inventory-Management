import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ created_date: -1 })
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(user_id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ user_id }).exec();
  }

  async findByKeycloakId(keycloak_id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ keycloak_id }).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByRole(
    role: UserRole,
    page = 1,
    limit = 20,
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel
        .find({ role })
        .skip(skip)
        .limit(limit)
        .sort({ created_date: -1 })
        .exec(),
      this.userModel.countDocuments({ role }).exec(),
    ]);
    return { data, total };
  }

  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const regex = new RegExp(query, 'i');
    const filter = { $or: [{ username: regex }, { email: regex }] };
    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ created_date: -1 })
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async update(
    user_id: string,
    data: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate({ user_id }, { $set: data }, { new: true })
      .exec();
  }

  async updateLastLogin(user_id: string): Promise<void> {
    await this.userModel
      .findOneAndUpdate({ user_id }, { $set: { last_login: new Date() } })
      .exec();
  }

  async delete(user_id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ user_id }).exec();
    return result.deletedCount > 0;
  }

  async countByRole(): Promise<Record<string, number>> {
    const agg = await this.userModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(agg.map((r) => [r._id, r.count]));
  }

  async countActive(): Promise<number> {
    return this.userModel.countDocuments({ is_active: true }).exec();
  }
}
