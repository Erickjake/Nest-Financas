import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBudgetDto) {
    // Verificar duplicata (unique constraint: userId + categoryId + month + year)
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId ?? null,
        month: dto.month,
        year: dto.year,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Já existe um orçamento para este mês/ano/categoria');
    }

    return this.prisma.budget.create({
      data: {
        amount: dto.amount,
        month: dto.month,
        year: dto.year,
        alertThreshold: dto.alertThreshold ?? 80,
        user: { connect: { id: userId } },
        ...(dto.categoryId ? { category: { connect: { id: dto.categoryId } } } : {}),
      },
      include: { category: true },
    });
  }

  async findAll(userId: number) {
    return this.prisma.budget.findMany({
      where: { userId, deletedAt: null },
      include: { category: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(id: number, userId: number) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });

    if (!budget) {
      throw new NotFoundException('Orçamento não encontrado');
    }

    return budget;
  }

  async update(id: number, userId: number, dto: UpdateBudgetDto) {
    await this.findOne(id, userId); // Valida existência e propriedade

    return this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.month !== undefined && { month: dto.month }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.alertThreshold !== undefined && { alertThreshold: dto.alertThreshold }),
        ...(dto.categoryId !== undefined ? { category: { connect: { id: dto.categoryId } } } : {}),
      },
      include: { category: true },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId); // Valida existência e propriedade

    return this.prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Retorna o status de todos os orçamentos do usuário para um mês/ano,
   * comparando o gasto real vs o limite, e indicando alertas.
   */
  async getStatus(userId: number, month: number, year: number) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year, deletedAt: null },
      include: { category: true },
    });

    // Período: primeiro e último dia do mês
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const results = await Promise.all(
      budgets.map(async (budget) => {
        const whereClause: Record<string, unknown> = {
          userId,
          type: 'EXPENSE',
          deletedAt: null,
          date: { gte: startDate, lte: endDate },
        };

        if (budget.categoryId) {
          whereClause.categoryId = budget.categoryId;
        }

        const spent = await this.prisma.transaction.aggregate({
          where: whereClause,
          _sum: { amount: true },
        });

        const totalSpent = spent._sum.amount ?? 0;
        const percentage = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;
        const isOverBudget = percentage >= 100;
        const isAlert = percentage >= budget.alertThreshold;

        return {
          id: budget.id,
          amount: budget.amount,
          month: budget.month,
          year: budget.year,
          alertThreshold: budget.alertThreshold,
          categoryId: budget.categoryId,
          categoryName: budget.category?.name ?? 'Geral',
          spent: totalSpent,
          remaining: Math.max(0, budget.amount - totalSpent),
          percentage: Math.round(percentage * 100) / 100,
          isOverBudget,
          isAlert,
        };
      }),
    );

    return results;
  }
}
