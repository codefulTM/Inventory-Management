/**
 * Integration tests — keycloak-service UserService + UserRepository
 *
 * Tests the full user management layer against a real in-memory MongoDB.
 * AuthService is mocked (Keycloak calls are skipped) so we focus on
 * schema constraints, repository queries, and service-level business rules.
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

afterAll(async () => {
  await testModule.close();
  await mongod.stop();
});

afterEach(async () => {
  await userModel.deleteMany({});
  jest.clearAllMocks();
});

// ── createUser ─────────────────────────────────────────────────────────────

describe('createUser (integration)', () => {
  const dto = {
    username: 'operator1',
    email: 'operator1@example.com',
    role: UserRole.OPERATOR,
  };

  it('persists user to MongoDB with keycloak_id', async () => {
    const result = await userService.createUser(dto, 'admin');

    expect(result.username).toBe('operator1');
    expect(result.keycloak_id).toMatch(/^kc-uuid-\d+$/);

    const saved = await userModel.findOne({ username: 'operator1' });
    expect(saved).not.toBeNull();
    expect(saved?.keycloak_id).toMatch(/^kc-uuid-\d+$/);
  });

  it('enforces unique username constraint', async () => {
    await userService.createUser(dto, 'admin');

    await expect(
      userService.createUser({ ...dto, email: 'other@x.com' }, 'admin'),
    ).rejects.toThrow(ConflictException);
  });

  it('enforces unique email constraint', async () => {
    await userService.createUser(dto, 'admin');

    await expect(
      userService.createUser({ ...dto, username: 'operator2' }, 'admin'),
    ).rejects.toThrow(ConflictException);
  });

  it('sends welcome email with temp password', async () => {
    await userService.createUser(dto, 'admin');

    expect(mockMailService.sendNewAccountEmail).toHaveBeenCalledWith(
      dto.email,
      dto.username,
      UserRole.OPERATOR,
      'Temp@12345',
    );
  });

  it('still creates user in MongoDB when Keycloak throws', async () => {
    mockKeycloakService.createUser.mockRejectedValueOnce(new Error('KC down'));

    const result = await userService.createUser(
      { username: 'kc-fail-user', email: 'kc-fail@x.com', role: UserRole.OPERATOR },
      'admin',
    );

    expect(result.username).toBe('kc-fail-user');
    // keycloak_id is undefined when KC fails
    expect(result.keycloak_id).toBeUndefined();
  });
});

// ── findAll / findById ─────────────────────────────────────────────────────

describe('findAll + findById (integration)', () => {
  it('returns paginated users from real DB', async () => {
    await userService.createUser({ username: 'u1', email: 'u1@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'u2', email: 'u2@x.com', role: UserRole.MANAGER }, 'admin');

    const result = await userService.findAll(1, 20);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it('throws BadRequestException when page < 1', async () => {
    await expect(userService.findAll(0, 20)).rejects.toThrow(BadRequestException);
  });

  it('findById returns user when found', async () => {
    const created = await userService.createUser(
      { username: 'findme', email: 'findme@x.com', role: UserRole.OPERATOR },
      'admin',
    );

    const found = await userService.findById(created.user_id);

    expect(found.username).toBe('findme');
  });

  it('findById throws NotFoundException when user does not exist', async () => {
    await expect(userService.findById('non-existent-uuid')).rejects.toThrow(NotFoundException);
  });
});

// ── search ─────────────────────────────────────────────────────────────────

describe('search (integration)', () => {
  beforeEach(async () => {
    await userService.createUser({ username: 'operator_abc', email: 'abc@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'manager_xyz', email: 'xyz@x.com', role: UserRole.MANAGER }, 'admin');
  });

  it('finds users by partial username match', async () => {
    const result = await userService.search('operator');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].username).toBe('operator_abc');
  });

  it('throws BadRequestException for query shorter than 2 chars', async () => {
    await expect(userService.search('x')).rejects.toThrow(BadRequestException);
  });
});

// ── update ─────────────────────────────────────────────────────────────────

describe('update (integration)', () => {
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

  it('throws ConflictException when new email is already taken', async () => {
    const u1 = await userService.createUser({ username: 'u1', email: 'u1@x.com', role: UserRole.OPERATOR }, 'admin');
    await userService.createUser({ username: 'u2', email: 'u2@x.com', role: UserRole.OPERATOR }, 'admin');

    await expect(
      userService.update(u1.user_id, { email: 'u2@x.com' }),
    ).rejects.toThrow(ConflictException);
  });
});

// ── setActiveStatus ────────────────────────────────────────────────────────

describe('setActiveStatus (integration)', () => {
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

// ── delete ─────────────────────────────────────────────────────────────────

describe('delete (integration)', () => {
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

  it('throws NotFoundException when user does not exist', async () => {
    await expect(userService.delete('non-existent')).rejects.toThrow(NotFoundException);
  });
});

// ── getStatistics ──────────────────────────────────────────────────────────

describe('getStatistics (integration)', () => {
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
