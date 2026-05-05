import { createGroq } from '@ai-sdk/groq';
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { type ModelMessage, generateText, stepCountIs, streamText } from 'ai';
import { PrismaService } from '../../prisma/prisma.service';
import { createFinanceTools } from './tools/finance.tools';

const SYSTEM_PROMPT = `Você é um assistente financeiro útil e educado.
Sua missão é ajudar o usuário a entender suas finanças pessoais.
Use as ferramentas disponíveis para buscar dados em tempo real da conta do usuário.
Sempre que o usuário perguntar sobre valores, transações, saldo ou orçamentos, use as tools para buscar os dados reais.
Responda sempre em português do Brasil (pt-BR).
Formate sua resposta em Markdown simples.
Seja conciso, mas forneça insights úteis.`;

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!process.env.GROQ_API_KEY) {
      this.logger.warn(
        'GROQ_API_KEY não está configurada. O módulo de IA não funcionará corretamente.',
      );
    }
  }

  private getModel() {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return groq('llama-3.3-70b-versatile');
  }

  /**
   * Chat com resposta completa (não-streaming).
   * Aceita um array de mensagens para manter histórico de conversa.
   */
  async chat(userId: string, messages: ModelMessage[]): Promise<string> {
    this.validateApiKey();

    try {
      const { text } = await generateText({
        model: this.getModel(),
        messages,
        system: SYSTEM_PROMPT,
        tools: createFinanceTools(this.prisma, userId),
        stopWhen: stepCountIs(5),
      });

      return text;
    } catch (error: unknown) {
      this.handleAiError(error);
    }
  }

  /**
   * Chat com streaming via Server-Sent Events.
   * Retorna um StreamTextResult para ser consumido pelo controller.
   */
  chatStream(userId: string, messages: ModelMessage[]): { textStream: AsyncIterable<string> } {
    this.validateApiKey();

    try {
      const result = streamText({
        model: this.getModel(),
        messages,
        system: SYSTEM_PROMPT,
        tools: createFinanceTools(this.prisma, userId),
        stopWhen: stepCountIs(5),
      });

      return result;
    } catch (error: unknown) {
      this.handleAiError(error);
    }
  }

  private validateApiKey(): void {
    if (!process.env.GROQ_API_KEY) {
      throw new InternalServerErrorException(
        'A chave GROQ_API_KEY não está configurada no ambiente.',
      );
    }
  }

  private handleAiError(error: unknown): never {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    this.logger.error({ err: error }, `Erro ao chamar a API de IA: ${message}`);
    throw new InternalServerErrorException(
      `Falha ao processar a resposta da IA. Detalhe: ${message}`,
    );
  }
}
