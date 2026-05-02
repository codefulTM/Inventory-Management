/**
 * File: auth-user.integration.spec.ts
 * Mô tả: Integration tests cho UserService + UserRepository trong keycloak-service.
 *
 * Kiểm tra lớp quản lý user với MongoDB thật (in-memory MongoMemoryServer):
 * - Ràng buộc schema (unique username, unique email)
 * - Repository queries (findAll, findById, search, phân trang)
 * - Business rules của service (tạo user, cập nhật, khóa/mở khóa, xóa, thống kê)
 *
 * AuthService được mock (bỏ qua Keycloak) để tập trung vào lớp user management.
 * KeycloakService cũng được mock — trả về keycloak_id giả lập.
 *
 * Setup:
 * - MongoMemoryServer: MongoDB in-memory cho test isolation
 * - Mock KeycloakService: createUser trả về 'kc-uuid-N' tăng dần
 * - Mock MailService: generateTempPassword trả về 'Temp@12345' cố định
 * - Mock AuditLogService: log không làm gì cả
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { User, UserSchema, UserRole } from '../schemas/user.schema';
import { KeycloakService } from '../keycloak/keycloak.service';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLog, AuditLogSchema } from '../audit-log/audit-log.schema';

let mongod: MongoMemoryServer;
let testModule: TestingModule;
let userService: UserService;
let userModel: Model<User>;

// Bộ đếm giả lập Keycloak user ID
let kcCounter = 0;
const mockKeycloakService = {
  createUser: jest.fn().mockImplementation(() => Promise.resolve(`kc-uuid-${++kcCounter}`)),
  updateUser: jest.fn().mockResolvedValue(undefined),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  setUserEnabled: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
};

const mockMailService = {
  generateTempPassword: jest.fn().mockReturnValue('Temp@12345'),
  sendNewAccountEmail: jest.fn().mockResolvedValue(undefined),
};

const mockAuditLogService = {
  log: jest.fn().mockResolvedValue(undefined),
};

// Khởi tạo MongoMemoryServer và NestJS testing module trước khi chạy tests
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();

  testModule = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(mongod.getUri()),
      MongooseModule.forFeature([
        { name: User.name, schema: UserSchema },
        { name: AuditLog.name, schema: AuditLogSchema },
      ]),
    ],
    providers: [
      UserService,
      UserRepository,
      { provide: KeycloakService, useValue: mockKeycloakService },
      { provide: MailService, useValue: mockMailService },
      { provide: AuditLogService, useValue: mockAuditLogService },
    ],
  }).compile();

  userService = testModule.get<UserService>(UserService);
  userModel = testModule.get<Model<User>>(getModelToken(User.name));
});

// Dọn dẹp sau khi tất cả tests hoàn tất
afterAll(async () => {
  await testModule.close();
  await mongod.stop();
});

// Xóa dữ liệu và reset mocks sau mỗi test
afterEach(async () => {
  await userModel.deleteMany({});
  jest.clearAllMocks();
});

// ── createUser — Test nhóm tạo user ─────────────────────────────────────────

describe('createUser (integration)', () => {
  const dto = {
    username: 'operator1',
    email: 'operator1@example.com',
    role: UserRole.OPERATOR,
  };

  /** Kiểm tra user được lưu vào MongoDB với keycloak_id từ Keycloak */
  it('persists user to MongoDB with keycloak_id', async () => {
    const result = await userService.createUser(dto, 'admin');

    expect(result.username).toBe('operator1');
    expect(result.keycloak_id).toMatch(/^kc-uuid-\d+$/);

    const saved = await userModel.findOne({ username: 'operator1' });
    expect(saved).not.toBeNull();
    expect(saved?.keycloak_id).toMatch(/^kc-uuid-\d+$/);
  });

  /** Kiểm tra ràng buộc unique username — không cho tạo 2 user cùng username */
  it('enforces unique username constraint', async () => {
    await userService.createUser(dto, 'admin');

    await expect(
      userService.createUser({ ...dto, email: 'other@x.com' }, 'admin'),
    ).rejects.toThrow(ConflictException);
  });

  /** Kiểm tra ràng buộc unique email — không cho tạo 2 user cùng email */
  it('enforces unique email constraint', async () => {
    await userService.createUser(dto, 'admin');

    await expect(
      userService.createUser({ ...dto, username: 'operator2' }, 'admin'),
    ).rejects.toThrow(ConflictException);
  });

  /** Kiểm tra gửi email chào mừng với mật khẩu tạm thời */
  it('sends welcome email with temp password', async () => {
    await userService.createUser(dto, 'admin');

    expect(mockMailService.sendNewAccountEmail).toHaveBeenCalledWith(
      dto.email,
      dto.username,
      UserRole.OPERATOR,
      'Temp@12345',
    );
  });

  /** Kiểm tra vẫn tạo user trong MongoDB khi Keycloak không khả dụng */
  it('still creates user in MongoDB when Keycloak throws', async () => {
    mockKeycloakService.createUser.mockRejectedValueOnce(new Error('KC down'));

    const result = await userService.createUser(
      { username: 'kc-fail-user', email: 'kc-fail@x.com', role: UserRole.OPERATOR },
      'admin',
    );

    expect(result.username).toBe('kc-fail-user');
    // keycloak_id là undefined khi Keycloak thất bại
    expect(result.keycloak_id).toBeUndefined();
  });
});

// ── findAll / findById — Test nhóm đọc danh sách và tìm user ────────────────

describe('findAll + findById (integration)', () => {
  /** Kiểm tra trả về danh sách user phân trang từ MongoDB thật */
  it('returns paginated users from real DB', async () => {
    await userService.createUser({ username: 'u1', email: 'u1@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'u2', email: 'u2@x.com', role: UserRole.MANAGER }, 'admin');

    const result = await userService.findAll(1, 20);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  /** Kiểm tra từ chối page < 1 */
  it('throws BadRequestException when page < 1', async () => {
    await expect(userService.findAll(0, 20)).rejects.toThrow(BadRequestException);
  });

  /** Kiểm tra findById trả về user khi tìm thấy */
  it('findById returns user when found', async () => {
    const created = await userService.createUser(
      { username: 'findme', email: 'findme@x.com', role: UserRole.OPERATOR },
      'admin',
    );

    const found = await userService.findById(created.user_id);

    expect(found.username).toBe('findme');
  });

  /** Kiểm tra findById ném NotFoundException khi user không tồn tại */
  it('findById throws NotFoundException when user does not exist', async () => {
    await expect(userService.findById('non-existent-uuid')).rejects.toThrow(NotFoundException);
  });
});

// ── search — Test nhóm tìm kiếm user ────────────────────────────────────────

describe('search (integration)', () => {
  beforeEach(async () => {
    await userService.createUser({ username: 'operator_abc', email: 'abc@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'manager_xyz', email: 'xyz@x.com', role: UserRole.MANAGER }, 'admin');
  });

  /** Kiểm tra tìm kiếm user theo username (partial match, case-insensitive) */
  it('finds users by partial username match', async () => {
    const result = await userService.search('operator');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].username).toBe('operator_abc');
  });

  /** Kiểm tra từ chối từ khóa tìm kiếm quá ngắn (< 2 ký tự) */
  it('throws BadRequestException for query shorter than 2 chars', async () => {
    await expect(userService.search('x')).rejects.toThrow(BadRequestException);
  });
});

// ── update — Test nhóm cập nhật user ────────────────────────────────────────

describe('update (integration)', () => {
  /** Kiểm tra cập nhật email và lưu vào MongoDB */
  it('updates user email and persists to real DB', async () => {
    const created = await userService.createUser(
      { username: 'updateme', email: 'old@x.com', role: UserRole.OPERATOR },
      'admin',
    );

    const updated = await userService.update(
      created.user_id,
      { email: 'new@x.com' },
      'admin',
    );

    expect(updated.email).toBe('new@x.com');
    const inDb = await userModel.findOne({ user_id: created.user_id });
    expect(inDb?.email).toBe('new@x.com');
  });

  /** Kiểm tra từ chối cập nhật email đã được user khác sử dụng */
  it('throws ConflictException when new email is already taken', async () => {
    const u1 = await userService.createUser({ username: 'u1', email: 'u1@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'u2', email: 'u2@x.com', role: UserRole.OPERATOR }, 'admin');

    await expect(
      userService.update(u1.user_id, { email: 'u2@x.com' }),
    ).rejects.toThrow(ConflictException);
  });
});

// ── setActiveStatus — Test nhóm khóa/mở khóa tài khoản ──────────────────────

describe('setActiveStatus (integration)', () => {
  /** Kiểm tra khóa user: is_active=false và lưu lock fields */
  it('locks user: sets is_active=false and lock fields in DB', async () => {
    const user = await userService.createUser(
      { username: 'lockme', email: 'lockme@x.com', role: UserRole.OPERATOR },
      'admin',
    );

    await userService.setActiveStatus(
      user.user_id,
      false,
      { lock_type: 'manual', lock_reason: 'Violation' } as any,
      'admin',
    );

    const inDb = await userModel.findOne({ user_id: user.user_id });
    expect(inDb?.is_active).toBe(false);
    expect((inDb as any).lock_reason).toBe('Violation');
  });

  /** Kiểm tra mở khóa user: is_active=true và xóa lock fields */
  it('unlocks user: sets is_active=true and clears lock fields in DB', async () => {
    const user = await userService.createUser(
      { username: 'unlockme', email: 'unlockme@x.com', role: UserRole.OPERATOR },
      'admin',
    );
    await userService.setActiveStatus(user.user_id, false, { lock_type: 'manual', lock_reason: 'Reason' } as any, 'admin');

    await userService.setActiveStatus(user.user_id, true, undefined, 'admin');

    const inDb = await userModel.findOne({ user_id: user.user_id });
    expect(inDb?.is_active).toBe(true);
  });
});

// ── delete — Test nhóm xóa user ─────────────────────────────────────────────

describe('delete (integration)', () => {
  /** Kiểm tra xóa user khỏi MongoDB và gọi Keycloak delete */
  it('removes user from MongoDB and calls Keycloak delete', async () => {
    const user = await userService.createUser(
      { username: 'deleteme', email: 'deleteme@x.com', role: UserRole.OPERATOR },
      'admin',
    );

    const result = await userService.delete(user.user_id);

    expect(result.success).toBe(true);
    expect(mockKeycloakService.deleteUser).toHaveBeenCalledWith(user.keycloak_id);

    const inDb = await userModel.findOne({ user_id: user.user_id });
    expect(inDb).toBeNull();
  });

  /** Kiểm tra ném NotFoundException khi user không tồn tại */
  it('throws NotFoundException when user does not exist', async () => {
    await expect(userService.delete('non-existent')).rejects.toThrow(NotFoundException);
  });
});

// ── getStatistics — Test nhóm thống kê user ─────────────────────────────────

describe('getStatistics (integration)', () => {
  /** Kiểm tra thống kê đúng: tổng số, active, inactive, theo role */
  it('returns correct total, active, inactive, byRole from real DB', async () => {
    await userService.createUser({ username: 'op1', email: 'op1@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'op2', email: 'op2@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'mgr1', email: 'mgr1@x.com', role: UserRole.MANAGER }, 'admin');

    const stats = await userService.getStatistics();

    expect(stats.total).toBe(3);
    expect(stats.active).toBe(3);
    expect(stats.inactive).toBe(0);
    expect(stats.byRole['Operator']).toBe(2);
    expect(stats.byRole['Manager']).toBe(1);
  });
});
