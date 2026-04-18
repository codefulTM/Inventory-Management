import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { LabelTemplateController } from './label-template.controller';
import { LabelTemplateService } from './label-template.service';
import {
  CreateLabelTemplateDto,
  GenerateLabelDto,
  LabelTemplateResponseDto,
  LabelType,
  LabelTypeValues,
  PaginatedLabelTemplateResponseDto,
  UpdateLabelTemplateDto,
} from './label-template.dto';

type GeneratedLabelResponse = {
  template: LabelTemplateResponseDto;
  populatedContent: string;
  sourceData: Record<string, unknown>;
  generatedAt: string;
};

type MockedService = {
  findAll: jest.Mock<
    Promise<PaginatedLabelTemplateResponseDto>,
    [page?: number, limit?: number]
  >;
  search: jest.Mock<
    Promise<PaginatedLabelTemplateResponseDto>,
    [query: string, page?: number, limit?: number]
  >;
  filterByType: jest.Mock<
    Promise<PaginatedLabelTemplateResponseDto>,
    [labelType: LabelType, page?: number, limit?: number]
  >;
  findById: jest.Mock<Promise<LabelTemplateResponseDto>, [id: string]>;
  create: jest.Mock<
    Promise<LabelTemplateResponseDto>,
    [dto: CreateLabelTemplateDto]
  >;
  generateLabel: jest.Mock<
    Promise<GeneratedLabelResponse>,
    [dto: GenerateLabelDto]
  >;
  update: jest.Mock<
    Promise<LabelTemplateResponseDto>,
    [id: string, dto: UpdateLabelTemplateDto]
  >;
  delete: jest.Mock<Promise<{ message: string }>, [id: string]>;
};

const templateResponse: LabelTemplateResponseDto = {
  _id: '507f1f77bcf86cd799439011',
  template_id: 'RAW-001',
  template_name: 'Raw Material Label',
  label_type: 'Raw Material',
  template_content: 'Material: {{material_name}}',
  width: 4.5,
  height: 6,
  created_date: new Date('2026-03-10T10:00:00Z'),
  modified_date: new Date('2026-03-10T10:00:00Z'),
};

function createPaginatedResponse(
  overrides: Partial<PaginatedLabelTemplateResponseDto> = {},
): PaginatedLabelTemplateResponseDto {
  return {
    data: [templateResponse],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    ...overrides,
  };
}

function createGeneratedLabelResponse(
  overrides: Partial<GeneratedLabelResponse> = {},
): GeneratedLabelResponse {
  return {
    template: templateResponse,
    populatedContent: 'Material: Acetaminophen API',
    sourceData: { material_name: 'Acetaminophen API' },
    generatedAt: '2026-03-13T01:00:00.000Z',
    ...overrides,
  };
}

function createMockedService(): MockedService {
  return {
    findAll: jest.fn<
      Promise<PaginatedLabelTemplateResponseDto>,
      [page?: number, limit?: number]
    >(),
    search: jest.fn<
      Promise<PaginatedLabelTemplateResponseDto>,
      [query: string, page?: number, limit?: number]
    >(),
    filterByType: jest.fn<
      Promise<PaginatedLabelTemplateResponseDto>,
      [labelType: LabelType, page?: number, limit?: number]
    >(),
    findById: jest.fn<Promise<LabelTemplateResponseDto>, [id: string]>(),
    create: jest.fn<
      Promise<LabelTemplateResponseDto>,
      [dto: CreateLabelTemplateDto]
    >(),
    generateLabel: jest.fn<
      Promise<GeneratedLabelResponse>,
      [dto: GenerateLabelDto]
    >(),
    update: jest.fn<
      Promise<LabelTemplateResponseDto>,
      [id: string, dto: UpdateLabelTemplateDto]
    >(),
    delete: jest.fn<Promise<{ message: string }>, [id: string]>(),
  };
}

describe('LabelTemplateController', () => {
  let controller: LabelTemplateController;
  let service: MockedService;

  beforeEach(async () => {
    const mockService = createMockedService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabelTemplateController],
      providers: [
        {
          provide: LabelTemplateService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<LabelTemplateController>(LabelTemplateController);
    service = module.get<MockedService>(LabelTemplateService);
  });

  describe('route metadata', () => {
    it('should register the controller path', () => {
      expect(Reflect.getMetadata(PATH_METADATA, LabelTemplateController)).toBe(
        'label-templates',
      );
    });

    it.each([
      {
        name: 'findAll',
        methodName: 'findAll',
        method: RequestMethod.GET,
        status: HttpStatus.OK,
      },
      {
        name: 'search',
        methodName: 'search',
        path: 'search',
        method: RequestMethod.GET,
        status: HttpStatus.OK,
      },
      {
        name: 'getTypes',
        methodName: 'getTypes',
        path: 'types',
        method: RequestMethod.GET,
        status: HttpStatus.OK,
      },
      {
        name: 'filterByType',
        methodName: 'filterByType',
        path: 'type/:type',
        method: RequestMethod.GET,
        status: HttpStatus.OK,
      },
      {
        name: 'findOne',
        methodName: 'findOne',
        path: ':id',
        method: RequestMethod.GET,
        status: HttpStatus.OK,
      },
      {
        name: 'create',
        methodName: 'create',
        method: RequestMethod.POST,
        status: HttpStatus.CREATED,
      },
      {
        name: 'generate',
        methodName: 'generate',
        path: 'generate',
        method: RequestMethod.POST,
        status: HttpStatus.OK,
      },
      {
        name: 'update',
        methodName: 'update',
        path: ':id',
        method: RequestMethod.PUT,
        status: HttpStatus.OK,
      },
      {
        name: 'remove',
        methodName: 'remove',
        path: ':id',
        method: RequestMethod.DELETE,
        status: HttpStatus.OK,
      },
    ])(
      'should register correct metadata for $name',
      ({ methodName, path, method, status }) => {
        const handler = Object.getOwnPropertyDescriptor(
          LabelTemplateController.prototype,
          methodName,
        )?.value as (...args: unknown[]) => unknown;

        if (path !== undefined) {
          expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
        }
        expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
        expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
      },
    );
  });

  describe('findAll', () => {
    it('should use default pagination when called without arguments', async () => {
      const response = createPaginatedResponse();
      service.findAll.mockResolvedValue(response);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(response);
    });

    it.each([
      { page: 1, limit: 1, total: 1, totalPages: 1 },
      { page: 1, limit: 10, total: 99, totalPages: 10 },
      { page: 2, limit: 10, total: 99, totalPages: 10 },
      { page: 5, limit: 20, total: 101, totalPages: 6 },
      { page: 10, limit: 10, total: 200, totalPages: 20 },
      { page: 50, limit: 2, total: 100, totalPages: 50 },
      { page: 100, limit: 1, total: 100, totalPages: 100 },
      { page: 3, limit: 25, total: 60, totalPages: 3 },
    ])(
      'should forward page=$page and limit=$limit',
      async ({ page, limit, total, totalPages }) => {
        const response = createPaginatedResponse({
          data: Array.from({ length: Math.min(limit, 3) }, (_, index) => ({
            ...templateResponse,
            _id: `id-${page}-${limit}-${index}`,
          })),
          total,
          page,
          limit,
          totalPages,
        });
        service.findAll.mockResolvedValue(response);

        const result = await controller.findAll(page, limit);

        expect(service.findAll).toHaveBeenCalledWith(page, limit);
        expect(result.page).toBe(page);
        expect(result.limit).toBe(limit);
        expect(result.totalPages).toBe(totalPages);
      },
    );
  });

  describe('search', () => {
    it.each([undefined, null, ''])(
      'should reject missing search query: %p',
      (query) => {
        expect(() =>
          controller.search(query as unknown as string, 1, 20),
        ).toThrow(
          new BadRequestException('Search query parameter (q) is required'),
        );
      },
    );

    it.each([
      { query: 'RAW', page: 1, limit: 20 },
      { query: 'raw', page: 2, limit: 10 },
      { query: 'Sample', page: 1, limit: 5 },
      { query: 'Status', page: 4, limit: 50 },
      { query: 'Tiếng Việt', page: 1, limit: 20 },
      { query: '日本語', page: 1, limit: 20 },
      { query: 'API-001', page: 3, limit: 7 },
      { query: 'Special!@#$%', page: 2, limit: 15 },
      { query: '  padded query  ', page: 2, limit: 7 },
      { query: '[a-z]+', page: 1, limit: 100 },
    ])(
      'should forward query=$query page=$page limit=$limit',
      async ({ query, page, limit }) => {
        const response = createPaginatedResponse({ page, limit });
        service.search.mockResolvedValue(response);

        const result = await controller.search(query, page, limit);

        expect(service.search).toHaveBeenCalledWith(query, page, limit);
        expect(result).toEqual(response);
      },
    );
  });

  describe('getTypes', () => {
    it('should return all available label types', () => {
      expect(controller.getTypes()).toEqual({ types: LabelTypeValues });
    });
  });

  describe('filterByType', () => {
    it.each(LabelTypeValues)(
      'should accept valid label type %s',
      async (labelType) => {
        const response = createPaginatedResponse();
        service.filterByType.mockResolvedValue(response);

        const result = await controller.filterByType(labelType, 1, 20);

        expect(service.filterByType).toHaveBeenCalledWith(labelType, 1, 20);
        expect(result).toEqual(response);
      },
    );

    it.each([
      'Invalid',
      'raw material',
      'RAW MATERIAL',
      'Status ',
      ' Sample',
      'FinishedProduct',
      'API-1',
      '123',
      '',
    ])('should reject invalid label type %s', (labelType) => {
      expect(() => controller.filterByType(labelType, 1, 20)).toThrow(
        BadRequestException,
      );
      expect(() => controller.filterByType(labelType, 1, 20)).toThrow(
        `Invalid label_type. Valid values: ${LabelTypeValues.join(', ')}`,
      );
    });
  });

  describe('findOne', () => {
    it.each([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      'id-001',
      'id-002',
      'mongo-object-id-like-value',
      'template-lookup-id',
      'with-dashes-and-123',
      'UPPER-lower-001',
    ])('should forward id %s', async (id) => {
      service.findById.mockResolvedValue({ ...templateResponse, _id: id });

      const result = await controller.findOne(id);

      expect(service.findById).toHaveBeenCalledWith(id);
      expect(result._id).toBe(id);
    });
  });

  describe('create', () => {
    it.each([
      { label_type: 'Raw Material', width: 4.5, height: 6 },
      { label_type: 'Sample', width: 2.5, height: 3.5 },
      { label_type: 'Intermediate', width: 9.5, height: 12 },
      { label_type: 'Finished Product', width: 7.25, height: 11.5 },
      { label_type: 'API', width: 1, height: 2 },
      { label_type: 'Status', width: 0.5, height: 1.5 },
    ])(
      'should forward create dto for $label_type',
      async ({ label_type, width, height }) => {
        const dto: CreateLabelTemplateDto = {
          template_id: `${label_type.slice(0, 3).toUpperCase()}-${Math.floor(width * 100)}`,
          template_name: `${label_type} Label`,
          label_type: label_type as LabelType,
          template_content: `Template for ${label_type}`,
          width,
          height,
        };
        const response = {
          ...templateResponse,
          template_id: dto.template_id,
          template_name: dto.template_name,
          label_type: dto.label_type,
          width: dto.width,
          height: dto.height,
        };
        service.create.mockResolvedValue(response);

        const result = await controller.create(dto);

        expect(service.create).toHaveBeenCalledWith(dto);
        expect(result).toEqual(response);
      },
    );
  });

  describe('generate', () => {
    it.each([
      { dto: { template_id: 'RAW-001' } },
      { dto: { template_id: 'RAW-001', lot_id: 'LOT-001' } },
      { dto: { template_id: 'RAW-001', batch_id: 'BATCH-001' } },
      {
        dto: {
          template_id: 'RAW-001',
          lot_id: 'LOT-001',
          batch_id: 'BATCH-001',
        },
      },
    ])('should forward generate dto %p', async ({ dto }) => {
      const response = createGeneratedLabelResponse({
        sourceData: dto.lot_id
          ? { lot_id: dto.lot_id }
          : dto.batch_id
            ? { batch_id: dto.batch_id }
            : { lot_id: 'LOT-MOCK-001' },
      });
      service.generateLabel.mockResolvedValue(response);

      const result = await controller.generate(dto as GenerateLabelDto);

      expect(service.generateLabel).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });

  describe('update', () => {
    it.each([
      { id: 'id-001', dto: { template_name: 'Updated A' } },
      { id: 'id-002', dto: { template_content: 'Updated content' } },
      { id: 'id-003', dto: { width: 5.5 } },
      { id: 'id-004', dto: { height: 7.75 } },
      { id: 'id-005', dto: { label_type: 'Sample' } },
      { id: 'id-006', dto: { template_name: 'Mixed', width: 3.5 } },
      { id: 'id-007', dto: { template_name: 'Mixed', height: 8.25 } },
      {
        id: 'id-008',
        dto: { label_type: 'API', width: 2.5, height: 4.5 },
      },
    ])('should forward update for $id', async ({ id, dto }) => {
      const response = {
        ...templateResponse,
        ...dto,
      } as LabelTemplateResponseDto;
      service.update.mockResolvedValue(response);

      const result = await controller.update(id, dto as UpdateLabelTemplateDto);

      expect(service.update).toHaveBeenCalledWith(
        id,
        dto as UpdateLabelTemplateDto,
      );
      expect(result).toEqual(response);
    });
  });

  describe('remove', () => {
    it.each([
      'delete-001',
      'delete-002',
      'delete-003',
      '507f1f77bcf86cd799439011',
      'long-delete-id-value',
      'id-with-dashes-001',
    ])('should forward delete id %s', async (id) => {
      const response = {
        message: `LabelTemplate '${id}' deleted successfully`,
      };
      service.delete.mockResolvedValue(response);

      const result = await controller.remove(id);

      expect(service.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(response);
    });
  });

  describe('error propagation', () => {
    it.each([
      {
        name: 'findAll',
        setup: (error: Error) => service.findAll.mockRejectedValue(error),
        invoke: () => controller.findAll(1, 20),
      },
      {
        name: 'search',
        setup: (error: Error) => service.search.mockRejectedValue(error),
        invoke: () => controller.search('RAW', 1, 20),
      },
      {
        name: 'filterByType',
        setup: (error: Error) => service.filterByType.mockRejectedValue(error),
        invoke: () => controller.filterByType('Raw Material', 1, 20),
      },
      {
        name: 'findOne',
        setup: (error: Error) => service.findById.mockRejectedValue(error),
        invoke: () => controller.findOne('507f1f77bcf86cd799439011'),
      },
      {
        name: 'create',
        setup: (error: Error) => service.create.mockRejectedValue(error),
        invoke: () =>
          controller.create({
            template_id: 'RAW-001',
            template_name: 'Raw Material Label',
            label_type: 'Raw Material',
            template_content: 'Content',
            width: 4.5,
            height: 6,
          }),
      },
      {
        name: 'generate',
        setup: (error: Error) => service.generateLabel.mockRejectedValue(error),
        invoke: () => controller.generate({ template_id: 'RAW-001' }),
      },
      {
        name: 'update',
        setup: (error: Error) => service.update.mockRejectedValue(error),
        invoke: () => controller.update('id-001', { template_name: 'Updated' }),
      },
      {
        name: 'remove',
        setup: (error: Error) => service.delete.mockRejectedValue(error),
        invoke: () => controller.remove('id-001'),
      },
    ])(
      'should propagate service errors from $name',
      async ({ name, setup, invoke }) => {
        const error = new Error(`${name} failed`);
        setup(error);

        await expect(invoke()).rejects.toThrow(`${name} failed`);
      },
    );
  });
});
