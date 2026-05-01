import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog, AuditAction } from './audit-log.schema';

const mockEntry = {
  username: 'manager1',
  user_id: 'user-001',
  action: AuditAction.LOGIN_SUCCESS,
  ip: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  details: { key: 'value' },
  timestamp: new Date('2026-04-01T10:00:00Z'),
};

let service: AuditLogService;
let mockModel: any;

beforeEach(async () => {
  mockModel = {
    create: jest.fn().mockResolvedValue(mockEntry),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  // Chainable find mock — lean() doubles as both chainable (for findAll) and thenable (for exportCsv)
  const execFn = jest.fn();
  const chainable: any = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: execFn,
  };
  // lean() returns a thenable that also exposes exec()
  chainable.lean = jest.fn().mockImplementation(() => {
    const thenableChain = {
      exec: execFn,
      then: (resolve: any, reject: any) => execFn().then(resolve, reject),
    };
    return thenableChain;
  });
  mockModel.find.mockReturnValue(chainable);
  mockModel._chain = chainable;
  mockModel._exec = execFn;

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuditLogService,
      { provide: getModelToken(AuditLog.name), useValue: mockModel },
    ],
  }).compile();

  service = module.get<AuditLogService>(AuditLogService);
});

// ── log ────────────────────────────────────────────────────────────────────

describe('log', () => {
  it('creates an audit log entry with all fields', async () => {
    await service.log('manager1', AuditAction.LOGIN_SUCCESS, { ip: '127.0.0.1', userAgent: 'Mozilla/5.0' }, { key: 'value' }, 'user-001');

    expect(mockModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'manager1',
        user_id: 'user-001',
        action: AuditAction.LOGIN_SUCCESS,
        ip: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        details: { key: 'value' },
      }),
    );
  });

  it('creates log entry without optional fields', async () => {
    await service.log('operator1', AuditAction.LOGOUT_SUCCESS);

    expect(mockModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'operator1',
        action: AuditAction.LOGOUT_SUCCESS,
      }),
    );
  });

  it('does not throw if create succeeds', async () => {
    await expect(service.log('user', AuditAction.LOGIN_SUCCESS)).resolves.toBeUndefined();
  });
});

// ── findAll ────────────────────────────────────────────────────────────────

describe('findAll', () => {
  beforeEach(() => {
    mockModel._exec.mockResolvedValue([mockEntry]);
    mockModel.countDocuments.mockResolvedValue(1);
  });

  it('returns paginated results with default page/limit', async () => {
    const result = await service.findAll({});

    expect(result.data).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.total).toBe(1);
  });

  it('filters by username (case-insensitive regex)', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(0);

    await service.findAll({ username: 'manager' });

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        username: { $regex: 'manager', $options: 'i' },
      }),
    );
  });

  it('filters by action', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(0);

    await service.findAll({ action: AuditAction.LOGIN_SUCCESS });

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.LOGIN_SUCCESS }),
    );
  });

  it('filters by date range', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(0);

    const from = new Date('2026-01-01');
    const to = new Date('2026-04-01');

    await service.findAll({ date_from: from, date_to: to });

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: { $gte: from, $lte: to },
      }),
    );
  });

  it('calculates correct totalPages', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(105);

    const result = await service.findAll({ page: 1, limit: 50 });

    expect(result.pagination.totalPages).toBe(3);
  });

  it('applies correct skip based on page', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(0);

    await service.findAll({ page: 3, limit: 20 });

    expect(mockModel._chain.skip).toHaveBeenCalledWith(40);
    expect(mockModel._chain.limit).toHaveBeenCalledWith(20);
  });
});

// ── exportCsv ──────────────────────────────────────────────────────────────

describe('exportCsv', () => {
  it('returns a CSV string with header and rows', async () => {
    mockModel._exec.mockResolvedValue([mockEntry]);

    const csv = await service.exportCsv({});

    expect(typeof csv).toBe('string');
    expect(csv).toContain('Thời gian');
    expect(csv).toContain('Người dùng');
    expect(csv).toContain('manager1');
    expect(csv).toContain(AuditAction.LOGIN_SUCCESS);
  });

  it('returns only header when no logs match', async () => {
    mockModel._exec.mockResolvedValue([]);

    const csv = await service.exportCsv({});

    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Thời gian');
  });

  it('escapes double quotes in values', async () => {
    const entryWithQuotes = { ...mockEntry, username: 'user"name' };
    mockModel._exec.mockResolvedValue([entryWithQuotes]);

    const csv = await service.exportCsv({});

    expect(csv).toContain('user""name');
  });
});
