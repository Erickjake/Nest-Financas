// src/transactions/transactions.service.ts
import { Injectable } from "@nestjs/common";
import type { PrismaService } from "../../prisma/prisma.service";
import type { CreateTransactionDto } from "./dto/transaction.dto";

@Injectable()
export class TransactionsService {
  // Injetamos o Prisma, ele substitui a necessidade daquele nosso Array antigo
  constructor(private prisma: PrismaService) {}

  // Busca TODAS as transações (use com cuidado - apenas admin ou agregação)
  async findAll() {
    return this.prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            // Ao NÃO listar o 'password' aqui, ele fica de fora!
          },
        },
      },
    });
  }

  // Busca transações de um usuário específico (mais seguro)
  async findAllByUser(userId: number) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });
  }

  // Cria a transação direto no banco de dados
  // Inverta aqui: userId primeiro, dto depois
  async create(userId: number, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        title: dto.title,
        amount: dto.amount,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : new Date(),
        user: {
          connect: { id: userId },
        },
      },
    });
  }
  async delete(id: number) {
    return this.prisma.transaction.delete({ where: { id } });
  }

  async findOne(id: number) {
    return this.prisma.transaction.findUnique({ where: { id } });
  }

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
}
