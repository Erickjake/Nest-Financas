import type { Prisma } from '@prisma/client';
import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../../prisma/prisma.service';

export const createFinanceTools = (prisma: PrismaService, userId: string) => {
  const numericUserId = Number(userId);

  return {
    get_transactions: tool({
      description: 'Busca as transações do usuário com filtros opcionais de mês e ano.',
      inputSchema: z.object({
        month: z
          .number()
          .describe(
            'O número do mês (1-12) para filtrar transações. Envie 0 se quiser buscar as mais recentes gerais.',
          ),
        year: z
          .number()
          .describe('O ano completo (ex: 2026). Envie 0 se quiser buscar as mais recentes gerais.'),
      }),
      execute: async ({ month, year }) => {
        const where: Prisma.TransactionWhereInput = { userId: numericUserId, deletedAt: null };

        if (month && year) {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59, 999);
          where.date = {
            gte: startDate,
            lte: endDate,
          };
        }

        const transactions = await prisma.transaction.findMany({
          where,
          include: { category: true },
          orderBy: { date: 'desc' },
          take: 50,
        });

        return transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          type: t.type,
          title: t.title,
          date: t.date.toISOString(),
          category: t.category?.name || 'Sem categoria',
        }));
      },
    }),

    get_budget_status: tool({
      description: 'Consulta o status do orçamento do usuário do mês fornecido.',
      inputSchema: z.object({
        month: z.number().describe('O número do mês (1-12)'),
        year: z.number().describe('O ano completo (ex: 2026)'),
      }),
      execute: async ({ month, year }) => {
        const budgets = await prisma.budget.findMany({
          where: { userId: numericUserId, month, year, deletedAt: null },
          include: { category: true },
        });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const results = await Promise.all(
          budgets.map(async (budget) => {
            const expenses = await prisma.transaction.aggregate({
              where: {
                userId: numericUserId,
                categoryId: budget.categoryId,
                type: 'EXPENSE',
                date: { gte: startDate, lte: endDate },
                deletedAt: null,
              },
              _sum: { amount: true },
            });

            const currentAmount = expenses._sum.amount || 0;
            const percentageUsed = (Number(currentAmount) / Number(budget.amount)) * 100;

            return {
              category: budget.category?.name || 'Geral',
              budgetAmount: Number(budget.amount),
              currentSpent: Number(currentAmount),
              percentageUsed: Number(percentageUsed.toFixed(2)),
              alertThreshold: budget.alertThreshold,
              alertTriggered: percentageUsed >= budget.alertThreshold,
            };
          }),
        );

        return results;
      },
    }),

    get_balance_summary: tool({
      description:
        'Retorna o resumo financeiro do usuário: total de receitas, total de despesas e saldo do mês.',
      inputSchema: z.object({
        month: z.number().describe('O número do mês (1-12)'),
        year: z.number().describe('O ano completo (ex: 2026)'),
      }),
      execute: async ({ month, year }) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const dateFilter = { gte: startDate, lte: endDate };

        const [incomeResult, expenseResult] = await Promise.all([
          prisma.transaction.aggregate({
            where: {
              userId: numericUserId,
              type: 'INCOME',
              date: dateFilter,
              deletedAt: null,
            },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.transaction.aggregate({
            where: {
              userId: numericUserId,
              type: 'EXPENSE',
              date: dateFilter,
              deletedAt: null,
            },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

        const totalIncome = Number(incomeResult._sum.amount || 0);
        const totalExpense = Number(expenseResult._sum.amount || 0);

        return {
          month,
          year,
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactionCount: {
            income: incomeResult._count,
            expense: expenseResult._count,
          },
        };
      },
    }),

    get_expense_by_category: tool({
      description:
        'Retorna o ranking de gastos agrupados por categoria no mês especificado, ordenado do maior para o menor.',
      inputSchema: z.object({
        month: z.number().describe('O número do mês (1-12)'),
        year: z.number().describe('O ano completo (ex: 2026)'),
      }),
      execute: async ({ month, year }) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const expenses = await prisma.transaction.findMany({
          where: {
            userId: numericUserId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          include: { category: true },
        });

        const categoryMap = new Map<string, number>();
        for (const expense of expenses) {
          const categoryName = expense.category?.name || 'Sem categoria';
          const current = categoryMap.get(categoryName) || 0;
          categoryMap.set(categoryName, current + Number(expense.amount));
        }

        const totalExpenses = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);

        return Array.from(categoryMap.entries())
          .map(([category, amount]) => ({
            category,
            amount: Number(amount.toFixed(2)),
            percentage: totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(2)) : 0,
          }))
          .sort((a, b) => b.amount - a.amount);
      },
    }),

    get_categories: tool({
      description: 'Lista todas as categorias disponíveis do usuário.',
      inputSchema: z.object({}),
      execute: async () => {
        const categories = await prisma.category.findMany({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        });

        return categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          icon: c.icon,
        }));
      },
    }),
  };
};
