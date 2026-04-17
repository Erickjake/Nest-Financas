import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UsersService } from '../module/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string) {
    // 1. Busca o usuário no banco (Neon) pelo e-mail
    const user = await this.usersService.findByEmail(email);

    // 2. Verifica se o usuário existe e se a senha bate com o hash salvo
    const isMatch = user ? await bcrypt.compare(pass, user.password) : false;

    if (!isMatch) {
      // Se a senha estiver errada, lançamos um erro 401 (Unauthorized)
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // 3. Prepara o Payload (os dados que vão "viver" dentro do token)
    const payload = {
      sub: user?.id,
      email: user?.email,
    };

    // 4. Retorna o token assinado
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
