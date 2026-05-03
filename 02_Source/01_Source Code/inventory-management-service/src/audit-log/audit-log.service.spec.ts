// Import các công cụ testing từ NestJS
import { Test, TestingModule } from '@nestjs/testing';
// Import service cần test
import { AuditLogService } from './audit-log.service';
// Import helper để lấy token của Mongoose Model (dùng cho mock)
import { getModelToken } from '@nestjs/mongoose';
// Import các kiểu dữ liệu từ schema
import { AuditLog, AuditAction } from './audit-log.schema';

// Tạo một mock entry để sử dụng trong các test case
const mockEntry = {
  username: 'manager1',
  user_id: 'user-001',
  action: AuditAction.LOGIN_SUCCESS,
  ip: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  details: { key: 'value' },
  timestamp: new Date('2026-04-01T10:00:00Z'),
};

// Khai báo biến để sử dụng trong các test
let service: AuditLogService;
let mockModel: any;

// Chạy trước mỗi test case (beforeEach)
beforeEach(async () => {
  // Tạo mock object cho Mongoose Model
  mockModel = {
    create: jest.fn().mockResolvedValue(mockEntry),   // Mock phương thức create
    find: jest.fn(),                                   // Mock phương thức find
    countDocuments: jest.fn(),                         // Mock phương thức countDocuments
  };

  // Tạo các mock object có thể chain (gọi nối tiếp nhau)
  // execFn là hàm thực thi cuối cùng
  const execFn = jest.fn();
  const chainable: any = {
    sort: jest.fn().mockReturnThis(),    // sort() trả về chính nó để tiếp tục chain
    skip: jest.fn().mockReturnThis(),    // skip() trả về chính nó
    limit: jest.fn().mockReturnThis(),   // limit() trả về chính nó
    exec: execFn,                        // exec() gọi đến execFn
  };
  
  // Mock phương thức lean():
  // - Trả về một object có thể gọi then (thenable) để mô phỏng Promise
  // - Cũng có phương thức exec để tương thích với cả 2 cách gọi
  chainable.lean = jest.fn().mockImplementation(() => {
    const thenableChain = {
      exec: execFn,
      then: (resolve: any, reject: any) => execFn().then(resolve, reject),
    };
    return thenableChain;
  });
  
  // Mock phương thức find trả về chainable object
  mockModel.find.mockReturnValue(chainable);
  
  // Lưu trữ các reference để sử dụng trong test cases
  mockModel._chain = chainable;
  mockModel._exec = execFn;

  // Tạo testing module với service cần test và mock provider
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuditLogService,
      // Cung cấp mock thay thế cho Mongoose Model
      { provide: getModelToken(AuditLog.name), useValue: mockModel },
    ],
  }).compile();

  // Lấy instance của service từ module
  service = module.get<AuditLogService>(AuditLogService);
});

// ── Test cases cho phương thức log ──────────────────────────────────────────

describe('log', () => {
  // Test: Tạo audit log entry với đầy đủ các trường
  it('creates an audit log entry with all fields', async () => {
    await service.log(
      'manager1',
      AuditAction.LOGIN_SUCCESS,
      { ip: '127.0.0.1', userAgent: 'Mozilla/5.0' },
      { key: 'value' },
      'user-001'
    );

    // Kiểm tra xem model.create đã được gọi với đúng dữ liệu
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

  // Test: Tạo audit log entry mà không có các trường tùy chọn
  it('creates log entry without optional fields', async () => {
    await service.log('operator1', AuditAction.LOGOUT_SUCCESS);

    // Kiểm tra xem model.create đã được gọi với ít nhất các trường bắt buộc
    expect(mockModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'operator1',
        action: AuditAction.LOGOUT_SUCCESS,
      }),
    );
  });

  // Test: Không ném lỗi nếu create thành công
  it('does not throw if create succeeds', async () => {
    await expect(service.log('user', AuditAction.LOGIN_SUCCESS)).resolves.toBeUndefined();
  });
});

// ── Test cases cho phương thức findAll ─────────────────────────────────────

describe('findAll', () => {
  // Thiết lập mock trước mỗi test trong nhóm này
  beforeEach(() => {
    mockModel._exec.mockResolvedValue([mockEntry]);        // Mock trả về 1 entry
    mockModel.countDocuments.mockResolvedValue(1);         // Mock đếm tổng là 1
  });

  // Test: Trả về kết quả phân trang với page/limit mặc định
  it('returns paginated results with default page/limit', async () => {
    const result = await service.findAll({});

    expect(result.data).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.total).toBe(1);
  });

  // Test: Lọc theo username với regex không phân biệt hoa thường
  it('filters by username (case-insensitive regex)', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(0);

    await service.findAll({ username: 'manager' });

    // Kiểm tra query truyền vào find có đúng filter
    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        username: { $regex: 'manager', $options: 'i' },
      }),
    );
  });

  // Test: Lọc theo action (chính xác)
  it('filters by action', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(0);

    await service.findAll({ action: AuditAction.LOGIN_SUCCESS });

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.LOGIN_SUCCESS }),
    );
  });

  // Test: Lọc theo khoảng thời gian (date range)
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

  // Test: Tính toán đúng tổng số trang
  it('calculates correct totalPages', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(105);  // 105 records, limit 50 → 3 pages

    const result = await service.findAll({ page: 1, limit: 50 });

    expect(result.pagination.totalPages).toBe(3);
  });

  // Test: Áp dụng đúng skip dựa trên page (phân trang)
  it('applies correct skip based on page', async () => {
    mockModel._exec.mockResolvedValue([]);
    mockModel.countDocuments.mockResolvedValue(0);

    await service.findAll({ page: 3, limit: 20 });  // Page 3, limit 20 → skip 40

    expect(mockModel._chain.skip).toHaveBeenCalledWith(40);
    expect(mockModel._chain.limit).toHaveBeenCalledWith(20);
  });
});

// ── Test cases cho phương thức exportCsv ────────────────────────────────────

describe('exportCsv', () => {
  // Test: Trả về chuỗi CSV với header và các dòng dữ liệu
  it('returns a CSV string with header and rows', async () => {
    mockModel._exec.mockResolvedValue([mockEntry]);

    const csv = await service.exportCsv({});

    // Kiểm tra kiểu dữ liệu trả về
    expect(typeof csv).toBe('string');
    // Kiểm tra header có đúng các cột
    expect(csv).toContain('Thời gian');
    expect(csv).toContain('Người dùng');
    // Kiểm tra dữ liệu có xuất hiện trong CSV
    expect(csv).toContain('manager1');
    expect(csv).toContain(AuditAction.LOGIN_SUCCESS);
  });

  // Test: Chỉ trả về header khi không có log nào khớp
  it('returns only header when no logs match', async () => {
    mockModel._exec.mockResolvedValue([]);

    const csv = await service.exportCsv({});

    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);           // Chỉ có 1 dòng (header)
    expect(lines[0]).toContain('Thời gian');
  });

  // Test: Escape đúng các dấu ngoặc kép trong giá trị (CSV standard)
  it('escapes double quotes in values', async () => {
    const entryWithQuotes = { ...mockEntry, username: 'user"name' };
    mockModel._exec.mockResolvedValue([entryWithQuotes]);

    const csv = await service.exportCsv({});

    // Dấu " bên trong giá trị phải được nhân đôi thành ""
    expect(csv).toContain('user""name');
  });
});
