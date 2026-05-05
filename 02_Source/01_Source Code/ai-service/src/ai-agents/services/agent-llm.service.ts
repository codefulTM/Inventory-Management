// === AGENT LLM SERVICE ===
// Service gọi LLM (Google Gemini) để sinh phản hồi tự nhiên cho người dùng cuối

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type LlmAgentProfile = { name: string; description: string; instructions: string[]; model: string; tools: string[]; };

@Injectable()
export class AgentLlmService {
  private readonly logger = new Logger(AgentLlmService.name);
  private readonly llmTimeoutMs = 8000;

  constructor(private readonly configService: ConfigService) {}

  private safeJsonStringify(value: unknown): string {
    // [RÚT GỌN: JSON.stringify with try/catch fallback to '{}']
    throw new Error("Skeleton: not implemented");
  }

  async generateReply(profile: LlmAgentProfile, userQuery: string, contextData: Record<string, unknown>): Promise<string | null> {
    // [RÚT GỌN: Check GOOGLE_API_KEY, build prompt with profile/instructions/context, call Gemini API,
    //  parse response, clean markdown artifacts, return Vietnamese text]
    throw new Error("Skeleton: not implemented");
  }

  private extractTextFromGeminiResponse(payload: unknown): string | null {
    // [RÚT GỌN: Navigate Gemini response JSON structure to extract text content]
    throw new Error("Skeleton: not implemented");
  }

  private cleanLlmResponse(text: string): string {
    // [RÚT GỌN: Remove markdown code blocks, trim whitespace, remove non-Vietnamese artifacts]
    throw new Error("Skeleton: not implemented");
  }
}
