import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId?: string | number; sub?: string | number };
}

import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('ai')
@ApiBearerAuth('access_token')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('chat')
  @ApiOperation({
    summary: 'Conversar com o assistente financeiro',
    description:
      'Envia mensagens para a IA e recebe a resposta completa. Suporta histórico de conversa multi-turno.',
  })
  @ApiResponse({ status: 200, description: 'Resposta da IA' })
  @ApiResponse({
    status: 429,
    description: 'Limite de requisições excedido (10/min)',
  })
  async chat(@Req() req: AuthenticatedRequest, @Body() chatDto: ChatDto) {
    const userId = Number(req.user.userId || req.user.sub);
    const response = await this.aiService.chat(userId.toString(), chatDto.messages);
    return { response };
  }

  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('chat/stream')
  @ApiOperation({
    summary: 'Conversar com o assistente financeiro (streaming)',
    description:
      'Envia mensagens para a IA e recebe a resposta em tempo real via Server-Sent Events (SSE). Ideal para interfaces que exibem a resposta sendo digitada.',
  })
  @ApiResponse({ status: 200, description: 'Stream de texto da IA via SSE' })
  @ApiResponse({
    status: 429,
    description: 'Limite de requisições excedido (10/min)',
  })
  async chatStream(
    @Req() req: AuthenticatedRequest,
    @Body() chatDto: ChatDto,
    @Res() res: Response,
  ) {
    const userId = Number(req.user.userId || req.user.sub);
    const result = this.aiService.chatStream(userId.toString(), chatDto.messages);

    if (!result) {
      res.status(500).json({ error: 'Falha ao iniciar streaming' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = result.textStream;

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
