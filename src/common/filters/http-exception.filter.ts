/**
 * 🚨 HTTP Exception Filter - Tratamento Centralizado de Erros
 * Localização: src/common/filters/http-exception.filter.ts
 *
 * FUNCIONALIDADE:
 * ✅ Intercepta TODAS as exceções da aplicação
 * ✅ Padroniza respostas de erro em JSON estruturado
 * ✅ Esconde detalhes sensíveis em produção
 * ✅ Log estruturado de erros (timestamp, path, status, mensagem)
 *
 * BENEFÍCIOS:
 * - Cliente recebe sempre { statusCode, message, timestamp, path }
 * - Sem stack traces expostos em produção
 * - Debugging facilitado com logs estruturados
 * - Respostas de validação com lista de erros
 */

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';

    // Se for uma exceção HTTP (ValidationError, NotFoundException, etc)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extrair mensagem de validação ou genérica
      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string | string[]) ||
          (responseObj.error as string) ||
          'Erro desconhecido';
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      // Erros não-HTTP (database, parsing, etc)
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);

      // Em produção, ocultar detalhes técnicos
      if (process.env.NODE_ENV === 'production') {
        message = 'Erro ao processar requisição';
      } else {
        message = exception.message;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log estruturado
    this.logger.warn(`[${request.method}] ${request.url} → ${status} | ${JSON.stringify(message)}`);

    response.status(status).json(errorResponse);
  }
}
