import { Test, TestingModule } from '@nestjs/testing';
import { MaterialService } from './material.service';
import { MaterialRepository } from './material.repository';
import { RedisIdService } from '../redis-id/redis-id.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

// Mock XLSX used by exportToExcel
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn().mockReturnValue({}),
    book_new: jest.fn().mockReturnValue({}),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn().mockReturnValue(Buffer.from([1, 2, 3])),
}));

// Mock pdfkit used by exportToPDF
jest.mock('pdfkit', () => {
  class FakePdfDoc {
    private callbacks: Record<string, Function> = {};
    private bufs: Buffer[] = [];

    on(event: string, cb: Function) {
      this.callbacks[event] = cb;
      return this;
    }

    fontSize() {
      return this;
    }
    font() {
      return this;
    }
    text(t: any) {
      this.bufs.push(Buffer.from(String(t)));
      return this;
    }
    moveDown() {
      return this;
    }
    addPage() {
      return this;
    }
    end() {
      const chunks = this.bufs.length ? this.bufs : [Buffer.from('pdf')];
      if (this.callbacks['data']) {
        for (const c of chunks) this.callbacks['data'](c);
      }
      if (this.callbacks['end']) this.callbacks['end']();
    }
  }

  return { default: FakePdfDoc };
});

const sampleMaterial: any = {
  _id: '507f1f77bcf86cd799439011',
  material_id: 'MAT-001',
  part_number: 'PART-10001',
  material_name: 'Vitamin D3 100K',
  material_type: 'API',
  storage_conditions: '2-8°C, protected from light',
  specification_document: 'SPEC-001',
  created_date: new Date('2025-01-01'),
  modified_date: new Date('2025-01-01'),
};

let service: MaterialService;
let repo: jest.Mocked<MaterialRepository>;

beforeEach(async () => {
  repo = {
    create: jest.fn(),
    findAllWithoutPagination: jest.fn(),
    findAllWithPagination: jest.fn(),
    findById: jest.fn(),
    findByMaterialId: jest.fn(),
    findByPartNumber: jest.fn(),
    search: jest.fn(),
    filterByType: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getDistinctTypes: jest.fn(),
    findOptions: jest.fn(),
  } as unknown as jest.Mocked<MaterialRepository>;

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      MaterialService,
      { provide: MaterialRepository, useValue: repo },
      { provide: RedisIdService, useValue: { nextId: jest.fn().mockResolvedValue('MAT-1') } },
    ],
  }).compile();

  service = module.get<MaterialService>(MaterialService);
});

// ── create ─────────────────────────────────────────────────────────────────

describe('create', () => {
  const dto = {
    material_id: 'MAT-001',
    part_number: 'PART-10001',
    material_name: 'Vitamin D3 100K',
    material_type: 'API' as any,
  };

  it('creates material when id and part_number are unique', async () => {
    repo.findByMaterialId.mockResolvedValue(null);
    repo.findByPartNumber.mockResolvedValue(null);
    repo.create.mockResolvedValue(sampleMaterial);

    const result = await service.create(dto);

    expect(result.material_id).toBe('MAT-001');
    expect(repo.create).toHaveBeenCalledWith(dto);
  });

  it('throws ConflictException when material_id already exists', async () => {
    repo.findByMaterialId.mockResolvedValue(sampleMaterial);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when part_number already exists', async () => {
    repo.findByMaterialId.mockResolvedValue(null);
    repo.findByPartNumber.mockResolvedValue(sampleMaterial);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

// ── findAll ────────────────────────────────────────────────────────────────

describe('findAll', () => {
  it('returns paginated list', async () => {
    repo.findAllWithPagination.mockResolvedValue({
      data: [sampleMaterial],
      total: 1,
      page: 1,
      limit: 20,
    });

    const result = await service.findAll(1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('returns all materials when page/limit omitted', async () => {
    repo.findAllWithoutPagination.mockResolvedValue([sampleMaterial]);

    const result = await service.findAll();

    expect(result.data).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
  });
});

describe('findAllWithPagination', () => {
  it('throws BadRequestException when page < 1', async () => {
    await expect(service.findAllWithPagination(0, 20)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when limit < 1', async () => {
    await expect(service.findAllWithPagination(1, 0)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('caps limit at 100', async () => {
    repo.findAllWithPagination.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
    });

    await service.findAllWithPagination(1, 200);

    expect(repo.findAllWithPagination).toHaveBeenCalledWith(1, 100);
  });
});

// ── findById ───────────────────────────────────────────────────────────────

describe('findById', () => {
  it('returns material when found', async () => {
    repo.findById.mockResolvedValue(sampleMaterial);

    const result = await service.findById('507f1f77bcf86cd799439011');

    expect(result.material_id).toBe('MAT-001');
  });

  it('throws NotFoundException when material does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.findById('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── search ─────────────────────────────────────────────────────────────────

describe('search', () => {
  it('returns search results', async () => {
    repo.search.mockResolvedValue({ data: [sampleMaterial], total: 1 });

    const result = await service.search('Vitamin', 1, 20);

    expect(result.data).toHaveLength(1);
    expect(repo.search).toHaveBeenCalledWith('Vitamin', 1, 20);
  });

  it('throws BadRequestException when query is empty', async () => {
    await expect(service.search('', 1, 20)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when query is only whitespace', async () => {
    await expect(service.search('   ', 1, 20)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when query is shorter than 2 chars', async () => {
    await expect(service.search('A', 1, 20)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('trims whitespace from query before calling repo', async () => {
    repo.search.mockResolvedValue({ data: [], total: 0 });

    await service.search('  API  ', 1, 20);

    expect(repo.search).toHaveBeenCalledWith('API', 1, 20);
  });
});

// ── filterByType ───────────────────────────────────────────────────────────

describe('filterByType', () => {
  it('returns filtered results for valid type', async () => {
    repo.filterByType.mockResolvedValue({ data: [sampleMaterial], total: 1 });

    const result = await service.filterByType('API', 1, 20);

    expect(result.data).toHaveLength(1);
  });

  it('throws BadRequestException for invalid material type', async () => {
    await expect(service.filterByType('InvalidType', 1, 20)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('accepts all valid material types', async () => {
    const validTypes = [
      'API',
      'Excipient',
      'Dietary Supplement',
      'Container',
      'Closure',
      'Process Chemical',
      'Testing Material',
    ];
    repo.filterByType.mockResolvedValue({ data: [], total: 0 });

    for (const type of validTypes) {
      await expect(service.filterByType(type, 1, 20)).resolves.not.toThrow();
    }
  });
});

// ── update ─────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates and returns updated material', async () => {
    const updated = { ...sampleMaterial, material_name: 'Updated Name' };
    repo.findById.mockResolvedValue(sampleMaterial);
    repo.update.mockResolvedValue(updated);

    const result = await service.update('507f1f77bcf86cd799439011', {
      material_name: 'Updated Name',
    });

    expect(result.material_name).toBe('Updated Name');
  });

  it('throws NotFoundException when material does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      service.update('non-existent', { material_name: 'X' }),
    ).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

// ── delete ─────────────────────────────────────────────────────────────────

describe('delete', () => {
  it('deletes existing material and returns message', async () => {
    repo.findById.mockResolvedValue(sampleMaterial);
    repo.delete.mockResolvedValue(null);

    const result = await service.delete('507f1f77bcf86cd799439011');

    expect(result.message).toContain('deleted successfully');
    expect(repo.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('throws NotFoundException when material does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.delete('non-existent')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

// ── remove (test-compat wrapper) ───────────────────────────────────────────

describe('remove', () => {
  it('returns { deleted: true } on success', async () => {
    repo.findById.mockResolvedValue(sampleMaterial);
    repo.delete.mockResolvedValue(null);

    const result = await service.remove('507f1f77bcf86cd799439011');

    expect(result.deleted).toBe(true);
  });

  it('returns { deleted: false } when material not found', async () => {
    repo.findById.mockResolvedValue(null);

    const result = await service.remove('non-existent');

    expect(result.deleted).toBe(false);
  });
});

// ── getDistinctTypes ───────────────────────────────────────────────────────

describe('getDistinctTypes', () => {
  it('returns list of distinct types', async () => {
    repo.getDistinctTypes.mockResolvedValue(['API', 'Excipient']);

    const result = await service.getDistinctTypes();

    expect(result).toEqual(['API', 'Excipient']);
  });
});

// ── getOptions / exports ───────────────────────────────────────────────────

describe('getOptions', () => {
  it('throws BadRequestException when page < 1', async () => {
    await expect(
      service.getOptions(undefined, undefined, 0, 20),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when limit < 1', async () => {
    await expect(
      service.getOptions(undefined, undefined, 1, 0),
    ).rejects.toThrow(BadRequestException);
  });

  it('calls repository.findOptions with capped limit', async () => {
    repo.findOptions.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
    } as any);

    await service.getOptions('q', 'active', 1, 200);

    expect(repo.findOptions).toHaveBeenCalledWith('q', 'active', 1, 100);
  });
});
// Note: exportToExcel and exportToPDF involve dynamic imports (xlsx/pdfkit)
// which require experimental VM modules in this test runner. Those
// integrations are covered via higher-level controller tests where the
// exported buffers are mocked. Keep service tests focused on business logic.
