// Service gọi LLM (Google Gemini) để sinh phản hồi tự nhiên cho người dùng cuối
// Sử dụng Gemini API để tạo câu trả lời tiếng Việt dựa trên profile và context data
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Interface mô tả profile của một agent (dùng để gửi cho LLM)
type LlmAgentProfile = {
  name: string; // Tên agent
  description: string; // Mô tả nhiệm vụ
  instructions: string[]; // Các hướng dẫn cho LLM
  model: string; // Tên model sử dụng
  tools: string[]; // Danh sách công cụ agent có thể dùng
};

@Injectable()
export class AgentLlmService {
  private readonly logger = new Logger(AgentLlmService.name);
  private readonly llmTimeoutMs = 8000; // Timeout 8 giây cho LLM request

  constructor(private readonly configService: ConfigService) {}

  // Chuyển đổi an toàn object sang JSON string
  private safeJsonStringify(value: unknown): string {
    try { return JSON.stringify(value); } catch { return '{}'; }
  }

  // Sinh phản hồi tự nhiên từ LLM (Google Gemini) cho người dùng cuối
  // Đầu vào: Profile agent, câu hỏi người dùng, dữ liệu ngữ cảnh
  // Đầu ra: Văn bản tiếng Việt tự nhiên (đã làm sạch)
  async generateReply(
    profile: LlmAgentProfile,
    userQuery: string,
    contextData: Record<string, unknown>,
  ): Promise<string | null> {
    // Kiểm tra API key
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) return null;

    try {
      // Lấy tên model từ profile hoặc cấu hình
      const model =
        profile.model ||
        this.configService.get<string>('GEMINI_AGENT_MODEL') ||
        this.configService.get<string>('GEMINI_ROUTER_MODEL') ||
        'gemini-2.5-flash';

      // Định dạng instructions thành text
      const instructions = profile.instructions
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');

      // Tạo prompt cho Gemini
      const prompt = [
        `You are ${profile.name}.`, // Định danh vai trò
        `Description: ${profile.description}`, // Mô tả nhiệm vụ
        'Instructions:', // Các hướng dẫn
        instructions,
        `Allowed tools: ${profile.tools.join(', ')}`, // Công cụ được phép dùng
        '',
        `User question: ${userQuery}`, // Câu hỏi người dùng
        `Database context JSON: ${this.safeJsonStringify(contextData)}`, // Dữ liệu ngữ cảnh
        '',
        'IMPORTANT RULES:', // Các quy tắc quan trọng
        '1. Return ONLY natural-language Vietnamese answer for end users (no English).',
        '2. Use proper Vietnamese with proper tone marks (diacritical marks).',
        '3. Do not mix Vietnamese and English.',
        '4. Do not mention prompt, action fields, or technical details.',
        '5. If there are expiring/expired lots, summarize first in Vietnamese, then point users to the table below.',
        '6. Be concise and helpful.',
      ].join('\n');

      // Cấu hình timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.llmTimeoutMs);

      // Gọi Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 300 }, // temperature thấp để ổn định
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      // Kiểm tra HTTP status
      if (!response.ok) {
        this.logger.warn(`LLM generation failed with status ${response.status}`);
        return null;
      }

      // Parse phản hồi từ Gemini
      const payload: unknown = await response.json();
      const payloadObj = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null;
      const candidates = Array.isArray(payloadObj?.candidates) ? (payloadObj?.candidates as Array<Record<string, unknown>>) : [];
      const firstCandidate = candidates[0];
      const content = firstCandidate && typeof firstCandidate.content === 'object' ? (firstCandidate.content as Record<string, unknown>) : null;
      const parts = Array.isArray(content?.parts) ? (content?.parts as Array<Record<string, unknown>>) : [];
      const firstPart = parts[0];
      const text = firstPart && typeof firstPart.text === 'string' ? firstPart.text.trim() : '';

      // Làm sạch và trả về
      return this.sanitizeReply(text);
    } catch (error) {
      // Xử lý timeout
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('LLM generation timed out. Falling back to template reply.');
        return null;
      }
      this.logger.warn(`LLM generation error: ${String(error)}`);
      return null;
    }
  }

  // Làm sạch phản hồi từ LLM: Loại bỏ markdown, kiểm tra định dạng
  private sanitizeReply(raw: string): string | null {
    if (!raw) return null;
    // Xóa bold (**), code blocks (`), và gộp khoảng trắng
    const cleaned = raw.replace(/\*\*/g, '').replace(/`{1,3}/g, '').replace(/\s+/g, ' ').trim();
    // Bỏ qua nếu quá ngắn (<12 ký tự)
    if (cleaned.length < 12) return null;
    // Bỏ qua nếu kết thúc bằng dấu câu không hoàn chỉnh
    if (/[:;,-]$/.test(cleaned)) return null;
    // Phải kết thúc bằng dấu câu hoàn chỉnh (. ! ? …)
    if (!/[.!?…]$/.test(cleaned)) return null;
    return cleaned;
  }
}
