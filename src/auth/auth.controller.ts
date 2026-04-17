import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.authService.signIn(body.email, body.password);

    // 🛡️ Configuramos o cookie seguro
    res.cookie('access_token', access_token, {
      httpOnly: true, // O JavaScript não consegue ler
      secure: process.env.NODE_ENV === 'production', // Só envia via HTTPS em prod
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    });

    return { message: 'Login realizado com sucesso' };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Logout realizado' };
  }
}
