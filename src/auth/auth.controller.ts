import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { LoginDto } from "./dto/login.dto";
import type { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  // 🛡️ Rate limit: máx 3 tentativas por 60 segundos no login
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

    // 🛡️ Configuramos o cookie seguro
    res.cookie("access_token", access_token, {
      httpOnly: true, // O JavaScript não consegue ler
      secure: process.env.NODE_ENV === "production", // Só envia via HTTPS em prod
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    });

    return { message: "Login realizado com sucesso" };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token");
    return { message: "Logout realizado" };
  }
}
