/**
 * AppService - Service gốc của ứng dụng
 * 
 * Hiện tại service này chỉ chứa phương thức getHello() đơn giản
 * Có thể mở rộng để thêm các logic nghiệp vụ chung cho toàn bộ ứng dụng
 * Ví dụ: kiểm tra health, lấy thông tin hệ thống, v.v.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Phương thức mẫu trả về chuỗi "Hello World!"
   * Có thể được sử dụng để test kết nối hoặc mở rộng thêm logic
   */
  getHello(): string {
    return 'Hello World!';
  }
}
