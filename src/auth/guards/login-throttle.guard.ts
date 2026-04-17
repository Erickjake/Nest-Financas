import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * LoginThrottleGuard - Rate limiting customizado para login
 * Bem mais restritivo: 3 tentativas por minuto
 * Evita brute force de senhas
 */
@Injectable()
export class LoginThrottleGuard extends ThrottlerGuard {
  async handleRequest(
    context: any,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    // Para POST /auth/login: máx 3 tentativas por 60 segundos
    const request = context.switchToHttp().getRequest();
    if (request.path === "/auth/login" && request.method === "POST") {
      limit = 3;
      ttl = 60;
    }
    return super.handleRequest(context, limit, ttl);
  }
}
