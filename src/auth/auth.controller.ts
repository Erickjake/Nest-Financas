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

import { Body, Controller, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { LoginDto } from "./dto/login.dto";
import type { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 🛡️ POST /auth/login - Autenticação com Rate Limiting
   * Rate limit: 3 tentativas/minuto (proteção contra brute force)
   * HTTP 400 se validação falha
   * HTTP 401 se credenciais erradas
   * HTTP 429 se exceder 3/min
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("login")
  async login(
    @Body() credentials: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.authService.signIn(
      credentials.email,
      credentials.password,
    );

    /**
     * Cookie seguro com 4 proteções:
     * httpOnly: true → XSS protection (JS não acessa)
     * secure: true (prod) → MITM protection (HTTPS only)
     * sameSite: "lax" → CSRF protection
     * maxAge: 1day → Force re-auth
     */
    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    return { message: "Login realizado com sucesso" };
  }

  /**
   * 🚪 POST /auth/logout - Limpar Sessão
   */
  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token");
    return { message: "Logout realizado" };
  }
}
