import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';
import { AnalyzeQcDto, AiAnalysisResponseDto } from './dto/analyze-qc.dto';

@Injectable()
export class AiQcService {
  private readonly logger = new Logger(AiQcService.name);
  private hf: HfInference;
  private model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    this.model =
      this.configService.get<string>('HUGGINGFACE_MODEL') ||
      'Qwen/Qwen2.5-72B-Instruct';

    if (!apiKey) {
      this.logger.error('HUGGINGFACE_API_KEY is not configured');
      throw new Error('HuggingFace API key is required');
    }

    this.hf = new HfInference(apiKey);
    this.logger.log(`AI Service initialized with model: ${this.model}`);
  }

  async analyzeQcTest(qcData: AnalyzeQcDto): Promise<AiAnalysisResponseDto> {
    try {
      this.logger.log(
        `Analyzing QC test: ${qcData.test_name} - ${qcData.test_result}`,
      );

      // System prompt định nghĩa vai trò của AI
      const systemPrompt = `Bạn là một chuyên gia kiểm soát chất lượng (QC Engineer) với hơn 10 năm kinh nghiệm trong ngành dược phẩm và thực phẩm chức năng. 
Nhiệm vụ của bạn là phân tích kết quả kiểm định và đưa ra nhận xét chuyên môn, ngắn gọn (tối đa 3 câu).

Yêu cầu phân tích:
1. So sánh test_result với acceptance_criteria
2. Đánh giá mức độ nghiêm trọng nếu không đạt
3. Đưa ra khuyến nghị cụ thể (chấp nhận, từ chối, hoặc kiểm tra lại)

Định dạng trả về: Ngắn gọn, rõ ràng, chuyên nghiệp, bằng tiếng Việt.`;

      // User prompt với dữ liệu cụ thể
      const userPrompt = `
Phân tích kết quả kiểm định sau:

Loại test: ${qcData.test_type}
Tên test: ${qcData.test_name}
Kết quả đo được: ${qcData.test_result}
Tiêu chuẩn chấp nhận: ${qcData.acceptance_criteria}
${qcData.material_name ? `Sản phẩm: ${qcData.material_name}` : ''}
${qcData.batch_number ? `Lô sản xuất: ${qcData.batch_number}` : ''}

Hãy đưa ra nhận xét và khuyến nghị.`;

      // Gọi HuggingFace API
      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 250,
        temperature: 0.7,
      });

      const analysis =
        response.choices[0]?.message?.content || 'Không có phản hồi từ AI';

      this.logger.log(`Analysis completed successfully`);

      return {
        success: true,
        analysis: analysis.trim(),
        timestamp: new Date().toISOString(),
        model_used: this.model,
      };
    } catch (error) {
      this.logger.error(`Error analyzing QC test: ${error.message}`, error.stack);
      
      return {
        success: false,
        analysis: `Lỗi khi phân tích: ${error.message}. Vui lòng kiểm tra lại cấu hình API hoặc thử lại sau.`,
        timestamp: new Date().toISOString(),
        model_used: this.model,
      };
    }
  }

  // Method để test kết nối
  async testConnection(): Promise<{ connected: boolean; model: string }> {
    try {
      const testResponse = await this.hf.chatCompletion({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });

      return {
        connected: !!testResponse,
        model: this.model,
      };
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return {
        connected: false,
        model: this.model,
      };
    }
  }
}
