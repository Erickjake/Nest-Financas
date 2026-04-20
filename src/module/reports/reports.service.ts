import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto } from './dto/create-report.dto';
@Injectable()
export class ReportsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSummary(userId: number, filter: ReportFilterDto) {
    const dateFilter = this.buildDateFilter(filter);
    const [incomeResult, expenseResult] = await Promise.all([
      this.prismaService.transaction.aggregate({
        where: { userId, type: 'INCOME', deletedAt: null, ...(dateFilter && { date: dateFilter }) },
        _sum: { amount: true },
      }),
      this.prismaService.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          deletedAt: null,
          ...(dateFilter && { date: dateFilter }),
        },
        _sum: { amount: true },
      }),
    ]);
    // result._sum.amount → total
    return {
      income: incomeResult._sum.amount,
      expense: expenseResult._sum.amount,
      balance: (incomeResult._sum.amount ?? 0) - (expenseResult._sum.amount ?? 0),
    };
  }

  async getByCategory(userId: number, filter: ReportFilterDto) {
    const dateFilter = this.buildDateFilter(filter);
    const result = await this.prismaService.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', deletedAt: null, ...(dateFilter && { date: dateFilter }) },
      _sum: { amount: true },

      _count: { id: true },

      orderBy: { _sum: { amount: 'desc' } },
    });

    const categoryIds = result.map((r) => r.categoryId).filter(Boolean);
    const categories = await this.prismaService.category.findMany({
      where: { id: { in: categoryIds as number[] } },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return result.map((r) => ({
      categoryId: r.categoryId,
      categoryName: categoryMap.get(r.categoryId as number) ?? 'Sem categoria',
      total: r._sum.amount ?? 0,
      count: r._count.id,
    }));
  }

  async getMonthly(userId: number, filter: ReportFilterDto) {
    const dateFilter = this.buildDateFilter(filter);
    const result = await this.prismaService.transaction.findMany({
      where: { userId, deletedAt: null, ...(dateFilter && { date: dateFilter }) },
      select: { amount: true, type: true, date: true },
    });
    const monthlyMap = new Map<string, { month: string; income: number; expense: number }>();
    for (const t of result) {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key) || { month: key, income: 0, expense: 0 };
      if (t.type === 'INCOME') entry.income += t.amount;
      else if (t.type === 'EXPENSE') entry.expense += t.amount;
      monthlyMap.set(key, entry);
    }
    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }
  private buildDateFilter(filter: ReportFilterDto) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.gte = new Date(filter.startDate);
    if (filter.endDate) dateFilter.lte = new Date(filter.endDate);
    return Object.keys(dateFilter).length ? dateFilter : undefined;
  }
}
