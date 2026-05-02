// Service xử lý phân tích nhà cung cấp bằng AI qua HuggingFace Inference API
// Chức năng chính:
// - Phân tích tất cả NCC: Chọn top 3 nổi bật và phân tích bằng AI
// - Phân tích 1 NCC: Đánh giá chi tiết hiệu suất và rủi ro
// - Kiểm tra kết nối: Test HuggingFace API connectivity
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';
import {
  SupplierPerformanceRecord,
  SupplierAnalysisResponseDto,
} from './dto/supplier-analysis.dto';

@Injectable()
export class AiSupplierService {
  private readonly logger = new Logger(AiSupplierService.name);
  private hf: HfInference; // Client kết nối HuggingFace Inference API
  private model: string; // Tên model AI sử dụng (mặc định: Qwen/Qwen2.5-72B-Instruct)

  constructor(private configService: ConfigService) {
    // Đọc API key từ biến môi trường
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    // Đọc tên model từ biến môi trường hoặc dùng mặc định
    this.model =
      this.configService.get<string>('HUGGINGFACE_MODEL') ||
      'Qwen/Qwen2.5-72B-Instruct';

    if (!apiKey) {
      // Cảnh báo nhưng không throw để service vẫn khởi động được
      this.logger.warn('HUGGINGFACE_API_KEY is not configured — AI supplier analysis will return errors');
      // Don't throw so the service starts even without the key
      this.hf = null as unknown as HfInference;
    } else {
      // Khởi tạo HuggingFace client với API key
      this.hf = new HfInference(apiKey);
      this.logger.log(`AI Supplier Service initialized with model: ${this.model}`);
    }
  }

  // Trích xuất JSON từ phản hồi của AI (hỗ trợ cả markdown code block và raw JSON)
  // HuggingFace có thể trả về JSON trong ```json ... ``` hoặc raw text
  private extractJsonBlock(content: string): string {
    // Thử tìm JSON trong markdown code block trước
    const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) return fencedMatch[1].trim();
    // Nếu không có code block, tìm dấu ngoặc nhọn đầu tiên và cuối cùng
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return content.slice(firstBrace, lastBrace + 1).trim();
    }
    // Trả về nguyên bản nếu không tìm thấy cấu trúc JSON
    return content.trim();
  }

  // Phương thức chọn 3 NCC tiêu biểu theo heuristic (dự phòng khi AI thất bại)
  // Tiêu chí chọn:
  // 1. NCC mới nổi: Chất lượng cao (>80%) nhưng sản lượng thấp (<=30 lô)
  // 2. NCC trụ cột: Sản lượng lớn nhất
  // 3. NCC rủi ro: Số lô bị reject cao nhất
  private pickTop3SuppliersFallback(
    suppliers: SupplierPerformanceRecord[],
  ): SupplierPerformanceRecord[] {
    // Nếu có 3 NCC trở xuống thì lấy hết
    if (suppliers.length <= 3) return suppliers;

    // Sắp xếp theo các tiêu chí khác nhau
    const sortedByQuality = [...suppliers].sort((a, b) => b.quality_rate - a.quality_rate);
    const sortedByVolume = [...suppliers].sort((a, b) => b.total_batches - a.total_batches);
    const sortedByRejected = [...suppliers].sort((a, b) => b.rejected - a.rejected);

    const selected: SupplierPerformanceRecord[] = [];

    // Chọn NCC mới nổi (chất lượng cao, sản lượng thấp)
    const risingSupplier = sortedByQuality.find((s) => s.total_batches <= 30);
    if (risingSupplier) selected.push(risingSupplier);

    // Chọn NCC trụ cột (sản lượng lớn nhất và chưa được chọn)
    const volumeSupplier = sortedByVolume.find(
      (s) => !selected.some((p) => p.supplier_name === s.supplier_name),
    );
    if (volumeSupplier) selected.push(volumeSupplier);

    // Chọn NCC rủi ro (số lô reject cao nhất và chưa được chọn)
    const riskySupplier = sortedByRejected.find(
      (s) => !selected.some((p) => p.supplier_name === s.supplier_name),
    );
    if (riskySupplier) selected.push(riskySupplier);

    // Nếu chưa đủ 3, bổ sung thêm từ danh sách chất lượng cao
    for (const supplier of sortedByQuality) {
      if (selected.length >= 3) break;
      if (!selected.some((p) => p.supplier_name === supplier.supplier_name)) {
        selected.push(supplier);
      }
    }

    return selected.slice(0, 3);
  }

  // Sử dụng AI (HuggingFace) để chọn 3 NCC tiêu biểu cho dashboard QC
  // Phân loại: Mới nổi (chất lượng cao), Trụ cột (sản lượng lớn), Rủi ro (lỗi nhiều)
  // Nếu AI thất bại -> fallback sang phương thức heuristic (pickTop3SuppliersFallback)
  private async selectTop3SuppliersWithAi(suppliers: SupplierPerformanceRecord[]): Promise<{
    selectedSuppliers: SupplierPerformanceRecord[];
    selectionRationale: string;
  }> {
    // Nếu có 3 NCC trở xuống thì lấy hết (không cần AI chọn)
    if (suppliers.length <= 3) {
      return {
        selectedSuppliers: suppliers,
        selectionRationale: 'Danh sách có từ 3 nhà cung cấp trở xuống nên dùng toàn bộ để phân tích.',
      };
    }

    // Tạo bảng dữ liệu NCC để gửi cho AI
    const tableRows = suppliers
      .map((s, i) => `${i + 1}. ${s.supplier_name} | Tổng lô: ${s.total_batches} | Đạt: ${s.approved} | Không đạt: ${s.rejected} | Tỷ lệ chất lượng: ${s.quality_rate}%`)
      .join('\n');

    // System prompt: Hướng dẫn AI cách chọn 3 NCC theo 3 nhóm
    const selectorSystemPrompt = `Bạn là AI agent tuyển chọn nhà cung cấp nổi bật cho dashboard QC.
Nhiệm vụ: Chọn đúng 3 nhà cung cấp theo 3 nhóm sau (mỗi nhóm 1 nhà cung cấp):
1) Nhà cung cấp mới nổi: số lô tương đối ít nhưng tỷ lệ chất lượng cao.
2) Nhà cung cấp trụ cột: số lô lớn, chất lượng nhìn chung tốt nhưng chưa thật sự xuất sắc.
3) Nhà cung cấp rủi ro: có dấu hiệu lỗi nhiều, cần giám sát.
Chỉ trả JSON hợp lệ, không trả thêm văn bản.`;

    // User prompt: Gửi dữ liệu và yêu cầu AI trả về JSON với selected_indexes (1-based)
    const selectorUserPrompt = `Dữ liệu nhà cung cấp:\n${tableRows}\n\nTrả về JSON theo đúng schema:\n{\n  "selected_indexes": [number, number, number],\n  "rationale": "string"\n}\n\nYêu cầu:\n- selected_indexes dùng index 1-based theo danh sách đã cho.\n- Chọn đúng 3 index khác nhau.\n- rationale giải thích ngắn gọn vì sao chọn 3 nhà cung cấp này.`;

    try {
      // Gọi HuggingFace chat completion API
      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: selectorSystemPrompt },
          { role: 'user', content: selectorUserPrompt },
        ],
        max_tokens: 220, // Giới hạn token để phản hồi ngắn gọn
        temperature: 0.2, // Độ sáng tạo thấp để kết quả nhất quán
      });

      // Xử lý phản hồi từ AI
      const content = response.choices[0]?.message?.content ?? '';
      const jsonText = this.extractJsonBlock(content);
      const parsed = JSON.parse(jsonText) as { selected_indexes?: number[]; rationale?: string };

      // Loại bỏ trùng lặp và chuyển index 1-based sang 0-based
      const uniqueIndexes = Array.isArray(parsed.selected_indexes)
        ? Array.from(new Set(parsed.selected_indexes))
        : [];

      // Map index sang object NCC tương ứng
      const selectedSuppliers = uniqueIndexes
        .map((idx) => suppliers[idx - 1])
        .filter((item): item is SupplierPerformanceRecord => Boolean(item))
        .slice(0, 3);

      // Nếu AI chọn đúng 3 NCC hợp lệ thì trả về
      if (selectedSuppliers.length === 3) {
        return {
          selectedSuppliers,
          selectionRationale: parsed.rationale?.trim() || 'AI đã chọn 3 nhà cung cấp tiêu biểu theo mức độ nổi bật và rủi ro.',
        };
      }
      // Nếu không đủ 3, throw error để fallback
      throw new Error('AI selector did not return 3 valid supplier indexes');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`AI selector failed, fallback to heuristic selection: ${err.message}`);
      // Fallback sang phương thức heuristic khi AI thất bại
      return {
        selectedSuppliers: this.pickTop3SuppliersFallback(suppliers),
        selectionRationale: 'Dùng cơ chế chọn dự phòng theo heuristic: mới nổi chất lượng cao, trụ cột sản lượng lớn, và nhóm rủi ro lỗi cao.',
      };
    }
  }

  // Phân tích tất cả NCC bằng AI: Chọn top 3 và tạo báo cáo phân tích chi tiết
  // Sử dụng HuggingFace để đánh giá rủi ro, nhận xét và đưa ra khuyến nghị
  async analyzeSuppliers(suppliers: SupplierPerformanceRecord[]): Promise<SupplierAnalysisResponseDto> {
    try {
      this.logger.log(`Analyzing ${suppliers.length} suppliers`);

      // Chọn 3 NCC tiêu biểu bằng AI (hoặc fallback heuristic)
      const { selectedSuppliers, selectionRationale } = await this.selectTop3SuppliersWithAi(suppliers);

      // System prompt: Định nghĩa vai trò chuyên gia QC cho AI
      const systemPrompt = `Bạn là chuyên gia quản lý chuỗi cung ứng và kiểm soát chất lượng với hơn 10 năm kinh nghiệm trong ngành dược phẩm và thực phẩm chức năng. Nhiệm vụ của bạn là phân tích hiệu suất các nhà cung cấp dựa trên dữ liệu QC test và đưa ra:
1. Xếp hạng rủi ro (Thấp / Trung bình / Cao) cho từng nhà cung cấp
2. Nhận xét ngắn gọn điểm mạnh / yếu
3. Khuyến nghị hành động: tiếp tục hợp tác, tăng cường giám sát, hoặc xem xét thay thế
Trả lời bằng tiếng Việt, chuyên nghiệp, có cấu trúc rõ ràng theo từng nhà cung cấp.`;

      // Tạo bảng dữ liệu 3 NCC đã chọn
      const tableRows = selectedSuppliers
        .map((s, i) => `${i + 1}. ${s.supplier_name} | Tổng lô: ${s.total_batches} | Đạt: ${s.approved} | Không đạt: ${s.rejected} | Tỷ lệ chất lượng: ${s.quality_rate}%`)
        .join('\n');

      // User prompt: Yêu cầu AI phân tích với ngưỡng rủi ro cụ thể
      const userPrompt = `Phân tích hiệu suất 3 nhà cung cấp nổi bật sau dựa trên dữ liệu QC test:\n\nLý do chọn 3 nhà cung cấp: ${selectionRationale}\n\n${tableRows}\n\nLưu ý: Tỷ lệ chất lượng < 80% được coi là rủi ro cao, 80-95% là trung bình, > 95% là thấp.\n\nHãy phân tích từng nhà cung cấp và đưa ra tổng kết cuối. Kết luận cần có thứ tự ưu tiên hành động (cao đến thấp).`;

      // Gọi HuggingFace API để tạo phân tích
      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 600, // Cho phép phản hồi dài để phân tích chi tiết
        temperature: 0.7, // Độ sáng tạo trung bình để cân bằng giữa chính xác và đa dạng
      });

      const analysis = response.choices[0]?.message?.content || 'Không có phản hồi từ AI';

      // Trả về kết quả phân tích
      return {
        success: true,
        analysis: analysis.trim(),
        suppliers_analyzed: selectedSuppliers.length,
        timestamp: new Date().toISOString(),
        model_used: this.model,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error analyzing suppliers: ${err.message}`, err.stack);
      // Trả về lỗi nhưng vẫn giữ cấu trúc response
      return {
        success: false,
        analysis: `Lỗi khi phân tích: ${err.message}. Vui lòng kiểm tra lại cấu hình API hoặc thử lại sau.`,
        suppliers_analyzed: Math.min(3, suppliers.length),
        timestamp: new Date().toISOString(),
        model_used: this.model,
      };
    }
  }

  // Phân tích chi tiết một nhà cung cấp cụ thể bằng AI
  // Đánh giá: Hiệu suất, điểm mạnh/yếu, rủi ro tiềm ẩn, khuyến nghị hành động
  async analyzeOneSupplier(supplier: SupplierPerformanceRecord): Promise<SupplierAnalysisResponseDto> {
    try {
      this.logger.log(`Analyzing supplier: ${supplier.supplier_name}`);

      // Xác định mức rủi ro dựa trên tỷ lệ chất lượng
      const riskLevel = supplier.quality_rate < 80 ? 'CAO' : supplier.quality_rate < 95 ? 'TRUNG BÌNH' : 'THẤP';

      // System prompt: Chuyên gia phân tích NCC chi tiết
      const systemPrompt = `Bạn là chuyên gia quản lý chuỗi cung ứng và kiểm soát chất lượng với hơn 10 năm kinh nghiệm trong ngành dược phẩm và thực phẩm chức năng. Nhiệm vụ của bạn là phân tích chi tiết hiệu suất một nhà cung cấp và đưa ra nhận xét chuyên sâu, khuyến nghị cụ thể. Trả lời bằng tiếng Việt, chuyên nghiệp.`;

      // User prompt: Gửi thông tin NCC và yêu cầu phân tích 4 phần
      const userPrompt = `Phân tích chi tiết nhà cung cấp sau:\n\nTên nhà cung cấp: ${supplier.supplier_name}\nTổng số lô hàng: ${supplier.total_batches}\nSố lô đạt QC: ${supplier.approved}\nSố lô không đạt QC: ${supplier.rejected}\nTỷ lệ chất lượng: ${supplier.quality_rate}%\nMức rủi ro ước tính: ${riskLevel}\n\nYêu cầu phân tích:\n1. Đánh giá tổng thể hiệu suất nhà cung cấp\n2. Phân tích điểm mạnh và điểm yếu\n3. Xác định rủi ro tiềm ẩn nếu có\n4. Đưa ra khuyến nghị hành động cụ thể`;

      // Gọi HuggingFace API
      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 400, // Đủ dài cho phân tích chi tiết 1 NCC
        temperature: 0.7,
      });

      const analysis = response.choices[0]?.message?.content || 'Không có phản hồi từ AI';

      return {
        success: true,
        analysis: analysis.trim(),
        suppliers_analyzed: 1,
        timestamp: new Date().toISOString(),
        model_used: this.model,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error analyzing supplier ${supplier.supplier_name}: ${err.message}`, err.stack);
      return {
        success: false,
        analysis: `Lỗi khi phân tích: ${err.message}. Vui lòng kiểm tra lại cấu hình API hoặc thử lại sau.`,
        suppliers_analyzed: 1,
        timestamp: new Date().toISOString(),
        model_used: this.model,
      };
    }
  }

  // Kiểm tra kết nối với HuggingFace API
  // Gửi một test message đơn giản để xác nhận API key và model hoạt động
  async testConnection(): Promise<{ connected: boolean; model: string }> {
    try {
      // Nếu chưa cấu hình API key thì trả về false luôn
      if (!this.hf) return { connected: false, model: this.model };
      // Gửi test request với max_tokens tối thiểu
      const testResponse = await this.hf.chatCompletion({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      return { connected: !!testResponse, model: this.model };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Connection test failed: ${err.message}`);
      return { connected: false, model: this.model };
    }
  }
}
