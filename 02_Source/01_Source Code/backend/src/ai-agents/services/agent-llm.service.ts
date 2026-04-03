import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type LlmAgentProfile = {
  name: string;
  description: string;
  instructions: string[];
  model: string;
  tools: string[];
};

@Injectable()
export class AgentLlmService {
  private readonly logger = new Logger(AgentLlmService.name);
  private readonly llmTimeoutMs = 8000;

  constructor(private readonly configService: ConfigService) {}

  private safeJsonStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '{}';
    }
  }

  async generateReply(
    profile: LlmAgentProfile,
    userQuery: string,
    contextData: Record<string, unknown>,
  ): Promise<string | null> {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      return null;
    }

    try {
      const model =
        profile.model ||
        this.configService.get<string>('GEMINI_AGENT_MODEL') ||
        this.configService.get<string>('GEMINI_ROUTER_MODEL') ||
        'gemini-2.5-flash';

      const instructions = profile.instructions
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');

      const prompt = [
        `You are ${profile.name}.`,
        `Description: ${profile.description}`,
        'Instructions:',
        instructions,
        `Allowed tools: ${profile.tools.join(', ')}`,
        '',
        `User question: ${userQuery}`,
        `Database context JSON: ${this.safeJsonStringify(contextData)}`,
        '',
        'IMPORTANT RULES:',
        '1. Return ONLY natural-language Vietnamese answer for end users (no English).',
        '2. Use proper Vietnamese with proper tone marks (diacritical marks).',
        '3. Do not mix Vietnamese and English.',
        '4. Do not mention prompt, action fields, or technical details.',
        '5. If there are expiring/expired lots, summarize first in Vietnamese, then point users to the table below.',
        '6. Be concise and helpful.',
      ].join('\n');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.llmTimeoutMs);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 300,
            },
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(
          `LLM generation failed with status ${response.status}`,
        );
        return null;
      }

      const payload: unknown = await response.json();
      const payloadObj =
        typeof payload === 'object' && payload !== null
          ? (payload as Record<string, unknown>)
          : null;
      const candidates = Array.isArray(payloadObj?.candidates)
        ? (payloadObj?.candidates as Array<Record<string, unknown>>)
        : [];
      const firstCandidate = candidates[0];
      const content =
        firstCandidate && typeof firstCandidate.content === 'object'
          ? (firstCandidate.content as Record<string, unknown>)
          : null;
      const parts = Array.isArray(content?.parts)
        ? (content?.parts as Array<Record<string, unknown>>)
        : [];
      const firstPart = parts[0];
      const text =
        firstPart && typeof firstPart.text === 'string'
          ? firstPart.text.trim()
          : '';

      return this.sanitizeReply(text);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('LLM generation timed out. Falling back to template reply.');
        return null;
      }
      this.logger.warn(`LLM generation error: ${String(error)}`);
      return null;
    }
  }

  private sanitizeReply(raw: string): string | null {
    if (!raw) {
      return null;
    }

    const cleaned = raw
      .replace(/\*\*/g, '')
      .replace(/`{1,3}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 12) {
      return null;
    }

    const endsWithIncomplete = /[:;,-]$/.test(cleaned);
    if (endsWithIncomplete) {
      return null;
    }

    const hasValidEnding = /[.!?…]$/.test(cleaned);
    if (!hasValidEnding) {
      return null;
    }

    return cleaned;
  }
}
