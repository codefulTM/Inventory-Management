import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { AiQcService } from './ai-qc.service';
import { AnalyzeQcDto } from './dto/analyze-qc.dto';
import { QC_MOCK_DATA } from './qc-mock.data';

@Controller('ai')
export class AiQcController {
  private readonly logger = new Logger(AiQcController.name);

  constructor(private readonly aiQcService: AiQcService) {}

  /**
   * Endpoint chính để phân tích QC test
   * POST /ai/analyze-mock
   * Public - không cần authentication
   */
  @Post('analyze-mock')
  async analyzeMockQc(@Body() qcData: AnalyzeQcDto) {
    this.logger.log(
      `Received analysis request for: ${qcData.test_name || qcData.test_type}`,
    );

    try {
      const result = await this.aiQcService.analyzeQcTest(qcData);
      return result;
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`, error.stack);
      return {
        success: false,
        analysis: `Lỗi khi phân tích: ${error.message}`,
        timestamp: new Date().toISOString(),
        model_used: 'N/A',
      };
    }
  }

  /**
   * Endpoint để lấy mock data
   * GET /ai/mock-data
   * Trả về danh sách các test case mẫu
   */
  @Get('mock-data')
  getMockData() {
    this.logger.log('Fetching mock QC data');
    return {
      success: true,
      data: QC_MOCK_DATA,
      count: QC_MOCK_DATA.length,
    };
  }

  /**
   * Endpoint để test kết nối với HuggingFace
   * GET /ai/test-connection
   */
  @Get('test-connection')
  async testConnection() {
    this.logger.log('Testing HuggingFace connection');
    const result = await this.aiQcService.testConnection();
    return {
      success: result.connected,
      message: result.connected
        ? 'Kết nối thành công với HuggingFace API'
        : 'Không thể kết nối với HuggingFace API',
      model: result.model,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint để phân tích một test cụ thể từ mock data
   * POST /ai/analyze-by-id
   */
  @Post('analyze-by-id')
  async analyzeById(@Body('id') id: string) {
    this.logger.log(`Analyzing QC test with ID: ${id}`);

    const qcTest = QC_MOCK_DATA.find((test) => test.id === id);

    if (!qcTest) {
      return {
        success: false,
        analysis: `Không tìm thấy test với ID: ${id}`,
        timestamp: new Date().toISOString(),
        model_used: 'N/A',
      };
    }

    return await this.aiQcService.analyzeQcTest(qcTest);
  }
}
