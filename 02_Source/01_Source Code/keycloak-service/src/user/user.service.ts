/**
 * File: user.service.ts
 * Mô tả: Service xử lý business logic liên quan đến quản lý user.
 *
 * Chức năng chính:
 * - Tạo user mới (bởi Manager/IT Admin hoặc tự đăng ký)
 * - Đọc thông tin user (tìm kiếm, lọc theo role, phân trang)
 * - Cập nhật thông tin user (đồng bộ với Keycloak)
 * - Khóa/Mở khóa tài khoản (đồng bộ với Keycloak)
 * - Đặt lại mật khẩu user
 * - Xóa user (xóa cả trong Keycloak và MongoDB)
 * - Thống kê số lượng user
 *
 * Luồng tạo user bởi Admin:
 * 1. Validate username/email không trùng (MongoDB)
 * 2. Tạo user trong Keycloak (nếu khả dụng)
 * 3. Lưu thông tin vào MongoDB
 * 4. Gửi email thông báo tài khoản (kèm mật khẩu tạm)
 * 5. Ghi audit log USER_CREATED
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { AuditLogService, LogContext } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.schema';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  LockUserDto,
  UserResponseDto,
  PaginatedUserResponseDto,
} from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly repository: UserRepository,
    private readonly keycloakService: KeycloakService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toResponse(user: UserDocument | User): UserResponseDto {
    return {
      user_id: user.user_id,
      keycloak_id: user.keycloak_id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      lock_type: (user as any).lock_type ?? undefined,
      lock_reason: (user as any).lock_reason ?? undefined,
      last_login: user.last_login,
      created_date: (user as any).created_date,
      modified_date: (user as any).modified_date,
    };
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Tạo user mới: đăng ký vào Keycloak + lưu vào MongoDB.
   * Dùng bởi Manager/IT Admin tạo user cho người khác.
   */
  async createUser(dto: CreateUserDto, actor?: string, ctx: LogContext = {}): Promise<UserResponseDto> {
    this.logger.debug(`[createUser] Called with actor='${actor}'`);
    
    // Validate unique
    const [byUsername, byEmail] = await Promise.all([
      this.repository.findByUsername(dto.username),
      this.repository.findByEmail(dto.email),
    ]);
    if (byUsername)
      throw new ConflictException(`Username '${dto.username}' đã tồn tại`);
    if (byEmail) throw new ConflictException(`Email '${dto.email}' đã tồn tại`);

    const role = dto.role ?? UserRole.OPERATOR;
    const tempPassword = this.mailService.generateTempPassword();

    // Tạo user trong Keycloak (bỏ qua nếu Keycloak không khả dụng)
    let keycloakId: string | undefined;
    try {
      keycloakId = await this.keycloakService.createUser({
        username: dto.username,
        email: dto.email,
        password: tempPassword,
        role,
      });
    } catch (err) {
      this.logger.warn(`Keycloak unavailable, creating user in MongoDB only: ${err.message}`);
    }

    // Lưu vào MongoDB (không lưu plain password)
    const user = await this.repository.create({
      username: dto.username,
      email: dto.email,
      role,
      keycloak_id: keycloakId,
      is_active: true,
    });

    this.logger.log(`User created: ${dto.username} | role: ${role} | kc: ${keycloakId}`);
    const auditActor = actor ?? 'system';
    this.logger.debug(`[createUser] About to log audit with actor='${auditActor}'`);
    await this.auditLogService.log(auditActor, AuditAction.USER_CREATED, ctx, { target: dto.username, role });

    // Gửi email thông báo tài khoản tạm thời
    await this.mailService.sendNewAccountEmail(dto.email, dto.username, role, tempPassword);
    return this.toResponse(user);
  }

  /**
   * Tạo user từ AuthService (register tự đăng ký) — không cần kiểm tra lại.
   */
  async create(data: Partial<User>): Promise<UserResponseDto> {
    const user = await this.repository.create(data);
    return this.toResponse(user);
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  async findAll(page = 1, limit = 20): Promise<PaginatedUserResponseDto> {
    if (page < 1) throw new BadRequestException('Page phải >= 1');
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Limit phải từ 1 đến 100');

    const { data, total } = await this.repository.findAll(page, limit);
    return {
      data: data.map((u) => this.toResponse(u)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(user_id: string): Promise<UserResponseDto> {
    const user = await this.repository.findById(user_id);
    if (!user) throw new NotFoundException(`User '${user_id}' không tồn tại`);
    return this.toResponse(user);
  }

  async findByKeycloakId(keycloak_id: string): Promise<UserResponseDto> {
    const user = await this.repository.findByKeycloakId(keycloak_id);
    if (!user) throw new NotFoundException('Không tìm thấy user');
    return this.toResponse(user);
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.repository.findByUsername(username);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.repository.findByEmail(email);
  }

  async findByRole(
    role: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedUserResponseDto> {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException(`Role không hợp lệ: ${role}`);
    }
    const { data, total } = await this.repository.findByRole(
      role as UserRole,
      page,
      limit,
    );
    return {
      data: data.map((u) => this.toResponse(u)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedUserResponseDto> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Từ khóa tìm kiếm tối thiểu 2 ký tự');
    }
    const { data, total } = await this.repository.search(
      query.trim(),
      page,
      limit,
    );
    return {
      data: data.map((u) => this.toResponse(u)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStatistics() {
    const [byRole, activeCount, all] = await Promise.all([
      this.repository.countByRole(),
      this.repository.countActive(),
      this.repository.findAll(1, 1),
    ]);
    return {
      total: all.total,
      active: activeCount,
      inactive: all.total - activeCount,
      byRole,
    };
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(user_id: string, dto: UpdateUserDto, actor?: string, ctx: LogContext = {}): Promise<UserResponseDto> {
    this.logger.debug(`[update] Called with actor='${actor}'`);
    
    const existing = await this.repository.findById(user_id);
    if (!existing)
      throw new NotFoundException(`User '${user_id}' không tồn tại`);

    // Kiểm tra username mới có trùng không
    if (dto.username && dto.username !== existing.username) {
      const byUsername = await this.repository.findByUsername(dto.username);
      if (byUsername)
        throw new ConflictException(`Username '${dto.username}' đã được sử dụng`);
    }

    // Kiểm tra email mới có trùng không
    if (dto.email && dto.email !== existing.email) {
      const byEmail = await this.repository.findByEmail(dto.email);
      if (byEmail)
        throw new ConflictException(`Email '${dto.email}' đã được sử dụng`);
    }

    // Đồng bộ cập nhật sang Keycloak nếu user có keycloak_id
    if (existing.keycloak_id) {
      await this.keycloakService.updateUser(existing.keycloak_id, {
        email: dto.email,
        role: dto.role,
      });
    }

    const updated = await this.repository.update(user_id, dto as Partial<User>);
    if (!updated)
      throw new NotFoundException(`User '${user_id}' không tồn tại`);

    this.logger.log(`User updated: ${user_id}`);
    const auditActor = actor ?? 'system';
    this.logger.debug(`[update] About to log audit with actor='${auditActor}'`);
    await this.auditLogService.log(auditActor, AuditAction.USER_UPDATED, ctx, { target: existing.username, changes: dto });
    return this.toResponse(updated);
  }

  /**
   * Khóa / Mở khóa tài khoản.
   * Đồng bộ trạng thái sang Keycloak để ngay lập tức vô hiệu hóa phiên.
   */
  async setActiveStatus(
    user_id: string,
    is_active: boolean,
    lockDto?: LockUserDto,
    actor?: string,
    ctx: LogContext = {},
  ): Promise<UserResponseDto> {
    this.logger.debug(`[setActiveStatus] Called with actor='${actor}', is_active=${is_active}`);
    
    const user = await this.repository.findById(user_id);
    if (!user) throw new NotFoundException(`User '${user_id}' không tồn tại`);

    // Đồng bộ sang Keycloak
    if (user.keycloak_id) {
      await this.keycloakService.setUserEnabled(user.keycloak_id, is_active);
    }

    const updateData: Partial<User> = { is_active };
    if (!is_active && lockDto) {
      updateData.lock_type = lockDto.lock_type;
      updateData.lock_reason = lockDto.lock_reason;
    } else if (is_active) {
      updateData.lock_type = undefined;
      updateData.lock_reason = undefined;
    }

    const updated = await this.repository.update(user_id, updateData);
    if (!updated)
      throw new NotFoundException(`User '${user_id}' không tồn tại`);

    const action = is_active ? 'activated' : `deactivated (${lockDto?.lock_type})`;
    this.logger.log(`User ${action}: ${user.username} (${user_id})`);
    const auditAction = is_active ? AuditAction.USER_UNLOCKED : AuditAction.USER_LOCKED;
    const auditActor = actor ?? 'system';
    this.logger.debug(`[setActiveStatus] About to log audit with actor='${auditActor}'`);
    await this.auditLogService.log(auditActor, auditAction, ctx, {
      target: user.username,
      lock_type: lockDto?.lock_type,
      lock_reason: lockDto?.lock_reason,
    });
    return this.toResponse(updated);
  }

  /**
   * Đặt lại mật khẩu — chỉ thực hiện trong Keycloak.
   */
  async changePassword(
    user_id: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.repository.findById(user_id);
    if (!user) throw new NotFoundException(`User '${user_id}' không tồn tại`);

    if (!user.keycloak_id) {
      throw new BadRequestException('User chưa được liên kết với Keycloak');
    }

    await this.keycloakService.resetPassword(
      user.keycloak_id,
      dto.new_password,
    );
    this.logger.log(`Password reset for user: ${user.username}`);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async updateLastLogin(user_id: string): Promise<void> {
    await this.repository.updateLastLogin(user_id);
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /**
   * Xóa user: xóa khỏi Keycloak trước, rồi xóa khỏi MongoDB.
   */
  async delete(
    user_id: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.repository.findById(user_id);
    if (!user) throw new NotFoundException(`User '${user_id}' không tồn tại`);

    // Xóa khỏi Keycloak nếu có
    if (user.keycloak_id) {
      await this.keycloakService.deleteUser(user.keycloak_id);
    }

    await this.repository.delete(user_id);
    this.logger.log(`User deleted: ${user.username} (${user_id})`);
    return { success: true, message: `User '${user.username}' đã được xóa` };
  }
}
