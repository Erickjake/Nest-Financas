import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsService } from '../reports.service';

const prismaMock = {
  transaction: {
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportsService(prismaMock as any);
  });

  // ──────────────────────────────────────────────
  describe('getSummary()', () => {
    it('deve retornar income, expense e balance corretamente', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 3000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 1200 } }); // expense

      const resultado = await service.getSummary(1, {});

      expect(resultado).toEqual({
        income: 3000,
        expense: 1200,
        balance: 1800,
      });
    });

    it('deve tratar valores null como 0 no balance', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const resultado = await service.getSummary(1, {});

      expect(resultado.balance).toBe(0);
    });

    it('deve aplicar filtro de data quando startDate e endDate fornecidos', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 500 } });

      const filter = { startDate: '2025-01-01', endDate: '2025-06-30' };
      await service.getSummary(1, filter);

      const callArgs = prismaMock.transaction.aggregate.mock.calls[0][0];
      expect(callArgs.where.date).toBeDefined();
      expect(callArgs.where.date.gte).toBeInstanceOf(Date);
      expect(callArgs.where.date.lte).toBeInstanceOf(Date);
    });

    it('não deve incluir filtro de data quando filtro vazio', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });

      await service.getSummary(1, {});

      const callArgs = prismaMock.transaction.aggregate.mock.calls[0][0];
      expect(callArgs.where.date).toBeUndefined();
    });

    it('deve incluir apenas startDate quando só startDate é fornecido', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });

      await service.getSummary(1, { startDate: '2025-01-01' });

      const callArgs = prismaMock.transaction.aggregate.mock.calls[0][0];
      expect(callArgs.where.date.gte).toBeInstanceOf(Date);
      expect(callArgs.where.date.lte).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────
  describe('getByCategory()', () => {
    it('deve retornar agrupamento por categoria com nome', async () => {
      prismaMock.transaction.groupBy.mockResolvedValue([
        { categoryId: 1, _sum: { amount: 500 }, _count: { id: 3 } },
        { categoryId: 2, _sum: { amount: 200 }, _count: { id: 1 } },
      ]);
      prismaMock.category.findMany.mockResolvedValue([
        { id: 1, name: 'Alimentação' },
        { id: 2, name: 'Transporte' },
      ]);

      const resultado = await service.getByCategory(1, {});

      expect(resultado).toEqual([
        { categoryId: 1, categoryName: 'Alimentação', total: 500, count: 3 },
        { categoryId: 2, categoryName: 'Transporte', total: 200, count: 1 },
      ]);
    });

    it('deve usar "Sem categoria" quando categoryId é null', async () => {
      prismaMock.transaction.groupBy.mockResolvedValue([
        { categoryId: null, _sum: { amount: 100 }, _count: { id: 2 } },
      ]);
      prismaMock.category.findMany.mockResolvedValue([]);

      const resultado = await service.getByCategory(1, {});

      expect(resultado[0].categoryName).toBe('Sem categoria');
    });

    it('deve retornar array vazio quando não há transações', async () => {
      prismaMock.transaction.groupBy.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([]);

      const resultado = await service.getByCategory(1, {});

      expect(resultado).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  describe('getMonthly()', () => {
    it('deve agrupar transações por mês com income e expense', async () => {
      const transactions = [
        { amount: 3000, type: 'INCOME', date: new Date('2025-01-15') },
        { amount: 800, type: 'EXPENSE', date: new Date('2025-01-20') },
        { amount: 3000, type: 'INCOME', date: new Date('2025-02-10') },
        { amount: 500, type: 'EXPENSE', date: new Date('2025-02-25') },
      ];
      prismaMock.transaction.findMany.mockResolvedValue(transactions);

      const resultado = await service.getMonthly(1, {});

      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toMatchObject({ month: '2025-01', income: 3000, expense: 800 });
      expect(resultado[1]).toMatchObject({ month: '2025-02', income: 3000, expense: 500 });
    });

    it('deve retornar meses ordenados cronologicamente', async () => {
      const transactions = [
        { amount: 1000, type: 'INCOME', date: new Date('2025-03-15') },
        { amount: 500, type: 'INCOME', date: new Date('2025-01-15') },
        { amount: 200, type: 'EXPENSE', date: new Date('2025-02-15') },
      ];
      prismaMock.transaction.findMany.mockResolvedValue(transactions);

      const resultado = await service.getMonthly(1, {});

      const meses = resultado.map((r) => r.month);
      expect(meses).toEqual(['2025-01', '2025-02', '2025-03']);
    });

    it('deve retornar array vazio quando não há transações', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const resultado = await service.getMonthly(1, {});

      expect(resultado).toEqual([]);
    });

    it('deve acumular múltiplas transações no mesmo mês', async () => {
      const transactions = [
        { amount: 1000, type: 'INCOME', date: new Date('2025-01-05') },
        { amount: 2000, type: 'INCOME', date: new Date('2025-01-15') },
        { amount: 300, type: 'EXPENSE', date: new Date('2025-01-20') },
      ];
      prismaMock.transaction.findMany.mockResolvedValue(transactions);

      const resultado = await service.getMonthly(1, {});

      expect(resultado[0]).toMatchObject({ month: '2025-01', income: 3000, expense: 300 });
    });
  });
});
