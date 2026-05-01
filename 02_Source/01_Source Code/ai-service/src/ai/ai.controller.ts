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
    private readonly aiSupplierService: AiSupplierService,
    private readonly backendDataService: BackendDataService,
  ) {}

  /**
   * Phân tích tất cả nhà cung cấp dựa trên dữ liệu QC thực tế
   * GET /ai/supplier-analysis?from=2026-01-01&to=2026-03-10
   */
  @Get('supplier-analysis')
  async analyzeAllSuppliers(@Query() filter: SupplierAnalysisFilterDto) {
    this.logger.log(`Received supplier analysis request, filter: ${JSON.stringify(filter)}`);

    const suppliers = (await this.backendDataService.getSupplierPerformance(filter)) as SupplierPerformanceRecord[];

    if (suppliers.length === 0) {
      throw new BadRequestException(
        'Không có dữ liệu nhà cung cấp trong khoảng thời gian được chọn. Vui lòng điều chỉnh bộ lọc ngày.',
      );
    }

    return this.aiSupplierService.analyzeSuppliers(suppliers);
  }

  /**
   * Phân tích chi tiết một nhà cung cấp theo tên
   * GET /ai/supplier-analysis/:name?from=2026-01-01&to=2026-03-10
   */
  @Get('supplier-analysis/:name')
  async analyzeOneSupplier(
    @Param('name') name: string,
    @Query() filter: SupplierAnalysisFilterDto,
  ) {
    this.logger.log(`Analyzing supplier: ${name}`);

    const allSuppliers = (await this.backendDataService.getSupplierPerformance(filter)) as SupplierPerformanceRecord[];

    const decodedName = decodeURIComponent(name).toLowerCase();
    const supplier = allSuppliers.find((s) => s.supplier_name.toLowerCase() === decodedName);

    if (!supplier) {
      throw new BadRequestException(
        `Không tìm thấy dữ liệu QC cho nhà cung cấp "${decodeURIComponent(name)}" trong khoảng thời gian được chọn.`,
      );
    }

    return this.aiSupplierService.analyzeOneSupplier(supplier);
  }

  /**
   * Kiểm tra kết nối với HuggingFace API
   * GET /ai/test-connection
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
