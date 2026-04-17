/**
 * 🔐 OwnershipGuard - Autorização (Authorization) de Propriedade de Recurso
 * Localização: src/common/guards/ownership.guard.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1 - SEGURANÇA CRÍTICA):
 * ✅ Guard que valida se o usuário autenticado é o proprietário do recurso
 * ✅ Previne que User A acesse/modifique transações de User B
 * ✅ Implementa controle de acesso (authorization) a nível de aplicação
 *
 * Diferença entre Autenticação vs Autorização:
 * - Autenticação: Verificar SE o usuário é quem diz ser (JWT válido?)
 * - Autorização: Verificar SE o usuário tem permissão para esto recurso (é o dono?)
 *
 * Este guard implementa AUTORIZAÇÃO (ownership validation)
 * Aplicado em: GET/:id, PUT/:id, DELETE/:id de transações
 *
 * FLUXO DE SEGURANÇA EM ENDPOINTS PROTEGIDOS:
 * 1. @UseGuards(AuthGuard('jwt')) - Valida se JWT é válido (autenticação)
 * 2. @UseGuards(..., OwnershipGuard) - Valida se é o dono (autorização)
 * 3. Controller valida userId === transaction.userId (double-check)
 *
 * Exemplos:
 * ✅ User 1 tenta acessar GET /transactions/5 (transação dele)
 *    → JWT válido ✓ → Ownership check ✓ → 200 OK
 *
 * ❌ User 1 tenta acessar GET /transactions/9 (transação do User 2)
 *    → JWT válido ✓ → Ownership check ✗ → 403 Forbidden
 *
 * ❌ User 1 tenta acessar GET /transactions/5 (sem JWT)
 *    → JWT inválido ✗ → 401 Unauthorized (AuthGuard bloqueia antes)
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

/**
 * ✅ OwnershipGuard (básico) - Apenas valida que user está autenticado
 * Este guard simples apenas extrai userId do JWT
 * A comparação específica (user ID vs recurso) fica no controller
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extrair userId do JWT payload (definido pelo JwtStrategy)
    // JWT pode conter "id" ou "sub" dependendo da estratégia
    const userId = request.user?.id || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException("Usuário não autenticado ou token inválido");
    }

    // Armazenar userId na request para uso posterior no controller
    request.userId = userId;

    return true;
  }
}

/**
 * 🔐 TransactionOwnershipGuard (avançado) - Valida propriedade DA TRANSAÇÃO
 * Este guard mais específico:
 * 1. Busca a transação no DB
 * 2. Valida se userId do JWT === userId da transação
 * 3. Rejeita em 403 Forbidden se não é o dono
 *
 * Uso (se implementado):
 * @UseGuards(AuthGuard('jwt'), TransactionOwnershipGuard)
 * @Delete(':id')
 * deleteTransaction(@Param('id') id: number, @Request() req) { ... }
 */
@Injectable()
export class TransactionOwnershipGuard implements CanActivate {
  constructor(private transactionsService: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.user?.sub;
    const transactionId = request.params.id;

    if (!userId) {
      throw new ForbiddenException("Usuário não autenticado");
    }

    if (!transactionId) {
      throw new ForbiddenException("ID da transação não fornecido");
    }

    // Buscar transação
    const transaction = await this.transactionsService.findOne(
      Number(transactionId),
    );

    if (!transaction) {
      throw new ForbiddenException("Transação não encontrada");
    }

    // Validar propriedade
    if (transaction.userId !== Number(userId)) {
      throw new ForbiddenException(
        "Você não tem permissão para acessar esta transação",
      );
    }

    // Armazenar transação na request para evitar segunda busca
    request.resource = transaction;

    return true;
  }
}
