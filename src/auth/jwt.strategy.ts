import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 💡 O segredo: extraímos o JWT de dentro do cookie chamado 'access_token'
      jwtFromRequest: (req: Request) => {
        return req?.cookies?.access_token || null;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'CHAVE_SUPER_SECRETA',
    });
  }

  async validate(payload: any) {
    // O que retornarmos aqui será anexado ao 'req.user'
    return { userId: payload.sub, email: payload.email };
  }
}
