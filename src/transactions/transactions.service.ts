// src/transactions/transactions.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class TransactionsService {
  // Injetamos o Prisma, ele substitui a necessidade daquele nosso Array antigo
  constructor(private prisma: PrismaService) {}

  // Busca no banco e já traz os dados do usuário dono da transação
  async findAll() {
    return this.prisma.transaction.findMany({
      include: {
        user: true,
      },
    });
  }

  // Cria a transação direto no banco de dados
  async create(title: string, amount: number, type: string, userId: number) {
    return this.prisma.transaction.create({
      data: {
        title: title,
        amount: amount,
        type: type,
        userId: userId,
        // Note que não precisamos passar o 'id' nem o 'date/createdAt',
        // o banco de dados Neon cuida disso sozinho agora!
      },
    });
  }
}
