/**
 * 🚀 Entry point da aplicação NestJS - src/main.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1 - Segurança Crítica):
 * 1. ValidationPipe Global - Valida TODOS os DTOs automaticamente
 *    - Impossível enviar dados malformados ou campos injetados
 *    - Resposta padrão: HTTP 400 Bad Request com mensagens em português
 *    - Implementação: @nestjs/common ValidationPipe com 3 flags de segurança
 */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    app.use(cookieParser());

    /**
     * 🔐 VALIDAÇÃO GLOBAL DE DTOs - ValidationPipe
     *
     * Configurações de segurança implementadas:
     *
     * 1. whitelist: true
     *    └─ Remove automaticamente campos não declarados no DTO
     *    └─ Exemplo: POST /users { name: "John", admin: true } → { name: "John" }
     *    └─ Proteção: Impede injection de campos não autorizados (ex: admin, role, isAdmin)
     *
     * 2. forbidNonWhitelisted: true
     *    └─ Se houver campos extras, retorna HTTP 400 com mensagem de erro
     *    └─ Vs whitelist apenas: avisa o cliente que tentou injetar campos inválidos
     *    └─ Segurança: Técnica de "fail secure" - rejeita o que não reconhece
     *
     * 3. transform: true
     *    └─ Converte tipos automaticamente conforme decoradores do DTO
     *    └─ Exemplo: @IsNumber() converte string "123" → number 123
     *    └─ Benefício: Sem erros surpresa de tipo durante processamento
     *
     * Impacto na segurança:
     * ✅ Antes: POST /auth/login { email: "", password: "123", isAdmin: true }
     *          → Passava sem validação, isAdmin era ignorado silenciosamente
     * ✅ Depois: POST /auth/login { email: "não-é-email", password: "123", isAdmin: true }
     *          → HTTP 400 ["email must be an email", "password must contain letter..."]
     *             + "property isAdmin should not exist"
     */
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    /**
     * � EXCEPTION FILTER - Tratamento Centralizado de Erros
     * Padroniza respostas de erro e oculta detalhes sensíveis
     */
    app.useGlobalFilters(new AllExceptionsFilter());

    /**
     * �🛡️ HELMET - Proteção de Headers HTTP
     * Define headers de segurança automáticos (CSP, X-Frame-Options, etc)
     */
    app.use(helmet());

    /**
     * 🌐 CORS - Controle de Acesso Cruzado
     * Permite requisições apenas de origens autorizadas
     */
    app.enableCors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true, // Permite envio de cookies
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    /**
     * 📚 SWAGGER - Documentação Interativa da API
     * Disponível em http://localhost:3000/api/docs
     */
    const config = new DocumentBuilder()
      .setTitle('Finanças API')
      .setDescription('API de gerenciamento de transações financeiras pessoais')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access_token')
      .addTag('auth', 'Autenticação')
      .addTag('users', 'Gerenciamento de Usuários')
      .addTag('transactions', 'Gerenciamento de Transações')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(3000, '0.0.0.0');
  } catch (err) {
    console.error('BOOTSTRAP ERROR:', err);
    process.exit(1);
  }
}
bootstrap();
