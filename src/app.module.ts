/**
 * 🏛️ AppModule - Root Module da Aplicação
 * Localização: src/app.module.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1):
 * ✅ ThrottlerModule.forRoot() - Rate limiting global
 * ✅ ThrottlerGuard como APP_GUARD - Aplicado em TODOS os endpoints
 * ✅ Limite global: 100 requisições/minuto
 * ✅ Limite específico: 3 tentativas/minuto em POST /auth/login (controller)
 *
 * Proteção contra: Brute force, DDoS, resource exhaustion, API abuse
 */

import { randomUUID } from 'node:crypto';
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BackupModule } from './module/backup/backup.module';
import { BudgetsModule } from './module/budgets/budgets.module';
import { CategoriesModule } from './module/categories/categories.module';
import { ExportModule } from './module/export/export.module';
import { ReportsModule } from './module/reports/reports.module';
import { TransactionsModule } from './module/transactions/transactions.module';
import { UsersModule } from './module/users/users.module';
import { ObservabilityModule } from './observability/observability.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req) => {
          const requestIdHeader = req.headers['x-request-id'];
          return typeof requestIdHeader === 'string' ? requestIdHeader : randomUUID();
        },
        customProps: () => ({
          context: 'HTTP',
        }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            userAgent: req.headers['user-agent'],
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
    /**
     * ⏱️ RATE LIMITING GLOBAL (@nestjs/throttler)
     *
     * Configuração:
     * - ttl: 60000 (ms) = 1 minuto
     * - limit: 100 = máximo 100 requisições por minuto
     *
     * Comportamento:
     * ✅ Requisição 1-100/min: Aceito (HTTP 200/201/etc)
     * ❌ Requisição 101+/min: Rejeito (HTTP 429 Too Many Requests)
     *    Header: Retry-After: X segundos
     *
     * Aplicação:
     * 1. Configurado GLOBALMENTE aqui (todos os endpoints)
     * 2. POST /auth/login tem limite MAIS RESTRITIVO (3/min) via @Throttle()
     *
     * Impacto de segurança:
     * - Brute force login: 3 tentativas/min = 180/hora
     * - 256 senhas possíveis = 1.4 minutos (impraticável para atacante)
     * - DDoS: Attacker pode fazer 100 requests/min por IP
     *         Com moderação, infraestrutura pode absorver
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto em ms
        limit: 100, // 100 requisições por minuto (limite global)
      },
    ]),
    TransactionsModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ReportsModule,
    BudgetsModule,
    ExportModule,
    BackupModule,
    ObservabilityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    /**
     * 🛡️ Registrar ThrottlerGuard como GUARD GLOBAL (APP_GUARD)
     *
     * O que faz:
     * - Intercepta TODAS as requisições HTTP
     * - Rastreia requisições por cliente (IP ou user ID)
     * - Se exceder limite (100/min), retorna HTTP 429
     *
     * Sem este provider:
     * ❌ ThrottlerModule.forRoot() não tem efeito
     * ❌ Endpoints não teriam rate limit
     * ❌ Vulnerável a brute force e DDoS
     *
     * Com este provider:
     * ✅ Todos os endpoints protegidos (100/min default)
     * ✅ POST /auth/login protegido mais rigorosamente (3/min)
     * ✅ Logs automáticos de tentativas bloqueadas
     */
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
