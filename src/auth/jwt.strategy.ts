import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import '../env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');

    super({
      // 💡 O segredo: extraímos o JWT de dentro do cookie chamado 'access_token'
      jwtFromRequest: (req: Request) => {
        return req?.cookies?.access_token || null;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: number; email: string }) {
    // O que retornarmos aqui será anexado ao 'req.user'
    return { userId: payload.sub, email: payload.email };
  }
}
