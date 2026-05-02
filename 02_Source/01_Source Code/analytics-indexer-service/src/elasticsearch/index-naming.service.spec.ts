/**
 * File: elasticsearch/index-naming.service.spec.ts
 * Mục đích: Unit tests cho IndexNamingService
 * 
 * Kiểm tra việc tạo tên index theo định dạng {collection}_{YYYY}_{MM}:
 * - Tháng có 1 chữ số được thêm số 0 đứng trước (04, 01, etc.)
 * - Xử lý đúng tháng 12 và tháng 1
 * - Sử dụng dấu gạch dưới (_), không phải gạch ngang (-)
 * - Sử dụng UTC, không phải local time
 */
import { IndexNamingService } from './index-naming.service';

describe('IndexNamingService', () => {
  const service = new IndexNamingService();

  it('formats single-digit month with leading zero', () => {
    const date = new Date('2026-04-15T10:00:00Z');
    expect(service.getIndexName('inventory_lots', date)).toBe('inventory_lots_2026_04');
  });

  it('handles December correctly', () => {
    const date = new Date('2025-12-31T23:59:59Z');
    expect(service.getIndexName('qc_tests', date)).toBe('qc_tests_2025_12');
  });

  it('handles January correctly', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(service.getIndexName('materials', date)).toBe('materials_2026_01');
  });

  it('uses underscore separators (not hyphens)', () => {
    const date = new Date('2026-06-20T00:00:00Z');
    const name = service.getIndexName('import_export_orders', date);
    expect(name).toBe('import_export_orders_2026_06');
    expect(name).not.toContain('-');
  });

  it('uses UTC month, not local time', () => {
    // UTC midnight Jan 1 but local time could be Dec 31
    const date = new Date('2026-01-01T00:00:00Z');
    expect(service.getIndexName('inventory_transactions', date)).toMatch(/_2026_01$/);
  });
});
