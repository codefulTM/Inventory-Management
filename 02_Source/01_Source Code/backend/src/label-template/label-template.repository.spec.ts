import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LabelTemplateRepository } from './label-template.repository';
import { LabelTemplate } from '../schemas/label-template.schema';
import {
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  LabelType,
} from './label-template.dto';
import { Types } from 'mongoose';

type MockQueryChain = {
  skip: jest.Mock<MockQueryChain>;
  limit: jest.Mock<MockQueryChain>;
  sort: jest.Mock<MockQueryChain>;
  exec: jest.Mock<Promise<unknown[]>>;
};

type MongoFilterArg = {
  $or: Array<{
    template_id: { $regex: string; $options: string };
    template_name: { $regex: string; $options: string };
  }>;
};

type MockLabelTemplateModel = {
  create: jest.Mock;
  find: jest.Mock<MockQueryChain, [filter?: MongoFilterArg]>;
  findById: jest.Mock;
  findOne: jest.Mock;
  countDocuments: jest.Mock<Promise<number>, [filter?: MongoFilterArg]>;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

describe('LabelTemplateRepository', () => {
  let repository: LabelTemplateRepository;
  let mockModel: MockLabelTemplateModel;

  // Sample test data
  const mockLabelTemplateDoc = {
    _id: new Types.ObjectId(),
    template_id: 'RAW-001',
    template_name: 'Raw Material Label',
    label_type: 'Raw Material',
    template_content:
      'Material: {{material_name}}\nExpires: {{expiration_date}}',
    width: { toString: () => '4.50' },
    height: { toString: () => '6.00' },
    created_date: new Date('2026-03-10T10:00:00Z'),
    modified_date: new Date('2026-03-10T10:00:00Z'),
    save: jest.fn(),
  };

  const createLabelTemplateDto: CreateLabelTemplateDto = {
    template_id: 'RAW-001',
    template_name: 'Raw Material Label',
    label_type: 'Raw Material',
    template_content: 'Material: {{material_name}}',
    width: 4.5,
    height: 6.0,
  };

  beforeEach(async () => {
    // Create mock model with all required methods
    mockModel = {
      create: jest.fn(),
      find: jest.fn() as jest.Mock<MockQueryChain, [filter?: MongoFilterArg]>,
      findById: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn() as jest.Mock<
        Promise<number>,
        [filter?: MongoFilterArg]
      >,
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelTemplateRepository,
        {
          provide: getModelToken(LabelTemplate.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<LabelTemplateRepository>(LabelTemplateRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new label template', async () => {
      // Provide a constructable model because repository.create uses `new`.
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LabelTemplateRepository,
          {
            provide: getModelToken(LabelTemplate.name),
            useValue: class {
              constructor(data: any) {
                Object.assign(this, data);
              }
              save = jest.fn().mockResolvedValue(mockLabelTemplateDoc);
            },
          },
        ],
      }).compile();

      const testRepository = module.get<LabelTemplateRepository>(
        LabelTemplateRepository,
      );
      const result = await testRepository.create(createLabelTemplateDto);

      expect(result).toEqual(mockLabelTemplateDoc);
    });
  });

  describe('findAll', () => {
    it('should return paginated label templates', async () => {
      const mockDocuments = [mockLabelTemplateDoc];
      const mockExec = jest.fn().mockResolvedValue(mockDocuments);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await repository.findAll(1, 20);

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockModel.find).toHaveBeenCalledWith();
      expect(mockChain.skip).toHaveBeenCalledWith(0);
      expect(mockChain.limit).toHaveBeenCalledWith(20);
      expect(mockChain.sort).toHaveBeenCalledWith({ created_date: -1 });
    });

    it('should calculate skip correctly for pagination', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(0);

      await repository.findAll(3, 10);

      expect(mockChain.skip).toHaveBeenCalledWith(20); // (3-1) * 10
    });

    it('should apply sorting by created_date descending', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(0);

      await repository.findAll(1, 20);

      expect(mockChain.sort).toHaveBeenCalledWith({ created_date: -1 });
    });
  });

  describe('findById', () => {
    it('should find a label template by _id', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockLabelTemplateDoc);
      mockModel.findById.mockReturnValue({ exec: mockExec });

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockLabelTemplateDoc);
      expect(mockModel.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should return null when template not found', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      mockModel.findById.mockReturnValue({ exec: mockExec });

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByTemplateId', () => {
    it('should find a label template by template_id', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockLabelTemplateDoc);
      mockModel.findOne.mockReturnValue({ exec: mockExec });

      const result = await repository.findByTemplateId('RAW-001');

      expect(result).toEqual(mockLabelTemplateDoc);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        template_id: 'RAW-001',
      });
    });

    it('should return null when template_id not found', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ exec: mockExec });

      const result = await repository.findByTemplateId('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByLabelType', () => {
    it('should find label templates by label_type with pagination', async () => {
      const mockDocuments = [mockLabelTemplateDoc];
      const mockExec = jest.fn().mockResolvedValue(mockDocuments);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await repository.findByLabelType('Raw Material', 1, 20);

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
      expect(mockModel.find).toHaveBeenCalledWith({
        label_type: 'Raw Material',
      });
      expect(mockChain.skip).toHaveBeenCalledWith(0);
      expect(mockChain.limit).toHaveBeenCalledWith(20);
    });

    it('should return empty array when no templates match label_type', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(0);

      const result = await repository.findByLabelType('Status', 1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('search', () => {
    it('should search by template_id using regex', async () => {
      const mockDocuments = [mockLabelTemplateDoc];
      const mockExec = jest.fn().mockResolvedValue(mockDocuments);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await repository.search('RAW', 1, 20);

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
      // Verify $or filter with regex
      const filter = mockModel.find.mock
        .calls[0][0] as unknown as MongoFilterArg;
      expect(filter.$or).toBeDefined();
      expect(filter.$or[0].template_id.$regex).toBe('RAW');
      expect(filter.$or[0].template_id.$options).toBe('i');
      expect(filter.$or[1].template_name.$regex).toBe('RAW');
      expect(filter.$or[1].template_name.$options).toBe('i');
    });

    it('should search by template_name using regex', async () => {
      const mockDocuments = [mockLabelTemplateDoc];
      const mockExec = jest.fn().mockResolvedValue(mockDocuments);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await repository.search('Material', 1, 20);

      expect(result.data).toEqual(mockDocuments);
      const filter = mockModel.find.mock
        .calls[0][0] as unknown as MongoFilterArg;
      expect(filter.$or).toBeDefined();
    });

    it('should support case-insensitive search', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(0);

      await repository.search('raw', 1, 20);

      const filter = mockModel.find.mock
        .calls[0][0] as unknown as MongoFilterArg;
      expect(filter.$or[0].template_id.$options).toBe('i');
    });
  });

  describe('update', () => {
    it('should update a label template', async () => {
      const updateDto: UpdateLabelTemplateDto = {
        template_name: 'Updated Raw Material Label',
      };
      const updatedDoc = {
        ...mockLabelTemplateDoc,
        template_name: 'Updated Raw Material Label',
      };
      const mockExec = jest.fn().mockResolvedValue(updatedDoc);
      mockModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      const result = await repository.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(result).toEqual(updatedDoc);
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { $set: updateDto },
        { new: true },
      );
    });

    it('should return null when template to update not found', async () => {
      const updateDto: UpdateLabelTemplateDto = { template_name: 'Updated' };
      const mockExec = jest.fn().mockResolvedValue(null);
      mockModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      const result = await repository.update('nonexistent-id', updateDto);

      expect(result).toBeNull();
    });

    it('should apply $set operator for update', async () => {
      const updateDto: UpdateLabelTemplateDto = {
        template_name: 'Updated',
        width: 5.0,
      };
      const mockExec = jest.fn().mockResolvedValue(mockLabelTemplateDoc);
      mockModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      await repository.update('507f1f77bcf86cd799439011', updateDto);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { $set: updateDto },
        { new: true },
      );
    });
  });

  describe('delete', () => {
    it('should delete a label template', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockLabelTemplateDoc);
      mockModel.findByIdAndDelete.mockReturnValue({ exec: mockExec });

      const result = await repository.delete('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockLabelTemplateDoc);
      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should return null when template to delete not found', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      mockModel.findByIdAndDelete.mockReturnValue({ exec: mockExec });

      const result = await repository.delete('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle pagination with page=1, limit=1', async () => {
      const mockExec = jest.fn().mockResolvedValue([mockLabelTemplateDoc]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(100);

      const result = await repository.findAll(1, 1);

      expect(mockChain.skip).toHaveBeenCalledWith(0);
      expect(mockChain.limit).toHaveBeenCalledWith(1);
      expect(result.total).toBe(100);
    });

    it('should handle large page numbers', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(5);

      const result = await repository.findAll(1000, 10);

      expect(mockChain.skip).toHaveBeenCalledWith(9990);
      expect(result.data).toEqual([]);
    });

    it('should handle search with special regex characters', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(0);

      await repository.search('[.*+?]', 1, 20);

      const filter = mockModel.find.mock
        .calls[0][0] as unknown as MongoFilterArg;
      expect(filter.$or[0].template_id.$regex).toBe('[.*+?]');
    });

    it('should handle search with unicode characters', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(0);

      await repository.search('Tiếng Việt', 1, 20);

      const filter = mockModel.find.mock
        .calls[0][0] as unknown as MongoFilterArg;
      expect(filter.$or).toBeDefined();
    });

    it('should handle concurrent findAll calls', async () => {
      const mockExec = jest.fn().mockResolvedValue([mockLabelTemplateDoc]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(1);

      const results = await Promise.all([
        repository.findAll(1, 10),
        repository.findAll(2, 10),
        repository.findAll(3, 10),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.total).toBe(1);
      });
    });

    it('should handle update with empty update object', async () => {
      const updateDto: UpdateLabelTemplateDto = {};
      const mockExec = jest.fn().mockResolvedValue(mockLabelTemplateDoc);
      mockModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      const result = await repository.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(result).toEqual(mockLabelTemplateDoc);
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { $set: {} },
        { new: true },
      );
    });

    it('should handle multiple rapid deletes', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockLabelTemplateDoc);
      mockModel.findByIdAndDelete.mockReturnValue({ exec: mockExec });

      const ids = ['id1', 'id2', 'id3'];
      const results = await Promise.all(ids.map((id) => repository.delete(id)));

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockLabelTemplateDoc);
      });
    });

    it('should handle findByLabelType with all valid types', async () => {
      const mockExec = jest.fn().mockResolvedValue([mockLabelTemplateDoc]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(1);

      const labelTypes: LabelType[] = [
        'Raw Material',
        'Sample',
        'Intermediate',
        'Finished Product',
        'API',
        'Status',
      ];

      for (const type of labelTypes) {
        const result = await repository.findByLabelType(type, 1, 20);
        expect(result.data).toHaveLength(1);
        expect(mockModel.find).toHaveBeenCalledWith({ label_type: type });
      }
    });

    it('should handle search pagination boundaries', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      mockModel.find.mockReturnValue(mockChain);
      mockModel.countDocuments.mockResolvedValue(25);

      // Test middle page
      await repository.search('query', 2, 10);
      expect(mockChain.skip).toHaveBeenCalledWith(10);

      // Test last page
      mockChain.skip.mockClear();
      await repository.search('query', 3, 10);
      expect(mockChain.skip).toHaveBeenCalledWith(20);
    });
  });

  describe('Parameterized tests for pagination', () => {
    interface PaginationTestCase {
      page: number;
      limit: number;
      expectedSkip: number;
    }

    const paginationTestCases: PaginationTestCase[] = [
      { page: 1, limit: 10, expectedSkip: 0 },
      { page: 2, limit: 10, expectedSkip: 10 },
      { page: 5, limit: 20, expectedSkip: 80 },
      { page: 100, limit: 1, expectedSkip: 99 },
      { page: 1, limit: 100, expectedSkip: 0 },
    ];

    paginationTestCases.forEach(({ page, limit, expectedSkip }) => {
      it(`should calculate skip as ${expectedSkip} for page ${page}, limit ${limit}`, async () => {
        const mockExec = jest.fn().mockResolvedValue([]);
        const mockChain = {
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: mockExec,
        };

        mockModel.find.mockReturnValue(mockChain);
        mockModel.countDocuments.mockResolvedValue(0);

        await repository.findAll(page, limit);

        expect(mockChain.skip).toHaveBeenCalledWith(expectedSkip);
      });
    });
  });

  describe('Large parameterized dataset coverage', () => {
    describe.each([
      { page: 1, limit: 1, totalRows: 1, dataCount: 1 },
      { page: 1, limit: 2, totalRows: 40, dataCount: 2 },
      { page: 1, limit: 5, totalRows: 37, dataCount: 5 },
      { page: 1, limit: 10, totalRows: 100, dataCount: 10 },
      { page: 2, limit: 10, totalRows: 100, dataCount: 10 },
      { page: 3, limit: 10, totalRows: 100, dataCount: 10 },
      { page: 4, limit: 10, totalRows: 100, dataCount: 10 },
      { page: 5, limit: 10, totalRows: 100, dataCount: 10 },
      { page: 6, limit: 10, totalRows: 55, dataCount: 5 },
      { page: 7, limit: 10, totalRows: 55, dataCount: 0 },
      { page: 2, limit: 25, totalRows: 60, dataCount: 25 },
      { page: 3, limit: 25, totalRows: 60, dataCount: 10 },
      { page: 10, limit: 10, totalRows: 95, dataCount: 5 },
      { page: 11, limit: 10, totalRows: 95, dataCount: 0 },
      { page: 50, limit: 20, totalRows: 1000, dataCount: 20 },
      { page: 51, limit: 20, totalRows: 1000, dataCount: 0 },
      { page: 100, limit: 1, totalRows: 500, dataCount: 1 },
      { page: 250, limit: 2, totalRows: 499, dataCount: 1 },
      { page: 400, limit: 5, totalRows: 1500, dataCount: 5 },
      { page: 1000, limit: 10, totalRows: 10000, dataCount: 10 },
    ])(
      'findAll matrix (page=$page, limit=$limit)',
      ({ page, limit, totalRows, dataCount }) => {
        it('should return pagination metadata and call chain with expected values', async () => {
          const mockExec = jest
            .fn()
            .mockResolvedValue(Array(dataCount).fill(mockLabelTemplateDoc));
          const mockChain = {
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            exec: mockExec,
          };

          mockModel.find.mockReturnValue(mockChain);
          mockModel.countDocuments.mockResolvedValue(totalRows);

          const result = await repository.findAll(page, limit);

          expect(mockModel.find).toHaveBeenCalledWith();
          expect(mockModel.countDocuments).toHaveBeenCalledWith();
          expect(mockChain.skip).toHaveBeenCalledWith((page - 1) * limit);
          expect(mockChain.limit).toHaveBeenCalledWith(limit);
          expect(mockChain.sort).toHaveBeenCalledWith({ created_date: -1 });
          expect(result.page).toBe(page);
          expect(result.limit).toBe(limit);
          expect(result.total).toBe(totalRows);
          expect(result.data).toHaveLength(dataCount);
        });
      },
    );

    it.each([
      'RAW',
      'raw',
      'Raw Material',
      'raw material',
      'Sample-001',
      'API_2026',
      'Batch #1',
      '  padded query  ',
      '0',
      '1234567890',
      'A.B*C+?',
      '[a-z]+',
      '^prefix',
      'suffix$',
      'Tiếng Việt',
      '日本語',
      '한국어',
      'مرحبا',
      'emoji-like-text-:-)',
      'long-query-'.repeat(5),
    ])(
      'search should build case-insensitive regex filter for query: %s',
      async (query) => {
        const mockExec = jest.fn().mockResolvedValue([mockLabelTemplateDoc]);
        const mockChain = {
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: mockExec,
        };

        mockModel.find.mockReturnValue(mockChain);
        mockModel.countDocuments.mockResolvedValue(1);

        const result = await repository.search(query, 3, 7);

        const filter = mockModel.find.mock
          .calls[0][0] as unknown as MongoFilterArg;
        expect(filter).toEqual({
          $or: [
            { template_id: { $regex: query, $options: 'i' } },
            { template_name: { $regex: query, $options: 'i' } },
          ],
        });
        expect(mockModel.countDocuments).toHaveBeenCalledWith(filter);
        expect(mockChain.skip).toHaveBeenCalledWith(14);
        expect(mockChain.limit).toHaveBeenCalledWith(7);
        expect(mockChain.sort).toHaveBeenCalledWith({ created_date: -1 });
        expect(result.page).toBe(3);
        expect(result.limit).toBe(7);
        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
      },
    );

    describe.each([
      { label_type: 'Raw Material', page: 1, limit: 20, totalRows: 5 },
      { label_type: 'Raw Material', page: 2, limit: 20, totalRows: 5 },
      { label_type: 'Sample', page: 1, limit: 10, totalRows: 20 },
      { label_type: 'Sample', page: 2, limit: 10, totalRows: 20 },
      { label_type: 'Intermediate', page: 1, limit: 5, totalRows: 30 },
      { label_type: 'Intermediate', page: 3, limit: 5, totalRows: 30 },
      { label_type: 'Finished Product', page: 1, limit: 25, totalRows: 25 },
      { label_type: 'Finished Product', page: 2, limit: 25, totalRows: 25 },
      { label_type: 'API', page: 1, limit: 1, totalRows: 2 },
      { label_type: 'API', page: 2, limit: 1, totalRows: 2 },
      { label_type: 'Status', page: 1, limit: 50, totalRows: 0 },
      { label_type: 'Status', page: 10, limit: 10, totalRows: 0 },
    ])(
      'findByLabelType matrix ($label_type, page=$page, limit=$limit)',
      ({ label_type, page, limit, totalRows }) => {
        it('should pass the same filter to find and countDocuments and preserve pagination fields', async () => {
          const mockExec = jest
            .fn()
            .mockResolvedValue(
              totalRows > 0 && page <= Math.ceil(totalRows / limit)
                ? [mockLabelTemplateDoc]
                : [],
            );
          const mockChain = {
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            exec: mockExec,
          };

          mockModel.find.mockReturnValue(mockChain);
          mockModel.countDocuments.mockResolvedValue(totalRows);

          const result = await repository.findByLabelType(
            label_type as LabelType,
            page,
            limit,
          );

          expect(mockModel.find).toHaveBeenCalledWith({ label_type });
          expect(mockModel.countDocuments).toHaveBeenCalledWith({ label_type });
          expect(mockChain.skip).toHaveBeenCalledWith((page - 1) * limit);
          expect(mockChain.limit).toHaveBeenCalledWith(limit);
          expect(result.page).toBe(page);
          expect(result.limit).toBe(limit);
          expect(result.total).toBe(totalRows);
        });
      },
    );

    it.each([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
      '507f1f77bcf86cd799439014',
      '507f1f77bcf86cd799439015',
      '507f1f77bcf86cd799439016',
      '507f1f77bcf86cd799439017',
      '507f1f77bcf86cd799439018',
      '507f1f77bcf86cd799439019',
      '507f1f77bcf86cd799439020',
      '507f1f77bcf86cd799439021',
      '507f1f77bcf86cd799439022',
    ])('delete should forward id to model: %s', async (id) => {
      const deletedDoc = {
        ...mockLabelTemplateDoc,
        template_id: `DEL-${id.slice(-3)}`,
      };
      const mockExec = jest.fn().mockResolvedValue(deletedDoc);
      mockModel.findByIdAndDelete.mockReturnValue({ exec: mockExec });

      const result = await repository.delete(id);

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(id);
      expect(result).toEqual(deletedDoc);
      expect(result?.template_id).toContain('DEL-');
    });

    describe.each([
      {
        id: '507f1f77bcf86cd799439101',
        payload: { template_name: 'Updated A' },
      },
      {
        id: '507f1f77bcf86cd799439102',
        payload: { template_content: 'Updated content A' },
      },
      {
        id: '507f1f77bcf86cd799439103',
        payload: { width: 5.5 },
      },
      {
        id: '507f1f77bcf86cd799439104',
        payload: { height: 7.25 },
      },
      {
        id: '507f1f77bcf86cd799439105',
        payload: { label_type: 'Sample' },
      },
      {
        id: '507f1f77bcf86cd799439106',
        payload: { template_name: 'Updated B', width: 6.25 },
      },
      {
        id: '507f1f77bcf86cd799439107',
        payload: { template_name: 'Updated C', height: 8.75 },
      },
      {
        id: '507f1f77bcf86cd799439108',
        payload: { template_content: 'Line1\nLine2\nLine3' },
      },
      {
        id: '507f1f77bcf86cd799439109',
        payload: { label_type: 'API', width: 2.5, height: 3.5 },
      },
      {
        id: '507f1f77bcf86cd799439110',
        payload: {
          template_name: 'Long Updated Name 2026',
          template_content: 'Material: {{material_name}} | Lot: {{lot_id}}',
        },
      },
    ])('update payload matrix (id=$id)', ({ id, payload }) => {
      it('should wrap payload with $set and request new document', async () => {
        const updatedDoc = { ...mockLabelTemplateDoc, ...payload };
        const mockExec = jest.fn().mockResolvedValue(updatedDoc);
        mockModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

        const result = await repository.update(
          id,
          payload as UpdateLabelTemplateDto,
        );

        expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
          id,
          { $set: payload },
          { new: true },
        );
        expect(result).toEqual(updatedDoc);
      });
    });
  });
});
