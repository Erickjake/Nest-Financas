/**
 * 🚀 Entry point da aplicação NestJS - src/main.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1 - Segurança Crítica):
 * 1. ValidationPipe Global - Valida TODOS os DTOs automaticamente
 *    - Impossível enviar dados malformados ou campos injetados
 *    - Resposta padrão: HTTP 400 Bad Request com mensagens em português
 *    - Implementação: @nestjs/common ValidationPipe com 3 flags de segurança
 */
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log", "debug", "verbose"],
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

    await app.listen(3000, "0.0.0.0");
  } catch (err) {
    console.error("BOOTSTRAP ERROR:", err);
    process.exit(1);
  }
}
bootstrap();
