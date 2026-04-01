import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MaterialController } from '../material/material.controller';
import { MaterialService } from '../material/material.service';
import {
  CreateMaterialDto,
  MaterialType,
  PaginatedMaterialResponseDto,
  UpdateMaterialDto,
} from '../material/material.dto';

type MockedMaterialService = {
  findAll: jest.Mock;
  search: jest.Mock;
  filterByType: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

describe('MaterialController', () => {
  let controller: MaterialController;
  let service: MockedMaterialService;

  const pagedResponse: PaginatedMaterialResponseDto = {
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        material_id: 'MAT-001',
        part_number: 'PN-001',
        material_name: 'Acetaminophen',
        material_type: MaterialType.API,
        storage_conditions: 'Store below 25C',
        specification_document: 'SPEC-API-001',
        created_date: new Date('2026-03-15T11:45:00.000Z'),
        modified_date: new Date('2026-03-15T11:45:00.000Z'),
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  };

  const createDto: CreateMaterialDto = {
    material_id: 'MAT-001',
    part_number: 'PN-001',
    material_name: 'Acetaminophen',
    material_type: MaterialType.API,
    storage_conditions: 'Store below 25C',
    specification_document: 'SPEC-API-001',
  };

  beforeEach(async () => {
    const serviceMock: MockedMaterialService = {
      findAll: jest.fn(),
      search: jest.fn(),
      filterByType: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialController],
      providers: [
        {
          provide: MaterialService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<MaterialController>(MaterialController);
    service = module.get<MockedMaterialService>(MaterialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should use default pagination values', async () => {
      service.findAll.mockResolvedValue(pagedResponse);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(pagedResponse);
    });

    it('should pass explicit pagination values', async () => {
      service.findAll.mockResolvedValue(pagedResponse);

      await controller.findAll(2, 50);

      expect(service.findAll).toHaveBeenCalledWith(2, 50);
    });
  });

  describe('search', () => {
    it.each(['', undefined as unknown as string])(
      'should reject missing query value %#',
      async (query) => {
        await expect(controller.search(query, 1, 20)).rejects.toThrow(
          BadRequestException,
        );
        expect(service.search).not.toHaveBeenCalled();
      },
    );

    it('should forward search request to service', async () => {
      service.search.mockResolvedValue(pagedResponse);

      const result = await controller.search('api', 2, 5);

      expect(service.search).toHaveBeenCalledWith('api', 2, 5);
      expect(result).toEqual(pagedResponse);
    });

    it('should use default pagination values for search', async () => {
      service.search.mockResolvedValue(pagedResponse);

      await controller.search('api');

      expect(service.search).toHaveBeenCalledWith('api', 1, 20);
    });
  });

  describe('filterByType', () => {
    it.each(Object.values(MaterialType))(
      'should forward valid type "%s" to service',
      async (type) => {
        service.filterByType.mockResolvedValue(pagedResponse);

        const result = await controller.filterByType(type, 1, 20);

        expect(service.filterByType).toHaveBeenCalledWith(type, 1, 20);
        expect(result).toEqual(pagedResponse);
      },
    );

    it('should use default pagination for type filtering', async () => {
      service.filterByType.mockResolvedValue(pagedResponse);

      await controller.filterByType(MaterialType.API);

      expect(service.filterByType).toHaveBeenCalledWith(
        MaterialType.API,
        1,
        20,
      );
    });
  });

  describe('findOne', () => {
    it('should forward id to service', async () => {
      service.findById.mockResolvedValue(pagedResponse.data[0]);

      const result = await controller.findOne('507f1f77bcf86cd799439011');

      expect(service.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(pagedResponse.data[0]);
    });
  });

  describe('create', () => {
    it('should pass CreateMaterialDto to service.create', async () => {
      service.create.mockResolvedValue(pagedResponse.data[0]);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(pagedResponse.data[0]);
    });
  });

  describe('update', () => {
    it('should pass id and UpdateMaterialDto to service.update', async () => {
      const updateDto: UpdateMaterialDto = {
        material_name: 'Acetaminophen Updated',
      };
      const updated = {
        ...pagedResponse.data[0],
        material_name: 'Acetaminophen Updated',
      };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should pass id to service.delete', async () => {
      const deleteResult = {
        message: "Material '507f1f77bcf86cd799439011' deleted successfully",
      };
      service.delete.mockResolvedValue(deleteResult);

      const result = await controller.remove('507f1f77bcf86cd799439011');

      expect(service.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(deleteResult);
    });
  });

  describe('decorator metadata', () => {
    const prototype = MaterialController.prototype;

    it('should register controller base path as "materials"', () => {
      expect(Reflect.getMetadata(PATH_METADATA, MaterialController)).toBe(
        'materials',
      );
    });

    it.each([
      { method: 'findAll', path: '/', status: HttpStatus.OK },
      { method: 'search', path: 'search', status: HttpStatus.OK },
      { method: 'filterByType', path: 'type/:type', status: HttpStatus.OK },
      { method: 'findOne', path: ':id', status: HttpStatus.OK },
      { method: 'create', path: '/', status: HttpStatus.CREATED },
      { method: 'update', path: ':id', status: HttpStatus.OK },
      { method: 'remove', path: ':id', status: HttpStatus.OK },
    ])(
      'should define route metadata for $method',
      ({ method, path, status }) => {
        const handler = prototype[method as keyof MaterialController] as object;

        expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
        expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
      },
    );

    it.each([
      { method: 'findAll', requestMethod: RequestMethod.GET },
      { method: 'search', requestMethod: RequestMethod.GET },
      { method: 'filterByType', requestMethod: RequestMethod.GET },
      { method: 'findOne', requestMethod: RequestMethod.GET },
      { method: 'create', requestMethod: RequestMethod.POST },
      { method: 'update', requestMethod: RequestMethod.PUT },
      { method: 'remove', requestMethod: RequestMethod.DELETE },
    ])(
      'should define HTTP method metadata for $method',
      ({ method, requestMethod }) => {
        const handler = prototype[method as keyof MaterialController] as object;

        expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
          requestMethod,
        );
      },
    );
  });
});
