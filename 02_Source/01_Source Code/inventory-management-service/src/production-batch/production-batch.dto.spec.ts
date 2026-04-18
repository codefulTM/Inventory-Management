import {
  BatchComponentResponseDto,
  PaginatedProductionBatchResponseDto,
  ProductionBatchResponseDto,
} from './production-batch.dto';

describe('ProductionBatch Response DTOs', () => {
  it('should allow assigning all fields to ProductionBatchResponseDto', () => {
    const dto: ProductionBatchResponseDto = {
      _id: '507f1f77bcf86cd799439011',
      batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
      product_id: 'MAT-001',
      batch_number: 'BATCH-2026-001',
      unit_of_measure: 'kg',
      shelf_life_value: 24,
      shelf_life_unit: 'month',
      status: 'In Progress',
      batch_size: '500',
      created_date: new Date('2026-01-01T08:00:00.000Z'),
      modified_date: new Date('2026-01-01T08:00:00.000Z'),
    };

    expect(dto.batch_number).toBe('BATCH-2026-001');
    expect(dto.batch_size).toBe('500');
  });

  it('should allow assigning all fields to BatchComponentResponseDto', () => {
    const dto: BatchComponentResponseDto = {
      _id: '507f191e810c19729de860ea',
      component_id: 'f5f7d95c-95e2-4314-81d2-3989f95a11a4',
      batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
      lot_id: '34b8ad57-1f77-468c-8f96-df6f8bdb3354',
      planned_quantity: '100',
      actual_quantity: '95',
      unit_of_measure: 'kg',
      addition_date: new Date('2026-01-15T00:00:00.000Z'),
      added_by: 'operator-01',
      created_date: new Date('2026-01-15T08:00:00.000Z'),
      modified_date: new Date('2026-01-15T08:00:00.000Z'),
    };

    expect(dto.component_id).toBe('f5f7d95c-95e2-4314-81d2-3989f95a11a4');
    expect(dto.planned_quantity).toBe('100');
  });

  it('should represent paginated production batch response shape', () => {
    const item: ProductionBatchResponseDto = {
      _id: '507f1f77bcf86cd799439011',
      batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
      product_id: 'MAT-001',
      batch_number: 'BATCH-2026-001',
      unit_of_measure: 'kg',
      shelf_life_value: 24,
      shelf_life_unit: 'month',
      status: 'In Progress',
      batch_size: '500',
      created_date: new Date('2026-01-01T08:00:00.000Z'),
      modified_date: new Date('2026-01-01T08:00:00.000Z'),
    };

    const paged: PaginatedProductionBatchResponseDto = {
      data: [item],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    expect(paged.data).toHaveLength(1);
    expect(paged.pagination.totalPages).toBe(1);
  });
});
