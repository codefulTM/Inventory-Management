import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { KeycloakGrpcClientService } from '../common/keycloak-grpc-client/keycloak-grpc-client.service';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '../schemas/user.schema';

const sampleUser: any = {
  user_id: 'user-uuid-001',
  keycloak_id: 'kc-uuid-001',
  username: 'operator1',
  email: 'operator1@example.com',
  role: UserRole.OPERATOR,
  is_active: true,
  last_login: null,
  created_date: new Date('2025-01-01'),
  modified_date: new Date('2025-01-01'),
};

let service: UserService;
let repo: jest.Mocked<UserRepository>;
let keycloakService: jest.Mocked<KeycloakGrpcClientService>;
let mailService: jest.Mocked<MailService>;
let auditLogService: jest.Mocked<AuditLogService>;

beforeEach(async () => {
  repo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    findByKeycloakId: jest.fn(),
    findByRole: jest.fn(),
    search: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateLastLogin: jest.fn(),
    countByRole: jest.fn(),
    countActive: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;

  keycloakService = {
    createUser: jest.fn().mockResolvedValue('kc-uuid-new'),
    updateUser: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    setUserEnabled: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<KeycloakGrpcClientService>;

  mailService = {
    generateTempPassword: jest.fn().mockReturnValue('Temp@12345'),
    sendNewAccountEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MailService>;

  auditLogService = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditLogService>;

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UserService,
      { provide: UserRepository, useValue: repo },
      { provide: KeycloakGrpcClientService, useValue: keycloakService },
      { provide: MailService, useValue: mailService },
      { provide: AuditLogService, useValue: auditLogService },
    ],
  }).compile();

  service = module.get<UserService>(UserService);
});

// ── createUser ─────────────────────────────────────────────────────────────

describe('createUser', () => {
  const dto = {
    username: 'newuser',
    email: 'newuser@example.com',
    role: UserRole.OPERATOR,
  };

  beforeEach(() => {
    repo.findByUsername.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue({
      ...sampleUser,
      username: 'newuser',
      email: 'newuser@example.com',
    });
  });

  it('creates user in Keycloak and MongoDB, sends welcome email', async () => {
    const result = await service.createUser(dto, 'admin');

    expect(keycloakService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'newuser',
        email: 'newuser@example.com',
      }),
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'newuser',
        keycloak_id: 'kc-uuid-new',
      }),
    );
    expect(mailService.sendNewAccountEmail).toHaveBeenCalledWith(
      'newuser@example.com',
      'newuser',
      UserRole.OPERATOR,
      'Temp@12345',
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      'admin',
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ target: 'newuser' }),
    );
    expect(result.username).toBe('newuser');
  });

  it('throws ConflictException when username already exists', async () => {
    repo.findByUsername.mockResolvedValue(sampleUser);

    await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when email already exists', async () => {
    repo.findByEmail.mockResolvedValue(sampleUser);

    await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('still creates user in MongoDB when Keycloak is unavailable', async () => {
    keycloakService.createUser.mockRejectedValue(
      new Error('Keycloak unreachable'),
    );

    const result = await service.createUser(dto);

    // MongoDB create is still called
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ keycloak_id: undefined }),
    );
    expect(result).toBeDefined();
  });

  it('defaults role to OPERATOR when not provided', async () => {
    const dtoNoRole = { username: 'newuser', email: 'newuser@example.com' };

    await service.createUser(dtoNoRole as any);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.OPERATOR }),
    );
  });
});

// ── findAll ────────────────────────────────────────────────────────────────

describe('findAll', () => {
  it('returns paginated users', async () => {
    repo.findAll.mockResolvedValue({ data: [sampleUser], total: 1 });

    const result = await service.findAll(1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('throws BadRequestException when page < 1', async () => {
    await expect(service.findAll(0, 20)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when limit > 100', async () => {
    await expect(service.findAll(1, 101)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when limit < 1', async () => {
    await expect(service.findAll(1, 0)).rejects.toThrow(BadRequestException);
  });
});

// ── findById ───────────────────────────────────────────────────────────────

describe('findById', () => {
  it('returns user when found', async () => {
    repo.findById.mockResolvedValue(sampleUser);

    const result = await service.findById('user-uuid-001');

    expect(result.user_id).toBe('user-uuid-001');
  });

  it('throws NotFoundException when user does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.findById('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── findByRole ─────────────────────────────────────────────────────────────

describe('findByRole', () => {
  it('returns users with given role', async () => {
    repo.findByRole.mockResolvedValue({ data: [sampleUser], total: 1 });

    const result = await service.findByRole(UserRole.OPERATOR);

    expect(result.data).toHaveLength(1);
  });

  it('throws BadRequestException for invalid role', async () => {
    await expect(service.findByRole('InvalidRole')).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ── search ─────────────────────────────────────────────────────────────────

describe('search', () => {
  it('returns matching users', async () => {
    repo.search.mockResolvedValue({ data: [sampleUser], total: 1 });

    const result = await service.search('operator');

    expect(result.data).toHaveLength(1);
    expect(repo.search).toHaveBeenCalledWith('operator', 1, 20);
  });

  it('throws BadRequestException when query is too short', async () => {
    await expect(service.search('A')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when query is empty', async () => {
    await expect(service.search('')).rejects.toThrow(BadRequestException);
  });
});

// ── update ─────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates user and syncs to Keycloak', async () => {
    const updated = { ...sampleUser, email: 'new@example.com' };
    repo.findById.mockResolvedValue(sampleUser);
    repo.findByUsername.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.update.mockResolvedValue(updated);

    const result = await service.update(
      'user-uuid-001',
      { email: 'new@example.com' },
      'admin',
    );

    expect(keycloakService.updateUser).toHaveBeenCalledWith(
      'kc-uuid-001',
      expect.objectContaining({ email: 'new@example.com' }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      'admin',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(result.email).toBe('new@example.com');
  });

  it('throws NotFoundException when user does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      service.update('non-existent', { email: 'x@x.com' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when new username is taken', async () => {
    repo.findById.mockResolvedValue(sampleUser);
    repo.findByUsername.mockResolvedValue({
      ...sampleUser,
      user_id: 'other-user',
    });

    await expect(
      service.update('user-uuid-001', { username: 'taken' }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when new email is taken', async () => {
    repo.findById.mockResolvedValue(sampleUser);
    repo.findByUsername.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue({
      ...sampleUser,
      user_id: 'other-user',
    });

    await expect(
      service.update('user-uuid-001', { email: 'taken@x.com' }),
    ).rejects.toThrow(ConflictException);
  });

  it('skips Keycloak update when user has no keycloak_id', async () => {
    const userNoKc = { ...sampleUser, keycloak_id: undefined };
    repo.findById.mockResolvedValue(userNoKc);
    repo.findByUsername.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.update.mockResolvedValue(userNoKc);

    await service.update('user-uuid-001', { email: 'new@example.com' });

    expect(keycloakService.updateUser).not.toHaveBeenCalled();
  });
});

// ── setActiveStatus ────────────────────────────────────────────────────────

describe('setActiveStatus', () => {
  it('locks user: disables in Keycloak and sets is_active=false', async () => {
    const lockDto = { lock_type: 'manual', lock_reason: 'Violation' };
    const lockedUser = { ...sampleUser, is_active: false, ...lockDto };
    repo.findById.mockResolvedValue(sampleUser);
    repo.update.mockResolvedValue(lockedUser);

    const result = await service.setActiveStatus(
      'user-uuid-001',
      false,
      lockDto as any,
      'admin',
    );

    expect(keycloakService.setUserEnabled).toHaveBeenCalledWith(
      'kc-uuid-001',
      false,
    );
    expect(repo.update).toHaveBeenCalledWith(
      'user-uuid-001',
      expect.objectContaining({ is_active: false, lock_reason: 'Violation' }),
    );
    expect(result.is_active).toBe(false);
  });

  it('unlocks user: enables in Keycloak and clears lock fields', async () => {
    const lockedUser = {
      ...sampleUser,
      is_active: false,
      lock_type: 'manual',
      lock_reason: 'old reason',
    };
    repo.findById.mockResolvedValue(lockedUser);
    repo.update.mockResolvedValue({ ...sampleUser, is_active: true });

    const result = await service.setActiveStatus(
      'user-uuid-001',
      true,
      undefined,
      'admin',
    );

    expect(keycloakService.setUserEnabled).toHaveBeenCalledWith(
      'kc-uuid-001',
      true,
    );
    expect(repo.update).toHaveBeenCalledWith(
      'user-uuid-001',
      expect.objectContaining({
        is_active: true,
        lock_type: undefined,
        lock_reason: undefined,
      }),
    );
    expect(result.is_active).toBe(true);
  });

  it('throws NotFoundException when user does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      service.setActiveStatus('non-existent', false),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── changePassword ─────────────────────────────────────────────────────────

describe('changePassword', () => {
  it('resets password in Keycloak', async () => {
    repo.findById.mockResolvedValue(sampleUser);

    const result = await service.changePassword('user-uuid-001', {
      new_password: 'NewPass@123',
    } as any);

    expect(keycloakService.resetPassword).toHaveBeenCalledWith(
      'kc-uuid-001',
      'NewPass@123',
    );
    expect(result.message).toContain('thành công');
  });

  it('throws NotFoundException when user does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      service.changePassword('non-existent', { new_password: 'x' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when user has no keycloak_id', async () => {
    repo.findById.mockResolvedValue({ ...sampleUser, keycloak_id: undefined });

    await expect(
      service.changePassword('user-uuid-001', { new_password: 'x' } as any),
    ).rejects.toThrow(BadRequestException);
  });
});

// ── delete ─────────────────────────────────────────────────────────────────

describe('delete', () => {
  it('deletes from Keycloak then MongoDB', async () => {
    repo.findById.mockResolvedValue(sampleUser);
    repo.delete.mockResolvedValue(true);

    const result = await service.delete('user-uuid-001');

    expect(keycloakService.deleteUser).toHaveBeenCalledWith('kc-uuid-001');
    expect(repo.delete).toHaveBeenCalledWith('user-uuid-001');
    expect(result.success).toBe(true);
  });

  it('skips Keycloak deletion when user has no keycloak_id', async () => {
    repo.findById.mockResolvedValue({ ...sampleUser, keycloak_id: undefined });
    repo.delete.mockResolvedValue(true);

    await service.delete('user-uuid-001');

    expect(keycloakService.deleteUser).not.toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalled();
  });

  it('throws NotFoundException when user does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.delete('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── getStatistics ──────────────────────────────────────────────────────────

describe('getStatistics', () => {
  it('returns total, active, inactive and byRole breakdown', async () => {
    repo.countByRole.mockResolvedValue({ Operator: 5, Manager: 2 } as any);
    repo.countActive.mockResolvedValue(6);
    repo.findAll.mockResolvedValue({ data: [], total: 7 });

    const result = await service.getStatistics();

    expect(result.total).toBe(7);
    expect(result.active).toBe(6);
    expect(result.inactive).toBe(1);
    expect(result.byRole).toEqual({ Operator: 5, Manager: 2 });
  });
});
