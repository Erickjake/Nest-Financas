/**
 * 🔐 AuthController - Controlador de Autenticação
 * Localização: src/auth/auth.controller.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1):
 * ✅ LoginDto tipado com validação rigorosa
 * ✅ @Throttle(3, 60000) - Rate limit 3 tentativas/minuto no login
 * ✅ Cookies seguros (httpOnly, secure, sameSite)
 *
 * FLUXO: Validação → Rate Limit → Autenticação → Cookie Seguro
 */

import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 🛡️ POST /auth/login - Autenticação com Rate Limiting
   * Rate limit: 3 tentativas/minuto (proteção contra brute force)
   * HTTP 400 se validação falha
   * HTTP 401 se credenciais erradas
   * HTTP 429 se exceder 3/min
   */
  @ApiOperation({
    summary: 'Autenticar usuário',
    description:
      'Realiza login com email e senha. Limit: 3 tentativas/minuto (proteção contra brute force). Retorna JWT no cookie httpOnly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso. JWT definido no cookie httpOnly.',
    schema: { example: { message: 'Login realizado com sucesso' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados de login inválidos (email ou senha fora do formato).',
    schema: {
      example: {
        statusCode: 400,
        message: ['Email inválido', 'Senha deve ter no mínimo 8 caracteres'],
        timestamp: '2026-04-19T12:00:00.000Z',
        path: '/auth/login',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais incorretas (email não encontrado ou senha errada).',
  })
  @ApiResponse({
    status: 429,
    description: 'Excedeu o limite de 3 tentativas/minuto. Aguarde para tentar novamente.',
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() credentials: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.signIn(credentials.email, credentials.password);

    /**
     * Cookie seguro com 4 proteções:
     * httpOnly: true → XSS protection (JS não acessa)
     * secure: true (prod) → MITM protection (HTTPS only)
     * sameSite: "lax" → CSRF protection
     * maxAge: 1day → Force re-auth
     */
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return { message: 'Login realizado com sucesso' };
  }

  /**
   * 🚪 POST /auth/logout - Limpar Sessão
   */
  @ApiOperation({
    summary: 'Fazer logout',
    description: 'Limpa o token JWT removendo o cookie de autenticação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso.',
    schema: { example: { message: 'Logout realizado' } },
  })
  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Logout realizado' };
  }
}
