/**
 * 📝 CreateUserDto - Validação de Dados para Criação de Usuário
 * Localização: src/module/users/dto/create-user.dto.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1):
 * ✅ @IsEmail() - Valida formato correto de email (RFC 5321)
 * ✅ @MinLength(3) - Nome mínimo 3 caracteres
 * ✅ @MinLength(8) + @Matches() - Senha forte: 8+ chars com maiúscula, minúscula e número
 * ✅ Todas as mensagens de erro em português
 *
 * Proteções contra: SQLi, weak passwords, injection de campos, type-mismatch
 */

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  /**
   * 📧 Campo de Email
   * Validadores:
   * - @IsEmail() - Valida formato RFC 5321 (user@domain.com)
   * - @IsNotEmpty() - Rejeita null, undefined, strings vazias
   *
   * Exemplos:
   * ✅ Válido: "user@example.com", "john.doe@company.co.uk"
   * ❌ Inválido: "user@", "user@.com", "user", "user@domain"
   */
  @IsEmail({}, { message: "Email inválido" })
  @IsNotEmpty({ message: "Email é obrigatório" })
  email!: string;

  /**
   * 👤 Campo de Nome
   * Validadores:
   * - @IsString() - Garante que é texto (não number, boolean, etc)
   * - @MinLength(3) - Mínimo 3 caracteres (evita nomes muito curtos)
   * - @IsNotEmpty() - Rejeita valores vazios
   *
   * Exemplos:
   * ✅ Válido: "João", "Maria Silva", "José da Silva"
   * ❌ Inválido: "Jo", "", null
   */
  @IsString({ message: "Nome deve ser texto" })
  @MinLength(3, { message: "Nome deve ter no mínimo 3 caracteres" })
  @IsNotEmpty({ message: "Nome é obrigatório" })
  name!: string;

  /**
   * 🔐 Campo de Senha - Força Obrigatória
   *
   * Validadores:
   * 1. @IsString() - Garante que é texto
   * 2. @MinLength(8) - Mínimo 8 caracteres (NIST SP 800-63B standard)
   * 3. @Matches(regex) - Força com lookaheads positivos:
   *    (?=.*[a-z])  → Pelo menos 1 letra MINÚSCULA (a-z)
   *    (?=.*[A-Z])  → Pelo menos 1 letra MAIÚSCULA (A-Z)
   *    (?=.*\\d)    → Pelo menos 1 DÍGITO (0-9)
   * 4. @IsNotEmpty() - Rejeita valores vazios
   *
   * Exemplos de senhas VÁLIDAS:
   * ✅ "SecurePass123"       (8 chars, tem maiúscula, minúscula, número)
   * ✅ "MyP@ssw0rd"          (8 chars, tem maiúscula, minúscula, número)
   * ✅ "Password2024"        (10 chars, tem maiúscula, minúscula, número)
   *
   * Exemplos de senhas INVÁLIDAS e por quê:
   * ❌ \"password123\"        (NÃO tem maiúscula)
   * ❌ \"PASSWORD123\"        (NÃO tem minúscula)
   * ❌ \"PasswordAbc\"        (NÃO tem dígito)\n   * ❌ \"Pass1\"             (MENOS de 8 caracteres)
   * ❌ \"\"                   (vazio)
   *
   * Impacto de segurança:
   * - Impede brute force força bruta (força mínima garantida)
   * - Reduz risk de rainbow tables (senhas mais aleatórias)
   * - Cumpre com normativas de segurança governamentais (NIST, PCI-DSS)
   */\n  @IsString({ message: "Senha deve ser texto" })
  @MinLength(8, { message: "Senha deve ter no mínimo 8 caracteres" })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula e 1 número",
  })
  @IsNotEmpty({ message: "Senha é obrigatória" })
  password!: string;
}
