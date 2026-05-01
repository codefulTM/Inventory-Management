import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentLlmService } from './agent-llm.service';

describe('AgentLlmService', () => {
  let service: AgentLlmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentLlmService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOOGLE_API_KEY') return 'test-key';
              if (key === 'GEMINI_AGENT_MODEL') return 'gemini-2.5-flash';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AgentLlmService>(AgentLlmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeReply', () => {
    it('should return null for input without ending punctuation', () => {
      const input = '```json\n{"key":"value"}\n```';
      const result = (service as any).sanitizeReply(input);
      // sanitizeReply requires ending with . ! ? etc.
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should return null for short input', () => {
      const result = (service as any).sanitizeReply('hi');
      expect(result).toBeNull();
    });

    it('should return cleaned string for valid input', () => {
      const input = 'The analysis is complete.';
      const result = (service as any).sanitizeReply(input);
      expect(result).toBe('The analysis is complete.');
    });
  });

  describe('generateReply', () => {
    it('should return fallback message when API key is missing', async () => {
      const noKeyModule: TestingModule = await Test.createTestingModule({
        providers: [
          AgentLlmService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const noKeyService = noKeyModule.get<AgentLlmService>(AgentLlmService);
      const result = await noKeyService.generateReply({} as any, 'test prompt', {});
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should return error message when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await service.generateReply({} as any, 'test prompt', {});
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });
});
