/**
 * 📊 TransactionsService - Lógica de Negócio para Transações
 * Localização: src/module/transactions/transactions.service.ts
 *
 * MELHORIAS IMPLEMENTADAS (FASE 1):
 * ✅ Novo método findAllByUser(userId) - Retorna apenas transações do usuário
 * ✅ Mantém findAll() apenas para casos de admin
 * ✅ Todas as queries utilizam Prisma (type-safe)
 *
 * Fluxo de segurança:
 * 1. Controller extrai userId do JWT
 * 2. Passa para service junto com DTO/ID
 * 3. Service executa query com filtro de usuário
 * 4. Guard valida propriedade para operações sensíveis
 */

// src/transactions/transactions.service.ts
import { Injectable } from "@nestjs/common";
import type { PrismaService } from "../../prisma/prisma.service";
import type { CreateTransactionDto } from "./dto/transaction.dto";

@Injectable()
export class TransactionsService {
  // Injeção de dependência: PrismaService para acesso ao banco
  constructor(private prisma: PrismaService) {}

  /**
   * ⚠️ findAll() - ADMIN ONLY
   * Retorna TODAS as transações do sistema (sem filtro de usuário)
   * Use com cuidado: apenas para admins ou relatórios agregados
   * Esta função não filtra por userId → Acesso completo ao DB
   */
  async findAll() {
    return this.prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            // ✅ Propositalmente NÃO incluindo password (segurança)
            // Se fosse: "password" aqui, seria exposto na resposta
          },
        },
      },
    });
  }

  /**
   * ✅ findAllByUser(userId) - Novo em FASE 1 (SEGURO)
   *
   * Retorna APENAS transações do usuário específico
   * Implementação de autorização a nível de BANCO DE DADOS
   *
   * Segurança:
   * - Query Prisma: findMany({ where: { userId } })
   * - Filtra no SQL: SELECT * FROM "Transaction" WHERE userId = ?
   * - Nem um byte extra é retornado
   *
   * Exemplo:
   * ✅ User 1 chama findAllByUser(1) → Retorna suas transações
   * ❌ User 1 chama findAllByUser(2) → Controller bloqueia (ownership guard)
   *
   * @param userId - ID do usuário autenticado
   * @returns Transações do usuário com dados do dono
   */
  async findAllByUser(userId: number) {
    return this.prisma.transaction.findMany({
      where: { userId }, // Filtro de segurança: apenas este usuário
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            // NÃO incluindo password
          },
        },
      },
    });
  }

  /**
   * ➕ create() - Criar nova transação para usuário
   * @param userId - ID do usuário autenticado
   * @param dto - Dados validados (CreateTransactionDto)
   */
  async create(userId: number, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        title: dto.title,
        amount: dto.amount,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : new Date(),
        user: {
          connect: { id: userId }, // Linkar transação ao usuário
        },
      },
    });
  }

  /**
   * 🔍 findOne() - Buscar transação por ID
   * Nota: Segurança de propriedade é validada via OwnershipGuard no controller
   */
  async findOne(id: number) {
    return this.prisma.transaction.findUnique({ where: { id } });
  }

  /**
   * ✏️ update() - Atualizar transação
   * Nota: Segurança de propriedade é validada no controller
   */
  async update(id: number, dto: CreateTransactionDto) {
    return this.prisma.transaction.update({
      where: { id },
      data: {
        title: dto.title,
        amount: dto.amount,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });
  }

  /**
   * 🗑️ delete() - Deletar transação
   * Nota: Soft delete pode ser implementado se necessário (adicionar deletedAt)
   */
  async delete(id: number) {
    return this.prisma.transaction.delete({ where: { id } });
  }
}
