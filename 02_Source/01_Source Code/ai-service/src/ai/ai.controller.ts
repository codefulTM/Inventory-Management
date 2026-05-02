// Controller cung cấp các endpoint AI thông thường cho phân tích nhà cung cấp
// Sử dụng HuggingFace API để phân tích dữ liệu QC (Quality Control)
// Các endpoint: phân tích tất cả NCC, phân tích 1 NCC, kiểm tra kết nối
import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AiSupplierService } from './ai-supplier.service';
import { BackendDataService } from '../backend-client/backend-data.service';
import { SupplierAnalysisFilterDto, SupplierPerformanceRecord } from './dto/supplier-analysis.dto';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    // Service phân tích nhà cung cấp bằng AI (HuggingFace)
    private readonly aiSupplierService: AiSupplierService,
    // Service gọi dữ liệu từ backend qua gRPC
    private readonly backendDataService: BackendDataService,
  ) {}

  /**
   * Phân tích tất cả nhà cung cấp dựa trên dữ liệu QC thực tế
   * GET /ai/supplier-analysis?from=2026-01-01&to=2026-03-10
   * Trả về phân tích AI về hiệu suất của top 3 nhà cung cấp nổi bật
   */
  @Get('supplier-analysis')
  async analyzeAllSuppliers(@Query() filter: SupplierAnalysisFilterDto) {
    this.logger.log(`Received supplier analysis request, filter: ${JSON.stringify(filter)}`);

    // Lấy dữ liệu hiệu suất NCC từ backend qua gRPC
    const suppliers = (await this.backendDataService.getSupplierPerformance(filter)) as SupplierPerformanceRecord[];

    // Kiểm tra có dữ liệu hay không
    if (suppliers.length === 0) {
      throw new BadRequestException(
        'Không có dữ liệu nhà cung cấp trong khoảng thời gian được chọn. Vui lòng điều chỉnh bộ lọc ngày.',
      );
    }

    // Gọi AI service để phân tích danh sách NCC
    return this.aiSupplierService.analyzeSuppliers(suppliers);
  }

  /**
   * Phân tích chi tiết một nhà cung cấp theo tên
   * GET /ai/supplier-analysis/:name?from=2026-01-01&to=2026-03-10
   * Trả về phân tích chuyên sâu về 1 nhà cung cấp cụ thể
   */
  @Get('supplier-analysis/:name')
  async analyzeOneSupplier(
    @Param('name') name: string,
    @Query() filter: SupplierAnalysisFilterDto,
  ) {
    this.logger.log(`Analyzing supplier: ${name}`);

    // Lấy tất cả NCC để tìm đúng tên (case-insensitive, hỗ trợ UTF-8)
    const allSuppliers = (await this.backendDataService.getSupplierPerformance(filter)) as SupplierPerformanceRecord[];

    const decodedName = decodeURIComponent(name).toLowerCase();
    const supplier = allSuppliers.find((s) => s.supplier_name.toLowerCase() === decodedName);

    // Kiểm tra NCC có tồn tại trong dữ liệu hay không
    if (!supplier) {
      throw new BadRequestException(
        `Không tìm thấy dữ liệu QC cho nhà cung cấp "${decodeURIComponent(name)}" trong khoảng thời gian được chọn.`,
      );
    }

    // Phân tích chi tiết NCC được chọn
    return this.aiSupplierService.analyzeOneSupplier(supplier);
  }

  /**
   * Kiểm tra kết nối với HuggingFace API
   * GET /ai/test-connection
   * Endpoint sức khỏe để kiểm tra cấu hình và kết nối AI
   */
  @Get('test-connection')
  async testConnection() {
    this.logger.log('Testing HuggingFace connection');
    const result = await this.aiSupplierService.testConnection();
    return {
      success: result.connected,
      message: result.connected
        ? 'Kết nối thành công với HuggingFace API'
        : 'Không thể kết nối với HuggingFace API',
      model: result.model,
      timestamp: new Date().toISOString(),
    };
  }
}
