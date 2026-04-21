import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exporta todos os dados do usuário em formato JSON.
   */
  async exportData(userId: number) {
    const [transactions, categories, budgets] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        select: {
          title: true,
          amount: true,
          type: true,
          date: true,
          categoryId: true,
        },
      }),
      this.prisma.category.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          icon: true,
        },
      }),
      this.prisma.budget.findMany({
        where: { userId, deletedAt: null },
        select: {
          amount: true,
          month: true,
          year: true,
          alertThreshold: true,
          categoryId: true,
        },
      }),
    ]);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        transactions,
        categories,
        budgets,
      },
    };
  }

  /**
   * Importa dados de um backup JSON para o usuário.
   * Não remove dados existentes — apenas adiciona.
   */
  async importData(userId: number, backup: BackupPayload) {
    const stats = { transactions: 0, categories: 0, budgets: 0 };

    // Mapear categorias: nome → id (reusar existentes, criar novas)
    const categoryIdMap = new Map<number, number>();

    if (backup.data.categories?.length) {
      for (const cat of backup.data.categories) {
        let existing = await this.prisma.category.findFirst({
          where: { name: cat.name, deletedAt: null },
        });

        if (!existing) {
          existing = await this.prisma.category.create({
            data: {
              name: cat.name,
              description: cat.description ?? null,
              color: cat.color ?? null,
              icon: cat.icon ?? null,
            },
          });
          stats.categories++;
        }

        if (cat.id) {
          categoryIdMap.set(cat.id, existing.id);
        }
      }
    }

    // Importar transações
    if (backup.data.transactions?.length) {
      for (const txn of backup.data.transactions) {
        const mappedCategoryId = txn.categoryId
          ? (categoryIdMap.get(txn.categoryId) ?? null)
          : null;

        await this.prisma.transaction.create({
          data: {
            title: txn.title,
            amount: txn.amount,
            type: txn.type,
            date: new Date(txn.date),
            user: { connect: { id: userId } },
            ...(mappedCategoryId ? { category: { connect: { id: mappedCategoryId } } } : {}),
          },
        });
        stats.transactions++;
      }
    }

    // Importar budgets
    if (backup.data.budgets?.length) {
      for (const budget of backup.data.budgets) {
        const mappedCategoryId = budget.categoryId
          ? (categoryIdMap.get(budget.categoryId) ?? null)
          : null;

        // Evitar duplicatas
        const existing = await this.prisma.budget.findFirst({
          where: {
            userId,
            month: budget.month,
            year: budget.year,
            categoryId: mappedCategoryId,
            deletedAt: null,
          },
        });

        if (!existing) {
          await this.prisma.budget.create({
            data: {
              amount: budget.amount,
              month: budget.month,
              year: budget.year,
              alertThreshold: budget.alertThreshold ?? 80,
              user: { connect: { id: userId } },
              ...(mappedCategoryId ? { category: { connect: { id: mappedCategoryId } } } : {}),
            },
          });
          stats.budgets++;
        }
      }
    }

    return {
      message: 'Backup restaurado com sucesso',
      imported: stats,
    };
  }
}

export interface BackupPayload {
  version: string;
  data: {
    transactions?: {
      title: string;
      amount: number;
      type: string;
      date: string;
      categoryId?: number | null;
    }[];
    categories?: {
      id?: number;
      name: string;
      description?: string | null;
      color?: string | null;
      icon?: string | null;
    }[];
    budgets?: {
      amount: number;
      month: number;
      year: number;
      alertThreshold?: number;
      categoryId?: number | null;
    }[];
  };
}
