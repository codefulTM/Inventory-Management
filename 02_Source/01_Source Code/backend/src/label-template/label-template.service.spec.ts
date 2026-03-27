import { Test, TestingModule } from '@nestjs/testing';
import { LabelTemplateService } from './label-template.service';
import { LabelTemplateRepository } from './label-template.repository';
import {
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  GenerateLabelDto,
  LabelTemplateResponseDto,
  LabelType,
} from './label-template.dto';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { LabelTemplateDocument } from '../schemas/label-template.schema';

type PagedResult = {
  data: LabelTemplateDocument[];
  total: number;
  page: number;
  limit: number;
};

type MockedRepository = {
  create: jest.Mock;
  findAll: jest.Mock;
  findById: jest.Mock;
  findByTemplateId: jest.Mock;
  findByLabelType: jest.Mock;
  search: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

describe('LabelTemplateService', () => {
  let service: LabelTemplateService;
  let repository: MockedRepository;

  const mockObjectId = new Types.ObjectId();
  const mockLabelTemplateDoc = {
    _id: mockObjectId,
    template_id: 'RAW-001',
    template_name: 'Raw Material Label',
    label_type: 'Raw Material',
    template_content:
      'Material: {{material_name}}\nExpires: {{expiration_date}}',
    width: { toString: () => '4.50' },
    height: { toString: () => '6.00' },
    created_date: new Date('2026-03-10T10:00:00Z'),
    modified_date: new Date('2026-03-10T10:00:00Z'),
  };

  const createLabelTemplateDto: CreateLabelTemplateDto = {
    template_id: 'RAW-001',
    template_name: 'Raw Material Label',
    label_type: 'Raw Material',
    template_content:
      'Material: {{material_name}}\nExpires: {{expiration_date}}',
    width: 4.5,
    height: 6.0,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTemplateId: jest.fn(),
      findByLabelType: jest.fn(),
      search: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelTemplateService,
        {
          provide: 'LabelTemplateRepository',
          useValue: mockRepository,
        },
      ],
    })
      .useMocker((token) => {
        if (token === LabelTemplateRepository) {
          return mockRepository;
        }
      })
      .compile();

    service = module.get<LabelTemplateService>(LabelTemplateService);
    repository = module.get(LabelTemplateRepository);
  });

  describe('create', () => {
    it('should create a new label template successfully', async () => {
      jest.spyOn(repository, 'findByTemplateId').mockResolvedValue(null);
      jest
        .spyOn(repository, 'create')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.create(createLabelTemplateDto);

      expect(result.template_id).toBe('RAW-001');
      expect(result.template_name).toBe('Raw Material Label');
      expect(repository.create).toHaveBeenCalledWith(createLabelTemplateDto);
    });

    it('should throw ConflictException if template_id already exists', async () => {
      jest
        .spyOn(repository, 'findByTemplateId')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      await expect(service.create(createLabelTemplateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should call repository.findByTemplateId before creating', async () => {
      jest.spyOn(repository, 'findByTemplateId').mockResolvedValue(null);
      jest
        .spyOn(repository, 'create')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      await service.create(createLabelTemplateDto);

      expect(repository.findByTemplateId).toHaveBeenCalledWith('RAW-001');
    });
  });

  describe('findAll', () => {
    it('should return paginated label templates', async () => {
      const mockResult = {
        data: [mockLabelTemplateDoc],
        total: 1,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'findAll')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should use default page and limit', async () => {
      const mockResult = {
        data: [mockLabelTemplateDoc],
        total: 1,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'findAll')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(1, 20);
    });

    it('should throw BadRequestException if page < 1', async () => {
      await expect(service.findAll(0, 20)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if limit < 1', async () => {
      await expect(service.findAll(1, 0)).rejects.toThrow(BadRequestException);
    });

    it('should cap limit to 100', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
      };
      jest
        .spyOn(repository, 'findAll')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      await service.findAll(1, 150);

      expect(repository.findAll).toHaveBeenCalledWith(1, 100);
    });

    it('should calculate totalPages correctly', async () => {
      const mockResult = {
        data: Array(20).fill(mockLabelTemplateDoc),
        total: 100,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'findAll')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      const result = await service.findAll(1, 20);

      expect(result.totalPages).toBe(5);
    });
  });

  describe('findById', () => {
    it('should return a label template by id', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.findById(mockObjectId.toString());

      expect(result.template_id).toBe('RAW-001');
      expect(repository.findById).toHaveBeenCalledWith(mockObjectId.toString());
    });

    it('should throw NotFoundException if template not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should convert ObjectId to string in response', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.findById(mockObjectId.toString());

      expect(typeof result._id).toBe('string');
    });
  });

  describe('filterByType', () => {
    it('should filter templates by label type', async () => {
      const mockResult = {
        data: [mockLabelTemplateDoc],
        total: 1,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'findByLabelType')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      const result = await service.filterByType('Raw Material', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(repository.findByLabelType).toHaveBeenCalledWith(
        'Raw Material',
        1,
        20,
      );
    });

    it('should return empty array when no templates match type', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'findByLabelType')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      const result = await service.filterByType('Status', 1, 20);

      expect(result.data).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('search', () => {
    it('should search templates by query', async () => {
      const mockResult = {
        data: [mockLabelTemplateDoc],
        total: 1,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'search')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      const result = await service.search('RAW', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(repository.search).toHaveBeenCalledWith('RAW', 1, 20);
    });

    it('should return empty results for no matches', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'search')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      const result = await service.search('NOMATCH', 1, 20);

      expect(result.data).toHaveLength(0);
    });

    it('should calculate totalPages for search results', async () => {
      const mockResult = {
        data: Array(20).fill(mockLabelTemplateDoc),
        total: 150,
        page: 1,
        limit: 20,
      };
      jest
        .spyOn(repository, 'search')
        .mockResolvedValue(mockResult as unknown as PagedResult);

      const result = await service.search('query', 1, 20);

      expect(result.totalPages).toBe(8);
    });
  });

  describe('update', () => {
    it('should update a label template', async () => {
      const updateDto: UpdateLabelTemplateDto = {
        template_name: 'Updated Name',
      };
      const updatedDoc = {
        ...mockLabelTemplateDoc,
        template_name: 'Updated Name',
      };
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );
      jest
        .spyOn(repository, 'update')
        .mockResolvedValue(updatedDoc as unknown as LabelTemplateDocument);

      const result = await service.update(mockObjectId.toString(), updateDto);

      expect(result.template_name).toBe('Updated Name');
      expect(repository.update).toHaveBeenCalledWith(
        mockObjectId.toString(),
        updateDto,
      );
    });

    it('should throw NotFoundException if template not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle partial updates', async () => {
      const partialDto: UpdateLabelTemplateDto = {
        width: 5.0,
      };
      const updatedDoc = {
        ...mockLabelTemplateDoc,
        width: { toString: () => '5.00' },
      };
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );
      jest
        .spyOn(repository, 'update')
        .mockResolvedValue(updatedDoc as unknown as LabelTemplateDocument);

      await service.update(mockObjectId.toString(), partialDto);

      expect(repository.update).toHaveBeenCalledWith(
        mockObjectId.toString(),
        partialDto,
      );
    });
  });

  describe('delete', () => {
    it('should delete a label template', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );
      jest
        .spyOn(repository, 'delete')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.delete(mockObjectId.toString());

      expect(result.message).toContain('RAW-001');
      expect(repository.delete).toHaveBeenCalledWith(mockObjectId.toString());
    });

    it('should throw NotFoundException if template not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should preserve template_id in delete response', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );
      jest
        .spyOn(repository, 'delete')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.delete(mockObjectId.toString());

      expect(result.message).toContain(mockLabelTemplateDoc.template_id);
    });
  });

  describe('generateLabel', () => {
    it('should generate label with placeholder replacement', async () => {
      const generateDto: GenerateLabelDto = {
        template_id: 'RAW-001',
      };
      jest
        .spyOn(repository, 'findByTemplateId')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.generateLabel(generateDto);

      expect(result.populatedContent).toBeDefined();
      expect(result.sourceData).toBeDefined();
      expect(result.template).toBeDefined();
    });

    it('should throw NotFoundException if template not found', async () => {
      jest.spyOn(repository, 'findByTemplateId').mockResolvedValue(null);

      await expect(
        service.generateLabel({ template_id: 'NONEXISTENT' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle lot_id in generated label', async () => {
      const generateDto: GenerateLabelDto = {
        template_id: 'RAW-001',
        lot_id: 'LOT-CUSTOM',
      };
      jest
        .spyOn(repository, 'findByTemplateId')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.generateLabel(generateDto);

      expect(result.sourceData).toHaveProperty('lot_id');
    });

    it('should generate ISO 8601 timestamp', async () => {
      jest
        .spyOn(repository, 'findByTemplateId')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.generateLabel({ template_id: 'RAW-001' });

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z?$/;
      expect(result.generatedAt).toMatch(iso8601Regex);
    });

    it('should handle static templates without placeholders', async () => {
      const staticDoc = {
        ...mockLabelTemplateDoc,
        template_content: 'Static text no placeholders',
      };
      jest
        .spyOn(repository, 'findByTemplateId')
        .mockResolvedValue(staticDoc as unknown as LabelTemplateDocument);

      const result = await service.generateLabel({ template_id: 'RAW-001' });

      expect(result.populatedContent).toBe('Static text no placeholders');
    });
  });

  describe('Response DTO transformation', () => {
    it('should convert ObjectId to string in response', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.findById(mockObjectId.toString());

      expect(typeof result._id).toBe('string');
    });

    it('should convert Decimal128 values to numbers', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.findById(mockObjectId.toString());

      expect(typeof result.width).toBe('number');
      expect(typeof result.height).toBe('number');
    });

    it('should include all required fields in response', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValue(
          mockLabelTemplateDoc as unknown as LabelTemplateDocument,
        );

      const result = await service.findById(mockObjectId.toString());

      expect(result._id).toBeDefined();
      expect(result.template_id).toBeDefined();
      expect(result.template_name).toBeDefined();
      expect(result.label_type).toBeDefined();
      expect(result.template_content).toBeDefined();
      expect(result.width).toBeDefined();
      expect(result.height).toBeDefined();
    });
  });

  describe('Large parameterized dataset coverage', () => {
    describe.each([
      { total: 0, limit: 1, expectedPages: 0 },
      { total: 1, limit: 1, expectedPages: 1 },
      { total: 2, limit: 1, expectedPages: 2 },
      { total: 9, limit: 10, expectedPages: 1 },
      { total: 10, limit: 10, expectedPages: 1 },
      { total: 11, limit: 10, expectedPages: 2 },
      { total: 19, limit: 10, expectedPages: 2 },
      { total: 20, limit: 10, expectedPages: 2 },
      { total: 21, limit: 10, expectedPages: 3 },
      { total: 99, limit: 20, expectedPages: 5 },
      { total: 100, limit: 20, expectedPages: 5 },
      { total: 101, limit: 20, expectedPages: 6 },
      { total: 500, limit: 50, expectedPages: 10 },
      { total: 999, limit: 100, expectedPages: 10 },
      { total: 1000, limit: 100, expectedPages: 10 },
      { total: 1001, limit: 100, expectedPages: 11 },
      { total: 2500, limit: 25, expectedPages: 100 },
      { total: 2501, limit: 25, expectedPages: 101 },
    ])(
      'findAll totalPages matrix (total=$total, limit=$limit)',
      ({ total, limit, expectedPages }) => {
        it('should return computed totalPages and preserve metadata', async () => {
          const page = 1;
          jest.spyOn(repository, 'findAll').mockResolvedValue({
            data: Array(Math.min(total, limit)).fill(mockLabelTemplateDoc),
            total,
            page,
            limit,
          } as unknown as PagedResult);

          const result = await service.findAll(page, limit);

          expect(result.total).toBe(total);
          expect(result.limit).toBe(limit);
          expect(result.page).toBe(page);
          expect(result.totalPages).toBe(expectedPages);
          expect(result.data.length).toBeLessThanOrEqual(limit);
        });
      },
    );

    it.each([
      { inputLimit: 1, expectedLimit: 1 },
      { inputLimit: 5, expectedLimit: 5 },
      { inputLimit: 20, expectedLimit: 20 },
      { inputLimit: 50, expectedLimit: 50 },
      { inputLimit: 99, expectedLimit: 99 },
      { inputLimit: 100, expectedLimit: 100 },
      { inputLimit: 101, expectedLimit: 100 },
      { inputLimit: 120, expectedLimit: 100 },
      { inputLimit: 150, expectedLimit: 100 },
      { inputLimit: 500, expectedLimit: 100 },
      { inputLimit: 1000, expectedLimit: 100 },
    ])(
      'findAll should normalize limit from $inputLimit to $expectedLimit',
      async ({ inputLimit, expectedLimit }) => {
        jest
          .spyOn(repository, 'findAll')
          .mockImplementation((page: number, limit: number) =>
            Promise.resolve({
              data: [] as LabelTemplateDocument[],
              total: 0,
              page,
              limit,
            }),
          );

        const result = await service.findAll(2, inputLimit);

        expect(repository.findAll).toHaveBeenCalledWith(2, expectedLimit);
        expect(result.limit).toBe(expectedLimit);
        expect(result.totalPages).toBe(0);
      },
    );

    it.each([
      { page: 0, limit: 20, message: 'Page must be >= 1' },
      { page: -1, limit: 20, message: 'Page must be >= 1' },
      { page: -50, limit: 20, message: 'Page must be >= 1' },
      { page: 1, limit: 0, message: 'Limit must be >= 1' },
      { page: 1, limit: -1, message: 'Limit must be >= 1' },
      { page: 5, limit: -20, message: 'Limit must be >= 1' },
    ])(
      'findAll should reject invalid pagination page=$page limit=$limit',
      async ({ page, limit, message }) => {
        await expect(service.findAll(page, limit)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.findAll(page, limit)).rejects.toThrow(message);
        expect(repository.findAll).not.toHaveBeenCalled();
      },
    );

    it.each([
      'RAW-001',
      'RAW-002',
      'SMP-001',
      'SMP-002',
      'INT-001',
      'FIN-001',
      'API-001',
      'STS-001',
      'TEMPLATE-A',
      'TEMPLATE-B',
      'DUP-ALPHA',
      'DUP-BETA',
    ])(
      'create should reject duplicate template_id: %s',
      async (template_id) => {
        const dto: CreateLabelTemplateDto = {
          ...createLabelTemplateDto,
          template_id,
        };
        jest
          .spyOn(repository, 'findByTemplateId')
          .mockResolvedValue(
            mockLabelTemplateDoc as unknown as LabelTemplateDocument,
          );

        await expect(service.create(dto)).rejects.toThrow(ConflictException);
        expect(repository.findByTemplateId).toHaveBeenCalledWith(template_id);
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    describe.each([
      { label_type: 'Raw Material', width: 4.5, height: 6.0 },
      { label_type: 'Sample', width: 2.5, height: 3.5 },
      { label_type: 'Intermediate', width: 9.5, height: 12.0 },
      { label_type: 'Finished Product', width: 7.25, height: 11.5 },
      { label_type: 'API', width: 1.0, height: 2.0 },
      { label_type: 'Status', width: 0.5, height: 1.5 },
    ])(
      'create success matrix for type=$label_type',
      ({ label_type, width, height }) => {
        it('should map repository document into response dto correctly', async () => {
          const dto: CreateLabelTemplateDto = {
            ...createLabelTemplateDto,
            template_id: `${String(label_type).slice(0, 3).toUpperCase()}-${Math.floor(width * 100)}`,
            label_type: label_type as LabelType,
            width,
            height,
          };
          const createdDoc = {
            ...mockLabelTemplateDoc,
            template_id: dto.template_id,
            label_type,
            width: { toString: () => String(width) },
            height: { toString: () => String(height) },
          };

          jest.spyOn(repository, 'findByTemplateId').mockResolvedValue(null);
          jest
            .spyOn(repository, 'create')
            .mockResolvedValue(createdDoc as unknown as LabelTemplateDocument);

          const result = await service.create(dto);

          expect(repository.findByTemplateId).toHaveBeenCalledWith(
            dto.template_id,
          );
          expect(repository.create).toHaveBeenCalledWith(dto);
          expect(result.template_id).toBe(dto.template_id);
          expect(result.label_type).toBe(label_type);
          expect(result.width).toBeCloseTo(width, 5);
          expect(result.height).toBeCloseTo(height, 5);
          expect(typeof result._id).toBe('string');
        });
      },
    );

    describe.each([
      {
        label_type: 'Raw Material',
        total: 50,
        page: 1,
        limit: 20,
        expectedPages: 3,
      },
      { label_type: 'Sample', total: 20, page: 2, limit: 10, expectedPages: 2 },
      {
        label_type: 'Intermediate',
        total: 0,
        page: 1,
        limit: 20,
        expectedPages: 0,
      },
      {
        label_type: 'Finished Product',
        total: 101,
        page: 6,
        limit: 20,
        expectedPages: 6,
      },
      { label_type: 'API', total: 5, page: 5, limit: 1, expectedPages: 5 },
      {
        label_type: 'Status',
        total: 200,
        page: 4,
        limit: 50,
        expectedPages: 4,
      },
    ])(
      'filterByType matrix for $label_type',
      ({ label_type, total, page, limit, expectedPages }) => {
        it('should preserve filters and compute total pages', async () => {
          jest.spyOn(repository, 'findByLabelType').mockResolvedValue({
            data: total > 0 ? [mockLabelTemplateDoc] : [],
            total,
            page,
            limit,
          } as unknown as PagedResult);

          const result = await service.filterByType(
            label_type as LabelType,
            page,
            limit,
          );

          expect(repository.findByLabelType).toHaveBeenCalledWith(
            label_type,
            page,
            limit,
          );
          expect(result.total).toBe(total);
          expect(result.page).toBe(page);
          expect(result.limit).toBe(limit);
          expect(result.totalPages).toBe(expectedPages);
        });
      },
    );

    it.each([
      { query: 'RAW', page: 1, limit: 20, total: 200, expectedPages: 10 },
      { query: 'raw', page: 2, limit: 20, total: 200, expectedPages: 10 },
      { query: 'Sample', page: 1, limit: 5, total: 12, expectedPages: 3 },
      {
        query: 'Intermediate',
        page: 3,
        limit: 10,
        total: 25,
        expectedPages: 3,
      },
      { query: 'API-001', page: 1, limit: 1, total: 3, expectedPages: 3 },
      { query: 'Status', page: 1, limit: 100, total: 101, expectedPages: 2 },
      { query: 'Special!@#$%', page: 1, limit: 20, total: 0, expectedPages: 0 },
      { query: 'Tiếng Việt', page: 1, limit: 20, total: 2, expectedPages: 1 },
      { query: '日本語', page: 1, limit: 20, total: 2, expectedPages: 1 },
      {
        query: '  padded query  ',
        page: 2,
        limit: 7,
        total: 20,
        expectedPages: 3,
      },
    ])(
      'search matrix query=$query page=$page limit=$limit',
      async ({ query, page, limit, total, expectedPages }) => {
        jest.spyOn(repository, 'search').mockResolvedValue({
          data: total > 0 ? [mockLabelTemplateDoc] : [],
          total,
          page,
          limit,
        } as unknown as PagedResult);

        const result = await service.search(query, page, limit);

        expect(repository.search).toHaveBeenCalledWith(query, page, limit);
        expect(result.total).toBe(total);
        expect(result.page).toBe(page);
        expect(result.limit).toBe(limit);
        expect(result.totalPages).toBe(expectedPages);
      },
    );

    describe.each([
      { id: 'id-001', payload: { template_name: 'Name A' } },
      { id: 'id-002', payload: { template_content: 'Content A' } },
      { id: 'id-003', payload: { width: 5.5 } },
      { id: 'id-004', payload: { height: 7.75 } },
      { id: 'id-005', payload: { label_type: 'Sample' } },
      { id: 'id-006', payload: { template_name: 'Name B', width: 3.5 } },
      { id: 'id-007', payload: { template_name: 'Name C', height: 8.25 } },
      { id: 'id-008', payload: { template_content: 'Line1\nLine2\nLine3' } },
      { id: 'id-009', payload: { label_type: 'API', width: 2.5, height: 4.5 } },
      {
        id: 'id-010',
        payload: {
          template_name: 'Longer Name 2026',
          template_content: 'Material: {{material_name}} | Lot: {{lot_id}}',
        },
      },
    ])('update matrix id=$id', ({ id, payload }) => {
      it('should verify existence then delegate update with payload', async () => {
        const updatedDoc = {
          ...mockLabelTemplateDoc,
          ...payload,
          width:
            payload.width !== undefined
              ? { toString: () => String(payload.width) }
              : mockLabelTemplateDoc.width,
          height:
            payload.height !== undefined
              ? { toString: () => String(payload.height) }
              : mockLabelTemplateDoc.height,
        };

        jest
          .spyOn(repository, 'findById')
          .mockResolvedValue(
            mockLabelTemplateDoc as unknown as LabelTemplateDocument,
          );
        jest
          .spyOn(repository, 'update')
          .mockResolvedValue(updatedDoc as unknown as LabelTemplateDocument);

        const result = await service.update(
          id,
          payload as UpdateLabelTemplateDto,
        );

        expect(repository.findById).toHaveBeenCalledWith(id);
        expect(repository.update).toHaveBeenCalledWith(id, payload);
        if (payload.template_name !== undefined) {
          expect(result.template_name).toBe(payload.template_name);
        }
        if (payload.label_type !== undefined) {
          expect(result.label_type).toBe(payload.label_type);
        }
        if (payload.width !== undefined) {
          expect(result.width).toBeCloseTo(payload.width, 5);
        }
        if (payload.height !== undefined) {
          expect(result.height).toBeCloseTo(payload.height, 5);
        }
      });
    });

    it.each([
      { id: 'delete-001', template_id: 'RAW-001' },
      { id: 'delete-002', template_id: 'RAW-002' },
      { id: 'delete-003', template_id: 'SMP-001' },
      { id: 'delete-004', template_id: 'INT-001' },
      { id: 'delete-005', template_id: 'FIN-001' },
      { id: 'delete-006', template_id: 'API-001' },
      { id: 'delete-007', template_id: 'STS-001' },
      { id: 'delete-008', template_id: 'LAB-001' },
      { id: 'delete-009', template_id: 'LAB-002' },
      { id: 'delete-010', template_id: 'LAB-003' },
    ])(
      'delete matrix should include template id in response message',
      async ({ id, template_id }) => {
        const existingDoc = { ...mockLabelTemplateDoc, template_id };
        jest
          .spyOn(repository, 'findById')
          .mockResolvedValue(existingDoc as unknown as LabelTemplateDocument);
        jest
          .spyOn(repository, 'delete')
          .mockResolvedValue(existingDoc as unknown as LabelTemplateDocument);

        const result = await service.delete(id);

        expect(repository.findById).toHaveBeenCalledWith(id);
        expect(repository.delete).toHaveBeenCalledWith(id);
        expect(result.message).toContain(template_id);
        expect(result.message.toLowerCase()).toContain('deleted');
      },
    );

    describe.each([
      {
        name: 'default lot source',
        dto: { template_id: 'RAW-001' } as GenerateLabelDto,
        expectedKey: 'lot_id',
        expectedValue: 'LOT-MOCK-001',
      },
      {
        name: 'explicit lot source',
        dto: {
          template_id: 'RAW-001',
          lot_id: 'LOT-CUSTOM-001',
        } as GenerateLabelDto,
        expectedKey: 'lot_id',
        expectedValue: 'LOT-CUSTOM-001',
      },
      {
        name: 'batch source',
        dto: {
          template_id: 'RAW-001',
          batch_id: 'BATCH-CUSTOM-001',
        } as GenerateLabelDto,
        expectedKey: 'batch_id',
        expectedValue: 'BATCH-CUSTOM-001',
      },
      {
        name: 'lot takes precedence over batch',
        dto: {
          template_id: 'RAW-001',
          lot_id: 'LOT-FIRST-001',
          batch_id: 'BATCH-IGNORED-001',
        } as GenerateLabelDto,
        expectedKey: 'lot_id',
        expectedValue: 'LOT-FIRST-001',
      },
    ])(
      'generateLabel source selection: $name',
      ({ dto, expectedKey, expectedValue }) => {
        it('should select source data branch and build complete response object', async () => {
          jest
            .spyOn(repository, 'findByTemplateId')
            .mockResolvedValue(
              mockLabelTemplateDoc as unknown as LabelTemplateDocument,
            );

          const result = await service.generateLabel(dto);

          expect(repository.findByTemplateId).toHaveBeenCalledWith(
            dto.template_id,
          );
          expect(result.template.template_id).toBe(dto.template_id);
          expect(result.sourceData).toHaveProperty(expectedKey, expectedValue);
          expect(result.populatedContent).toContain('Expires:');
          expect(typeof result.generatedAt).toBe('string');
        });
      },
    );

    describe.each([
      {
        name: 'repeated placeholders',
        template: 'LOT={{lot_id}}|LOT2={{lot_id}}|LOT3={{lot_id}}',
        dto: { template_id: 'RAW-001', lot_id: 'LOT-XYZ' } as GenerateLabelDto,
        expected: ['LOT=LOT-XYZ', 'LOT2=LOT-XYZ', 'LOT3=LOT-XYZ'],
      },
      {
        name: 'missing placeholder stays unchanged',
        template: 'UNKNOWN={{unknown_key}}',
        dto: { template_id: 'RAW-001' } as GenerateLabelDto,
        expected: ['UNKNOWN={{unknown_key}}'],
      },
      {
        name: 'no placeholders unchanged',
        template: 'Static content only',
        dto: { template_id: 'RAW-001' } as GenerateLabelDto,
        expected: ['Static content only'],
      },
      {
        name: 'mixed known and unknown placeholders',
        template: '{{material_name}}|{{unknown}}|{{expiration_date}}',
        dto: { template_id: 'RAW-001' } as GenerateLabelDto,
        expected: ['Acetaminophen API', '{{unknown}}', '2027-11-15'],
      },
      {
        name: 'batch placeholders with batch source',
        template: '{{batch_id}}|{{batch_number}}|{{status}}',
        dto: {
          template_id: 'RAW-001',
          batch_id: 'BATCH-999',
        } as GenerateLabelDto,
        expected: ['BATCH-999', 'PB-2025-0001', 'Complete'],
      },
      {
        name: 'placeholder with dash should not match regex',
        template: '{{lot-id}}|{{lot_id}}',
        dto: { template_id: 'RAW-001', lot_id: 'LOT-ABC' } as GenerateLabelDto,
        expected: ['{{lot-id}}', 'LOT-ABC'],
      },
      {
        name: 'placeholder with numbers',
        template: '{{material_id}}|{{product_id}}',
        dto: {
          template_id: 'RAW-001',
          batch_id: 'BATCH-001',
        } as GenerateLabelDto,
        expected: ['{{material_id}}', 'MAT-PROD-001'],
      },
      {
        name: 'newline placeholders',
        template: 'A={{lot_id}}\nB={{expiration_date}}\nC={{status}}',
        dto: {
          template_id: 'RAW-001',
          lot_id: 'LOT-NL-001',
        } as GenerateLabelDto,
        expected: ['A=LOT-NL-001', 'B=2027-11-15', 'C=Quarantine'],
      },
    ])(
      'generateLabel content population: $name',
      ({ template, dto, expected }) => {
        it('should replace placeholders according to source data and preserve unmatched tokens', async () => {
          const doc = { ...mockLabelTemplateDoc, template_content: template };
          jest
            .spyOn(repository, 'findByTemplateId')
            .mockResolvedValue(doc as unknown as LabelTemplateDocument);

          const result = await service.generateLabel(dto);

          expected.forEach((token: string) => {
            expect(result.populatedContent).toContain(token);
          });
          expect(result.template.template_content).toBe(template);
          expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
      },
    );

    describe.each([
      { widthString: '0.01', heightString: '0.01', width: 0.01, height: 0.01 },
      { widthString: '1', heightString: '2', width: 1, height: 2 },
      { widthString: '4.50', heightString: '6.00', width: 4.5, height: 6 },
      {
        widthString: '9.999',
        heightString: '12.125',
        width: 9.999,
        height: 12.125,
      },
      {
        widthString: '99.99',
        heightString: '99.99',
        width: 99.99,
        height: 99.99,
      },
    ])(
      'findById numeric conversion matrix width=$widthString height=$heightString',
      ({ widthString, heightString, width, height }) => {
        it('should parse width and height into numbers', async () => {
          const doc = {
            ...mockLabelTemplateDoc,
            width: { toString: () => widthString },
            height: { toString: () => heightString },
          };
          jest
            .spyOn(repository, 'findById')
            .mockResolvedValue(doc as unknown as LabelTemplateDocument);

          const result: LabelTemplateResponseDto = await service.findById(
            mockObjectId.toString(),
          );

          expect(result.width).toBeCloseTo(width, 5);
          expect(result.height).toBeCloseTo(height, 5);
          expect(typeof result.width).toBe('number');
          expect(typeof result.height).toBe('number');
        });
      },
    );
  });
});
