import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiService } from './ai.service';

// Mock do AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  stepCountIs: vi.fn(() => () => true),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-model'),
}));

vi.mock('./tools/finance.tools', () => ({
  createFinanceTools: vi.fn(() => ({})),
}));

describe('AiService', () => {
  let service: AiService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {};
    service = new AiService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('deve logar warning quando OPENAI_API_KEY não está definida', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const warnSpy = vi.spyOn((service as any).logger, 'warn');
      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('OPENAI_API_KEY'),
      );

      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });

    it('não deve logar warning quando OPENAI_API_KEY está definida', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const warnSpy = vi.spyOn((service as any).logger, 'warn');
      service.onModuleInit();

      expect(warnSpy).not.toHaveBeenCalled();

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });
  });

  describe('chat', () => {
    it('deve lançar erro quando OPENAI_API_KEY não está definida', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      await expect(
        service.chat('1', [{ role: 'user', content: 'Olá' }]),
      ).rejects.toThrow(InternalServerErrorException);

      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });

    it('deve chamar generateText com os parâmetros corretos', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const { generateText } = await import('ai');
      const mockedGenerateText = vi.mocked(generateText);
      mockedGenerateText.mockResolvedValueOnce({
        text: 'Resposta da IA',
      } as any);

      const messages = [{ role: 'user' as const, content: 'Qual meu saldo?' }];
      const result = await service.chat('1', messages);

      expect(result).toBe('Resposta da IA');
      expect(mockedGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
          stopWhen: expect.any(Function),
          system: expect.stringContaining('assistente financeiro'),
        }),
      );

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it('deve lançar InternalServerErrorException quando generateText falha', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const { generateText } = await import('ai');
      const mockedGenerateText = vi.mocked(generateText);
      mockedGenerateText.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        service.chat('1', [{ role: 'user', content: 'Olá' }]),
      ).rejects.toThrow(InternalServerErrorException);

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });
  });

  describe('chatStream', () => {
    it('deve lançar erro quando OPENAI_API_KEY não está definida', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() =>
        service.chatStream('1', [{ role: 'user', content: 'Olá' }]),
      ).toThrow(InternalServerErrorException);

      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });

    it('deve chamar streamText com os parâmetros corretos', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const { streamText } = await import('ai');
      const mockedStreamText = vi.mocked(streamText);
      mockedStreamText.mockReturnValueOnce({
        textStream: (async function* () { yield 'chunk'; })(),
      } as any);

      const messages = [{ role: 'user' as const, content: 'Olá' }];
      service.chatStream('1', messages);

      expect(mockedStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
          stopWhen: expect.any(Function),
        }),
      );

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });
  });
});
