import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class LoginThrottleGuard extends ThrottlerGuard {
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;

    // Extrai o request do ExecutionContext para resolver o aviso do "any"
    const request = context.switchToHttp().getRequest();

    if (request.path === '/auth/login' && request.method === 'POST') {
      requestProps.limit = 3;
      requestProps.ttl = 60000; // 60 segundos em milissegundos
    }

    // Repassa o objeto atualizado para o método base
    return super.handleRequest(requestProps);
  }
}
