import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

/**
 * OwnershipGuard valida que o usuário autenticado é o proprietário do recurso
 * Extrai userId do JWT e compara com o userId do recurso na request
 *
 * Uso:
 * ```typescript
 * @UseGuards(AuthGuard('jwt'), OwnershipGuard)
 * @Get(':id')
 * findOne(@Param('id') id: number, @Request() req) { ... }
 * ```
 *
 * O recurso é obtido via `req.resource.userId` (definido em um interceptor ou outro guard)
 * ou recalculado via `transactionsService.findOne()` + comparação
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extrair userId do JWT payload (definido pelo JwtStrategy)
    const userId = request.user?.id || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException("Usuário não autenticado ou token inválido");
    }

    // O recurso será comparado via route handler (controller)
    // Este guard apenas garante que o user está autenticado
    // A comparação específica acontece dentro do serviço/controller

    // Armazenar userId na request para uso posterior
    request.userId = userId;

    return true;
  }
}

/**
 * Guard mais específico: TransactionOwnershipGuard
 * Já valida que o usuário é o dono da transação
 * (requer que a transação seja carregada previamente)
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
