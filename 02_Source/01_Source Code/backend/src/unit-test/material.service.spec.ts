// Import các module cần thiết cho việc test
import { Test, TestingModule } from '@nestjs/testing';
import { MaterialService } from '../material/material.service';
import { MaterialRepository } from '../material/material.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialType,
} from '../material/material.dto';

describe('MaterialService', () => {
  let service: MaterialService;
  let repo: any;

  const sample = {
    _id: '1',
    material_id: 'MAT-001',
    part_number: 'P1',
    material_name: 'M1',
    material_type: MaterialType.API,
    created_by: 'manager1',
    approved_by: 'admin1',
    status: 'Pending',
  };

  beforeEach(async () => {
    repo = {
      findAllWithPagination: jest.fn(),
      findByMaterialId: jest.fn(),
      findById: jest.fn(),
      findByPartNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findAllWithoutPagination: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService,
        { provide: MaterialRepository, useValue: repo },
      ],
    }).compile();
    service = module.get<MaterialService>(MaterialService);
  });

  it('should return all materials', async () => {
    repo.findAllWithPagination.mockResolvedValue({
      data: [sample],
      total: 1,
      page: 1,
      limit: 20,
    });
    const result = await service.findAllWithPagination(1, 20);
    expect(result.data[0].material_id).toBe('MAT-001');
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
    expect(repo.findAllWithPagination).toHaveBeenCalledWith(1, 20);
  });

  it('should return one material by id', async () => {
    repo.findById.mockResolvedValue(sample);
    const result = await service.findById('1');
    expect(result.material_id).toBe('MAT-001');
  });

  it('should throw NotFoundException when findById misses', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });

  it('should create material', async () => {
    repo.findByMaterialId.mockResolvedValue(null);
    repo.findByPartNumber.mockResolvedValue(null);
    repo.create.mockResolvedValue(sample);
    const dto: CreateMaterialDto = {
      material_id: 'MAT-001',
      part_number: 'P1',
      material_name: 'M1',
      material_type: MaterialType.API,
    };
    const result = await service.create(dto);
    expect(result.material_id).toBe('MAT-001');
    expect(result.created_by).toBe('manager1');
    expect(result.status).toBe('Pending');
  });

  it('should conflict on duplicate material_id create', async () => {
    repo.findByMaterialId.mockResolvedValue(sample);
    const dto: CreateMaterialDto = {
      material_id: 'MAT-001',
      part_number: 'P1',
      material_name: 'M1',
      material_type: MaterialType.API,
    };
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('should conflict on duplicate part_number create', async () => {
    repo.findByMaterialId.mockResolvedValue(null);
    repo.findByPartNumber.mockResolvedValue(sample);
    const dto: CreateMaterialDto = {
      material_id: 'MAT-002',
      part_number: 'P1',
      material_name: 'M2',
      material_type: MaterialType.API,
    };
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('should update existing material', async () => {
    repo.findById.mockResolvedValue(sample);
    const updated = { ...sample, material_name: 'M2' };
    repo.update.mockResolvedValue(updated);
    const dto: UpdateMaterialDto = { material_name: 'M2' };
    const result = await service.update('1', dto);
    expect(result.material_name).toBe('M2');
  });

  it('should throw NotFoundException on update missing', async () => {
    repo.findById.mockResolvedValue(null);
    repo.update.mockResolvedValue(null);
    await expect(service.update('1', { material_name: 'M2' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should remove material', async () => {
    repo.findById.mockResolvedValue(sample);
    repo.remove.mockResolvedValue({ deleted: true });
    const result = await service.remove('1');
    expect(result.deleted).toBe(true);
  });

  it('should throw NotFoundException when remove missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.remove('1')).rejects.toThrow(NotFoundException);
  });

  it('should set created_by and status on create', async () => {
    repo.findByMaterialId.mockResolvedValue(null);
    repo.findByPartNumber.mockResolvedValue(null);
    repo.create.mockResolvedValue({
      ...sample,
      created_by: 'manager1',
      status: 'Pending',
    });
    const dto: CreateMaterialDto = {
      material_id: 'MAT-003',
      part_number: 'P2',
      material_name: 'M3',
      material_type: MaterialType.API,
    };
    const result = await service.create(dto);
    expect(result.created_by).toBe('manager1');
    expect(result.status).toBe('Pending');
  });

  it('should update approved_by and status on approve', async () => {
    repo.findById.mockResolvedValue(sample);
    const updated = { ...sample, approved_by: 'admin1', status: 'Approved' };
    repo.update.mockResolvedValue(updated);
    const dto: UpdateMaterialDto = { material_name: 'M1' };
    const result = await service.update('1', dto);
    expect(result.approved_by).toBe('admin1');
    expect(result.status).toBe('Approved');
  });
});
