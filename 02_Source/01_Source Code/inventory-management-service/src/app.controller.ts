/**
 * AppController - Controller gốc của ứng dụng
 * 
 * Cung cấp các endpoint chung cho toàn bộ API:
 * - GET / : Thông tin tổng quan về API (tên, version, trạng thái, danh sách endpoints)
 * - GET /health : Health check endpoint để kiểm tra service có đang hoạt động không
 * 
 * Cả hai endpoints đều sử dụng @Public() decorator nên không yêu cầu xác thực JWT
 * (bỏ qua JwtAuthGuard全局)
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * GET /
   * Trả về thông tin tổng quan về API
   * Endpoint này công khai (không cần JWT token)
   */
  @Public()
  @Get()
  getApiInfo() {
    return {
      name: 'Inventory Management API',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        '/materials',
        '/inventory-lots',
        '/production-batches',
        '/label-templates',
      ],
    };
  }

  /**
   * GET /health
   * Health check endpoint - Kiểm tra service có đang hoạt động không
   * Thường được sử dụng bởi Docker HEALTHCHECK hoặc load balancer
   * Endpoint này công khai (không cần JWT token)
   */
  @Public()
  @Get('health')
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
