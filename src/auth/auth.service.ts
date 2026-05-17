import { randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { StringValue } from "ms";
import { UsersService } from "../module/users/users.service";

type AuthTokenPayload = {
  sub: number;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private getAccessSecret() {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined");
    return process.env.JWT_SECRET;
  }

  private getRefreshSecret() {
    if (!process.env.JWT_REFRESH_SECRET)
      throw new Error("JWT_REFRESH_SECRET is not defined");
    return process.env.JWT_REFRESH_SECRET;
  }

  private getAccessExpiresIn(): number | StringValue {
    return (process.env.JWT_EXPIRES_IN as StringValue | undefined) || "15m";
  }

  private getRefreshExpiresIn(): number | StringValue {
    return (
      (process.env.JWT_REFRESH_EXPIRES_IN as StringValue | undefined) || "7d"
    );
  }

  private async generateAuthTokens(payload: AuthTokenPayload) {
    const accessPayload = { ...payload, tokenId: randomUUID() };
    const refreshPayload = { ...payload, tokenId: randomUUID() };

    const access_token = await this.jwtService.signAsync(accessPayload, {
      secret: this.getAccessSecret(),
      expiresIn: this.getAccessExpiresIn(),
    });

    const refresh_token = await this.jwtService.signAsync(refreshPayload, {
      secret: this.getRefreshSecret(),
      expiresIn: this.getRefreshExpiresIn(),
    });

    return { access_token, refresh_token };
  }

  private async saveRefreshTokenHash(userId: number, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);
  }

  async signIn(email: string, pass: string) {
    // 1. Busca o usuário no banco (Neon) pelo e-mail
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }

    // 2. Verifica se o usuário existe e se a senha bate com o hash salvo
    const isMatch = await bcrypt.compare(pass, user.password);

    if (!isMatch) {
      // Se a senha estiver errada, lançamos um erro 401 (Unauthorized)
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }

    // 3. Prepara o payload dos tokens
    const payload = {
      sub: user.id,
      email: user.email,
    };

    // 4. Gera tokens + persiste hash do refresh token para revogação
    const tokens = await this.generateAuthTokens(payload);
    await this.saveRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token ausente");
    }

    let payload: AuthTokenPayload;
    // Hoist outside try-catch so config errors propagate as 500, not 401
    const refreshSecret = this.getRefreshSecret();

    try {
      payload = await this.jwtService.verifyAsync<AuthTokenPayload>(
        refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException("Refresh token inválido");
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException("Usuário inválido para refresh token");
    }

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException("Refresh token revogado");
    }

    const isRefreshTokenMatch = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!isRefreshTokenMatch) {
      throw new UnauthorizedException("Refresh token inválido");
    }

    const tokens = await this.generateAuthTokens({
      sub: user.id,
      email: user.email,
    });

    await this.saveRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    // Hoist outside try-catch so config errors propagate, not get silently swallowed
    const refreshSecret = this.getRefreshSecret();

    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(
        refreshToken,
        {
          secret: refreshSecret,
        },
      );

      const user = await this.usersService.findByEmail(payload.email);
      if (!user || user.id !== payload.sub || !user.refreshTokenHash) {
        return;
      }

      const isRefreshTokenMatch = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );
      if (!isRefreshTokenMatch) {
        return;
      }

      await this.usersService.setRefreshTokenHash(user.id, null);
    } catch {
      // Não bloqueia logout do cliente em caso de token inválido/expirado.
    }
  }
}
