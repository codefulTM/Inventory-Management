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
  private hf: HfInference;
  private model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    this.model =
      this.configService.get<string>('HUGGINGFACE_MODEL') ||
      'Qwen/Qwen2.5-72B-Instruct';

    if (!apiKey) {
      this.logger.warn('HUGGINGFACE_API_KEY is not configured — AI supplier analysis will return errors');
      // Don't throw so the service starts even without the key
      this.hf = null as unknown as HfInference;
    } else {
      this.hf = new HfInference(apiKey);
      this.logger.log(`AI Supplier Service initialized with model: ${this.model}`);
    }
  }

  private extractJsonBlock(content: string): string {
    const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) return fencedMatch[1].trim();
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return content.slice(firstBrace, lastBrace + 1).trim();
    }
    return content.trim();
  }

  private pickTop3SuppliersFallback(
    suppliers: SupplierPerformanceRecord[],
  ): SupplierPerformanceRecord[] {
    if (suppliers.length <= 3) return suppliers;

    const sortedByQuality = [...suppliers].sort((a, b) => b.quality_rate - a.quality_rate);
    const sortedByVolume = [...suppliers].sort((a, b) => b.total_batches - a.total_batches);
    const sortedByRejected = [...suppliers].sort((a, b) => b.rejected - a.rejected);

    const selected: SupplierPerformanceRecord[] = [];

    const risingSupplier = sortedByQuality.find((s) => s.total_batches <= 30);
    if (risingSupplier) selected.push(risingSupplier);

    const volumeSupplier = sortedByVolume.find(
      (s) => !selected.some((p) => p.supplier_name === s.supplier_name),
    );
    if (volumeSupplier) selected.push(volumeSupplier);

    const riskySupplier = sortedByRejected.find(
      (s) => !selected.some((p) => p.supplier_name === s.supplier_name),
    );
    if (riskySupplier) selected.push(riskySupplier);

    for (const supplier of sortedByQuality) {
      if (selected.length >= 3) break;
      if (!selected.some((p) => p.supplier_name === supplier.supplier_name)) {
        selected.push(supplier);
      }
    }

    return selected.slice(0, 3);
  }

  private async selectTop3SuppliersWithAi(suppliers: SupplierPerformanceRecord[]): Promise<{
    selectedSuppliers: SupplierPerformanceRecord[];
    selectionRationale: string;
  }> {
    if (suppliers.length <= 3) {
      return {
        selectedSuppliers: suppliers,
        selectionRationale: 'Danh sách có từ 3 nhà cung cấp trở xuống nên dùng toàn bộ để phân tích.',
      };
    }

    const tableRows = suppliers
      .map((s, i) => `${i + 1}. ${s.supplier_name} | Tổng lô: ${s.total_batches} | Đạt: ${s.approved} | Không đạt: ${s.rejected} | Tỷ lệ chất lượng: ${s.quality_rate}%`)
      .join('\n');

    const selectorSystemPrompt = `Bạn là AI agent tuyển chọn nhà cung cấp nổi bật cho dashboard QC.
Nhiệm vụ: Chọn đúng 3 nhà cung cấp theo 3 nhóm sau (mỗi nhóm 1 nhà cung cấp):
1) Nhà cung cấp mới nổi: số lô tương đối ít nhưng tỷ lệ chất lượng cao.
2) Nhà cung cấp trụ cột: số lô lớn, chất lượng nhìn chung tốt nhưng chưa thật sự xuất sắc.
3) Nhà cung cấp rủi ro: có dấu hiệu lỗi nhiều, cần giám sát.
Chỉ trả JSON hợp lệ, không trả thêm văn bản.`;

    const selectorUserPrompt = `Dữ liệu nhà cung cấp:\n${tableRows}\n\nTrả về JSON theo đúng schema:\n{\n  "selected_indexes": [number, number, number],\n  "rationale": "string"\n}\n\nYêu cầu:\n- selected_indexes dùng index 1-based theo danh sách đã cho.\n- Chọn đúng 3 index khác nhau.\n- rationale giải thích ngắn gọn vì sao chọn 3 nhà cung cấp này.`;

    try {
      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: selectorSystemPrompt },
          { role: 'user', content: selectorUserPrompt },
        ],
        max_tokens: 220,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content ?? '';
      const jsonText = this.extractJsonBlock(content);
      const parsed = JSON.parse(jsonText) as { selected_indexes?: number[]; rationale?: string };

      const uniqueIndexes = Array.isArray(parsed.selected_indexes)
        ? Array.from(new Set(parsed.selected_indexes))
        : [];

      const selectedSuppliers = uniqueIndexes
        .map((idx) => suppliers[idx - 1])
        .filter((item): item is SupplierPerformanceRecord => Boolean(item))
        .slice(0, 3);

      if (selectedSuppliers.length === 3) {
        return {
          selectedSuppliers,
          selectionRationale: parsed.rationale?.trim() || 'AI đã chọn 3 nhà cung cấp tiêu biểu theo mức độ nổi bật và rủi ro.',
        };
      }
      throw new Error('AI selector did not return 3 valid supplier indexes');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`AI selector failed, fallback to heuristic selection: ${err.message}`);
      return {
        selectedSuppliers: this.pickTop3SuppliersFallback(suppliers),
        selectionRationale: 'Dùng cơ chế chọn dự phòng theo heuristic: mới nổi chất lượng cao, trụ cột sản lượng lớn, và nhóm rủi ro lỗi cao.',
      };
    }
  }

  async analyzeSuppliers(suppliers: SupplierPerformanceRecord[]): Promise<SupplierAnalysisResponseDto> {
    try {
      this.logger.log(`Analyzing ${suppliers.length} suppliers`);

      const { selectedSuppliers, selectionRationale } = await this.selectTop3SuppliersWithAi(suppliers);

      const systemPrompt = `Bạn là chuyên gia quản lý chuỗi cung ứng và kiểm soát chất lượng với hơn 10 năm kinh nghiệm trong ngành dược phẩm và thực phẩm chức năng. Nhiệm vụ của bạn là phân tích hiệu suất các nhà cung cấp dựa trên dữ liệu QC test và đưa ra:
1. Xếp hạng rủi ro (Thấp / Trung bình / Cao) cho từng nhà cung cấp
2. Nhận xét ngắn gọn điểm mạnh / yếu
3. Khuyến nghị hành động: tiếp tục hợp tác, tăng cường giám sát, hoặc xem xét thay thế
Trả lời bằng tiếng Việt, chuyên nghiệp, có cấu trúc rõ ràng theo từng nhà cung cấp.`;

      const tableRows = selectedSuppliers
        .map((s, i) => `${i + 1}. ${s.supplier_name} | Tổng lô: ${s.total_batches} | Đạt: ${s.approved} | Không đạt: ${s.rejected} | Tỷ lệ chất lượng: ${s.quality_rate}%`)
        .join('\n');

      const userPrompt = `Phân tích hiệu suất 3 nhà cung cấp nổi bật sau dựa trên dữ liệu QC test:\n\nLý do chọn 3 nhà cung cấp: ${selectionRationale}\n\n${tableRows}\n\nLưu ý: Tỷ lệ chất lượng < 80% được coi là rủi ro cao, 80-95% là trung bình, > 95% là thấp.\n\nHãy phân tích từng nhà cung cấp và đưa ra tổng kết cuối. Kết luận cần có thứ tự ưu tiên hành động (cao đến thấp).`;

      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      const analysis = response.choices[0]?.message?.content || 'Không có phản hồi từ AI';

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
      return {
        success: false,
        analysis: `Lỗi khi phân tích: ${err.message}. Vui lòng kiểm tra lại cấu hình API hoặc thử lại sau.`,
        suppliers_analyzed: Math.min(3, suppliers.length),
        timestamp: new Date().toISOString(),
        model_used: this.model,
      };
    }
  }

  async analyzeOneSupplier(supplier: SupplierPerformanceRecord): Promise<SupplierAnalysisResponseDto> {
    try {
      this.logger.log(`Analyzing supplier: ${supplier.supplier_name}`);

      const riskLevel = supplier.quality_rate < 80 ? 'CAO' : supplier.quality_rate < 95 ? 'TRUNG BÌNH' : 'THẤP';

      const systemPrompt = `Bạn là chuyên gia quản lý chuỗi cung ứng và kiểm soát chất lượng với hơn 10 năm kinh nghiệm trong ngành dược phẩm và thực phẩm chức năng. Nhiệm vụ của bạn là phân tích chi tiết hiệu suất một nhà cung cấp và đưa ra nhận xét chuyên sâu, khuyến nghị cụ thể. Trả lời bằng tiếng Việt, chuyên nghiệp.`;

      const userPrompt = `Phân tích chi tiết nhà cung cấp sau:\n\nTên nhà cung cấp: ${supplier.supplier_name}\nTổng số lô hàng: ${supplier.total_batches}\nSố lô đạt QC: ${supplier.approved}\nSố lô không đạt QC: ${supplier.rejected}\nTỷ lệ chất lượng: ${supplier.quality_rate}%\nMức rủi ro ước tính: ${riskLevel}\n\nYêu cầu phân tích:\n1. Đánh giá tổng thể hiệu suất nhà cung cấp\n2. Phân tích điểm mạnh và điểm yếu\n3. Xác định rủi ro tiềm ẩn nếu có\n4. Đưa ra khuyến nghị hành động cụ thể`;

      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 400,
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

  async testConnection(): Promise<{ connected: boolean; model: string }> {
    try {
      if (!this.hf) return { connected: false, model: this.model };
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
