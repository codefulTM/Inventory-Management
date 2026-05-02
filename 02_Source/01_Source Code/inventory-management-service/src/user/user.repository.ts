/**
 * UserRepository - Lớp truy cập dữ liệu user (Data Access Layer)
 *
 * Đóng gói tất cả thao tác CRUD với MongoDB collection 'users'.
 * Sử dụng Mongoose Model để thực hiện query.
 *
 * Các phương thức chính:
 * - create(): Tạo user mới
 * - findAll(): Lấy danh sách user phân trang
 * - findById(), findByKeycloakId(), findByUsername(), findByEmail(): Tìm theo các tiêu chí
 * - findByRole(): Lọc user theo role
 * - search(): Tìm kiếm theo username hoặc email (regex)
 * - update(): Cập nhật thông tin user
 * - delete(): Xóa user
 * - countByRole(): Thống kê số user theo role
 * - countActive(): Đếm số user đang hoạt động
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

/**
 * UserRepository - Data Access Layer cho User
 * Encapsulates tất cả thao tác đọc/ghi với MongoDB collection users
 */
@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /** Tạo user mới trong MongoDB */
  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  /**
   * Lấy danh sách user với phân trang
   * Sắp xếp theo created_date giảm dần (mới nhất trước)
   */
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

  /** Tìm user theo user_id (ID nội bộ của hệ thống) */
  async findById(user_id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ user_id }).exec();
  }

  /** Tìm user theo Keycloak ID (ID từ Identity Provider) */
  async findByKeycloakId(keycloak_id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ keycloak_id }).exec();
  }

  /** Tìm user theo username */
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  /** Tìm user theo email */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Lọc user theo role với phân trang
   * Sắp xếp theo created_date giảm dần
   */
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

  /**
   * Tìm kiếm user theo username hoặc email (case-insensitive)
   * Sử dụng regex để tìm kiếm partial match
   */
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

  /**
   * Cập nhật thông tin user
   * @param user_id - ID của user cần cập nhật
   * @param data - Các trường cần cập nhật
   * @returns User sau khi cập nhật (null nếu không tìm thấy)
   */
  async update(
    user_id: string,
    data: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate({ user_id }, { $set: data }, { new: true })
      .exec();
  }

  /** Cập nhật thời điểm đăng nhập cuối cùng của user */
  async updateLastLogin(user_id: string): Promise<void> {
    await this.userModel
      .findOneAndUpdate({ user_id }, { $set: { last_login: new Date() } })
      .exec();
  }

  /** Xóa user theo user_id, trả về true nếu xóa thành công */
  async delete(user_id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ user_id }).exec();
    return result.deletedCount > 0;
  }

  /** Thống kê số lượng user theo từng role (dùng MongoDB aggregation) */
  async countByRole(): Promise<Record<string, number>> {
    const agg = await this.userModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(agg.map((r) => [r._id, r.count]));
  }

  /** Đếm số user đang hoạt động (is_active = true) */
  async countActive(): Promise<number> {
    return this.userModel.countDocuments({ is_active: true }).exec();
  }
}
