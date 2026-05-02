/**
 * File: user.repository.ts
 * Mô tả: Repository layer - tương tác trực tiếp với MongoDB qua Mongoose.
 *
 * Chức năng: Cung cấp các phương thức CRUD cho collection 'users'
 * - create: Tạo user mới
 * - findAll: Lấy danh sách user (phân trang)
 * - findById: Tìm theo user_id
 * - findByKeycloakId: Tìm theo keycloak_id
 * - findByUsername: Tìm theo username
 * - findByEmail: Tìm theo email
 * - findByRole: Lọc theo vai trò
 * - search: Tìm kiếm theo username hoặc email
 * - update: Cập nhật thông tin user
 * - updateLastLogin: Cập nhật thời điểm đăng nhập
 * - delete: Xóa user
 * - countByRole: Thống kê số lượng user theo từng role
 * - countActive: Đếm số user đang hoạt động
 *
 * Lưu ý: Repository chỉ chứa logic truy vấn DB, không chứa business logic
 */
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

  /**
   * Tạo user mới trong MongoDB
   * @param data - Partial User object (không bao gồm _id)
   */
  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  /**
   * Lấy tất cả user (có phân trang)
   * @param page - Trang hiện tại (bắt đầu từ 1)
   * @param limit - Số lượng user mỗi trang
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
        .sort({ created_date: -1 }) // Mới nhất lên đầu
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  /**
   * Tìm user theo user_id (UUID từ hệ thống)
   */
  async findById(user_id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ user_id }).exec();
  }

  /**
   * Tìm user theo keycloak_id
   * Đây là phương thức quan trọng để ánh xạ từ JWT token sang user local
   */
  async findByKeycloakId(keycloak_id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ keycloak_id }).exec();
  }

  /**
   * Tìm user theo username (case-sensitive theo MongoDB)
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  /**
   * Tìm user theo email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Lấy danh sách user theo role (có phân trang)
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
   * Tìm kiếm user theo username hoặc email (sử dụng regex)
   * @param query - Từ khóa tìm kiếm
   */
  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const regex = new RegExp(query, 'i'); // Case-insensitive
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
   * @param data - Dữ liệu cần cập nhật
   * @returns UserDocument mới hoặc null nếu không tìm thấy
   */
  async update(
    user_id: string,
    data: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate({ user_id }, { $set: data }, { new: true }) // new: true trả về document sau khi update
      .exec();
  }

  /**
   * Cập nhật thời điểm đăng nhập cuối (last_login)
   * Được gọi sau khi đăng nhập thành công
   */
  async updateLastLogin(user_id: string): Promise<void> {
    await this.userModel
      .findOneAndUpdate({ user_id }, { $set: { last_login: new Date() } })
      .exec();
  }

  /**
   * Xóa user khỏi MongoDB
   * @returns true nếu xóa thành công, false nếu không tìm thấy
   */
  async delete(user_id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ user_id }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Thống kê số lượng user theo từng role
   * @returns Object với key là role, value là số lượng
   * Ví dụ: { 'Manager': 5, 'Operator': 20, ... }
   */
  async countByRole(): Promise<Record<string, number>> {
    const agg = await this.userModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(agg.map((r) => [r._id, r.count]));
  }

  /**
   * Đếm tổng số user đang hoạt động (is_active = true)
   */
  async countActive(): Promise<number> {
    return this.userModel.countDocuments({ is_active: true }).exec();
  }
}
