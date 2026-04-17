/**
 * 🔐 LoginDto - Validação de Dados para Login (Autenticação)
 * Localização: src/auth/dto/login.dto.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1):
 * ✅ DTO separado para login (email + password apenas)
 * ✅ Mesmas validações rigorosas que CreateUserDto
 * ✅ Aplicado em: POST /auth/login
 *
 * Diferença vs CreateUserDto:
 * - CreateUserDto: name + email + password (criação de novo usuário)
 * - LoginDto: email + password (autenticação existente)
 * - LoginDto NÃO tem campo de nome, reduzindo superfície de ataque
 */

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class LoginDto {
  /**
   * 📧 Campo de Email
   * Validação: @IsEmail() + @IsNotEmpty()
   * Rejeita: "user@", "user@.com", emails vazios, null
   */
  @IsEmail({}, { message: "Email inválido" })
  @IsNotEmpty({ message: "Email é obrigatório" })
  email!: string;

  /**
   * 🔒 Campo de Senha (LOGIN)
   *
   * Validação: Mesma da CreateUserDto
   * - Mínimo 8 caracteres
   * - 1 maiúscula + 1 minúscula + 1 número obrigatórios
   *
   * Nota: A senha será comparada com bcrypt.compare() no auth.service.ts
   * O hash no DB já foi gerado na criação do usuário (CreateUserDto)
   * Aqui apenas validamos o formato antes de comparar
   */
  @IsString({ message: "Senha deve ser texto" })
  @MinLength(8, { message: "Senha deve ter no mínimo 8 caracteres" })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula e 1 número",
  })
  @IsNotEmpty({ message: "Senha é obrigatória" })
  password!: string;
}
