import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MaterialRepository } from './material.repository';
import { Material } from '../schemas/material.schema';
import {
  CreateMaterialDto,
  MaterialType,
  UpdateMaterialDto,
} from './material.dto';

type MaterialLike = {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  created_date: Date;
  modified_date: Date;
};

type MaterialFilterQuery = Record<string, unknown>;

type FindChain = {
  skip: jest.Mock;
  limit: jest.Mock;
  sort: jest.Mock;
  exec: jest.Mock;
};

type MockMaterialModel = {
  find: jest.Mock;
  findById: jest.Mock;
  findOne: jest.Mock;
  countDocuments: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  distinct: jest.Mock;
};

function createFindChain<T>(value: T): FindChain {
  const chain: FindChain = {
    skip: jest.fn(),
    limit: jest.fn(),
    sort: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };

  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);

  return chain;
}

describe('MaterialRepository', () => {
  let repository: MaterialRepository;
  let mockModel: MockMaterialModel;

  const now = new Date('2026-03-15T11:45:00.000Z');
  const materialDoc: MaterialLike = {
    _id: '507f1f77bcf86cd799439011',
    material_id: 'MAT-001',
    part_number: 'PN-001',
    material_name: 'Acetaminophen',
    material_type: MaterialType.API,
    storage_conditions: 'Store below 25C',
    specification_document: 'SPEC-API-001',
    created_date: now,
    modified_date: now,
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
    mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      distinct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialRepository,
        {
          provide: getModelToken(Material.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<MaterialRepository>(MaterialRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new material document', async () => {
      const constructorInputs: CreateMaterialDto[] = [];

      class MaterialModelCtor {
        constructor(data: CreateMaterialDto) {
          constructorInputs.push(data);
        }

        save = jest.fn().mockResolvedValue(materialDoc);
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MaterialRepository,
          {
            provide: getModelToken(Material.name),
            useValue: MaterialModelCtor,
          },
        ],
      }).compile();

      const createRepository =
        module.get<MaterialRepository>(MaterialRepository);

      const result = await createRepository.create(createDto);

      expect(constructorInputs).toEqual([createDto]);
      expect(result).toEqual(materialDoc);
    });
  });

  describe('findAllWithPagination', () => {
    it('should apply pagination and newest-first sorting', async () => {
      const chain = createFindChain([materialDoc]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockResolvedValue(23);

      const result = await repository.findAllWithPagination(2, 10);

      expect(mockModel.find).toHaveBeenCalledWith();
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });
      expect(mockModel.countDocuments).toHaveBeenCalledWith();
      expect(result).toEqual({
        data: [materialDoc],
        total: 23,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('findById', () => {
    it('should return a document when it exists', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(materialDoc),
      });

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(mockModel.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(materialDoc);
    });

    it('should return null when document does not exist', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('findByMaterialId', () => {
    it('should query by business key material_id', async () => {
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(materialDoc),
      });

      const result = await repository.findByMaterialId('MAT-001');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        material_id: 'MAT-001',
      });
      expect(result).toEqual(materialDoc);
    });
  });

  describe('findByPartNumber', () => {
    it('should query by part_number', async () => {
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(materialDoc),
      });

      const result = await repository.findByPartNumber('PN-001');

      expect(mockModel.findOne).toHaveBeenCalledWith({ part_number: 'PN-001' });
      expect(result).toEqual(materialDoc);
    });
  });

  describe('search', () => {
    it('should build case-insensitive regex search across key fields', async () => {
      const chain = createFindChain([materialDoc]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockResolvedValue(3);

      const result = await repository.search('API', 3, 4);

      expect(chain.skip).toHaveBeenCalledWith(8);
      expect(chain.limit).toHaveBeenCalledWith(4);
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });

      const [searchQueryArg] = mockModel.find.mock.calls[0] as [
        MaterialFilterQuery,
      ];
      const searchQuery = searchQueryArg as {
        $or: Array<Record<string, RegExp>>;
      };

      expect(searchQuery.$or).toHaveLength(3);

      const regexes = searchQuery.$or.map((entry) => Object.values(entry)[0]);
      regexes.forEach((regex) => {
        expect(regex).toBeInstanceOf(RegExp);
        expect(regex.source).toBe('API');
        expect(regex.flags).toContain('i');
      });

      expect(mockModel.countDocuments).toHaveBeenCalledWith(searchQueryArg);
      expect(result).toEqual({ data: [materialDoc], total: 3 });
    });
  });

  describe('filterByType', () => {
    it('should filter by material type with pagination', async () => {
      const chain = createFindChain([materialDoc]);
      mockModel.find.mockReturnValue(chain);
      mockModel.countDocuments.mockResolvedValue(9);

      const result = await repository.filterByType(MaterialType.API, 2, 5);

      expect(mockModel.find).toHaveBeenCalledWith({
        material_type: MaterialType.API,
      });
      expect(chain.skip).toHaveBeenCalledWith(5);
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.sort).toHaveBeenCalledWith({ created_date: -1 });
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        material_type: MaterialType.API,
      });
      expect(result).toEqual({ data: [materialDoc], total: 9 });
    });
  });

  describe('update', () => {
    it('should update with validators enabled and return updated doc', async () => {
      const updateDto: UpdateMaterialDto = {
        material_name: 'Acetaminophen Updated',
        storage_conditions: 'Store below 20C',
      };
      const updatedDoc = {
        ...materialDoc,
        material_name: 'Acetaminophen Updated',
        storage_conditions: 'Store below 20C',
      };
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await repository.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
        {
          new: true,
          runValidators: true,
        },
      );
      expect(result).toEqual(updatedDoc);
    });
  });

  describe('delete', () => {
    it('should delete a document by id', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(materialDoc),
      });

      const result = await repository.delete('507f1f77bcf86cd799439011');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(materialDoc);
    });
  });

  describe('isDuplicate', () => {
    it('should return true when duplicate exists without excludeId', async () => {
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await repository.isDuplicate('part_number', 'PN-001');

      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        part_number: 'PN-001',
      });
      expect(result).toBe(true);
    });

    it('should apply _id exclusion and return false when no duplicate exists', async () => {
      mockModel.countDocuments.mockResolvedValue(0);

      const result = await repository.isDuplicate(
        'material_id',
        'MAT-001',
        '507f1f77bcf86cd799439011',
      );

      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        material_id: 'MAT-001',
        _id: { $ne: '507f1f77bcf86cd799439011' },
      });
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total number of material documents', async () => {
      mockModel.countDocuments.mockResolvedValue(120);

      const result = await repository.count();

      expect(mockModel.countDocuments).toHaveBeenCalledWith();
      expect(result).toBe(120);
    });
  });

  describe('getDistinctTypes', () => {
    it('should return distinct material types', async () => {
      mockModel.distinct.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([MaterialType.API, MaterialType.EXCIPIENT]),
      });

      const result = await repository.getDistinctTypes();

      expect(mockModel.distinct).toHaveBeenCalledWith('material_type');
      expect(result).toEqual([MaterialType.API, MaterialType.EXCIPIENT]);
    });
  });
});
