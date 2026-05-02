/**
 * File: elasticsearch/index-naming.service.ts
 * Mục đích: Tạo tên chỉ mục (index) Elasticsearch theo định dạng phân vùng theo tháng
 * 
 * Pattern: {collection_name}_{YYYY}_{MM}
 * Ví dụ: inventory_lots_2026_04, materials_2026_05
 * 
 * Việc phân vùng theo tháng giúp:
 * - Quản lý dữ liệu theo thời gian
 * - Xóa dữ liệu cũ dễ dàng (xóa cả index)
 * - Tối ưu hiệu suất truy vấn theo khoảng thời gian
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class IndexNamingService {
  /**
   * Tạo tên index theo định dạng phân vùng hàng tháng
   * @param collection - Tên collection (ví dụ: inventory_lots)
   * @param date - Ngày để xác định năm và tháng
   * @returns Tên index (ví dụ: inventory_lots_2026_04)
   * 
   * Sử dụng UTC để đảm bảo tính nhất quán giữa các múi giờ
   */
  getIndexName(collection: string, date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${collection}_${year}_${month}`;
  }
}
