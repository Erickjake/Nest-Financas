import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetsService } from '../budgets.service';

const prismaMock = {
  budget: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  transaction: {
    aggregate: vi.fn(),
  },
};

const mockBudget = {
  id: 1,
  userId: 1,
  amount: 500,
  month: 6,
  year: 2025,
  alertThreshold: 80,
  categoryId: null,
  deletedAt: null,
  category: null,
};

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BudgetsService(prismaMock as any);
  });

  // ──────────────────────────────────────────────
  describe('create()', () => {
    it('deve criar um orçamento com sucesso', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);
      prismaMock.budget.create.mockResolvedValue(mockBudget);

      const dto = { amount: 500, month: 6, year: 2025 };
      const resultado = await service.create(1, dto as any);

      expect(resultado).toEqual(mockBudget);
      expect(prismaMock.budget.create).toHaveBeenCalledOnce();
    });

    it('deve lançar ConflictException se orçamento duplicado', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(mockBudget);

      const dto = { amount: 500, month: 6, year: 2025 };
      await expect(service.create(1, dto as any)).rejects.toThrow(ConflictException);
      await expect(service.create(1, dto as any)).rejects.toThrow(
        'Já existe um orçamento para este mês/ano/categoria',
      );
    });

    it('deve criar orçamento com categoryId', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);
      const budgetComCategoria = { ...mockBudget, categoryId: 3 };
      prismaMock.budget.create.mockResolvedValue(budgetComCategoria);

      const dto = { amount: 300, month: 6, year: 2025, categoryId: 3 };
      const resultado = await service.create(1, dto as any);

      expect(resultado.categoryId).toBe(3);
    });

    it('deve usar alertThreshold padrão 80 quando não informado', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);
      prismaMock.budget.create.mockResolvedValue(mockBudget);

      const dto = { amount: 500, month: 6, year: 2025 };
      await service.create(1, dto as any);

      const chamada = prismaMock.budget.create.mock.calls[0][0];
      expect(chamada.data.alertThreshold).toBe(80);
    });
  });

  // ──────────────────────────────────────────────
  describe('findAll()', () => {
    it('deve retornar todos os orçamentos do usuário', async () => {
      const budgets = [mockBudget, { ...mockBudget, id: 2, month: 7 }];
      prismaMock.budget.findMany.mockResolvedValue(budgets);

      const resultado = await service.findAll(1);

      expect(resultado).toEqual(budgets);
      expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
        where: { userId: 1, deletedAt: null },
        include: { category: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    });
  });

  // ──────────────────────────────────────────────
  describe('findOne()', () => {
    it('deve retornar um orçamento existente', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(mockBudget);

      const resultado = await service.findOne(1, 1);

      expect(resultado).toEqual(mockBudget);
      expect(prismaMock.budget.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1, deletedAt: null },
        include: { category: true },
      });
    });

    it('deve lançar NotFoundException quando orçamento não encontrado', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow('Orçamento não encontrado');
    });
  });

  // ──────────────────────────────────────────────
  describe('update()', () => {
    it('deve atualizar um orçamento com campos fornecidos', async () => {
      const atualizado = { ...mockBudget, amount: 600 };
      prismaMock.budget.findFirst.mockResolvedValue(mockBudget);
      prismaMock.budget.update.mockResolvedValue(atualizado);

      const resultado = await service.update(1, 1, { amount: 600 } as any);

      expect(resultado.amount).toBe(600);
      expect(prismaMock.budget.update).toHaveBeenCalledOnce();
    });

    it('deve lançar NotFoundException ao atualizar orçamento inexistente', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);

      await expect(service.update(999, 1, { amount: 100 } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve conectar categoria quando categoryId fornecido', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(mockBudget);
      prismaMock.budget.update.mockResolvedValue({ ...mockBudget, categoryId: 5 });

      await service.update(1, 1, { categoryId: 5 } as any);

      const chamada = prismaMock.budget.update.mock.calls[0][0];
      expect(chamada.data).toMatchObject({ category: { connect: { id: 5 } } });
    });
  });

  // ──────────────────────────────────────────────
  describe('remove()', () => {
    it('deve fazer soft-delete de um orçamento', async () => {
      const deletado = { ...mockBudget, deletedAt: new Date() };
      prismaMock.budget.findFirst.mockResolvedValue(mockBudget);
      prismaMock.budget.update.mockResolvedValue(deletado);

      const resultado = await service.remove(1, 1);

      expect(resultado.deletedAt).toBeDefined();
      expect(prismaMock.budget.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve lançar NotFoundException ao remover orçamento inexistente', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  describe('getStatus()', () => {
    it('deve retornar status dos orçamentos com gasto calculado', async () => {
      const budget = {
        ...mockBudget,
        amount: 500,
        alertThreshold: 80,
        category: { name: 'Alimentação' },
      };
      prismaMock.budget.findMany.mockResolvedValue([budget]);
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 200 } });

      const resultado = await service.getStatus(1, 6, 2025);

      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toMatchObject({
        id: 1,
        amount: 500,
        spent: 200,
        remaining: 300,
        percentage: 40,
        isOverBudget: false,
        isAlert: false,
        categoryName: 'Alimentação',
      });
    });

    it('deve indicar isOverBudget quando gasto >= 100%', async () => {
      const budget = { ...mockBudget, amount: 100, category: null };
      prismaMock.budget.findMany.mockResolvedValue([budget]);
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 100 } });

      const resultado = await service.getStatus(1, 6, 2025);

      expect(resultado[0].isOverBudget).toBe(true);
    });

    it('deve indicar isAlert quando gasto >= alertThreshold', async () => {
      const budget = { ...mockBudget, amount: 500, alertThreshold: 80, category: null };
      prismaMock.budget.findMany.mockResolvedValue([budget]);
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 420 } }); // 84%

      const resultado = await service.getStatus(1, 6, 2025);

      expect(resultado[0].isAlert).toBe(true);
    });

    it('deve retornar categoryName "Geral" quando categoria é null', async () => {
      const budget = { ...mockBudget, category: null };
      prismaMock.budget.findMany.mockResolvedValue([budget]);
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const resultado = await service.getStatus(1, 6, 2025);

      expect(resultado[0].categoryName).toBe('Geral');
      expect(resultado[0].spent).toBe(0);
    });

    it('deve retornar array vazio quando não há orçamentos', async () => {
      prismaMock.budget.findMany.mockResolvedValue([]);

      const resultado = await service.getStatus(1, 6, 2025);

      expect(resultado).toEqual([]);
    });

    it('deve incluir categoryId no where quando budget tem categoria', async () => {
      const budget = { ...mockBudget, categoryId: 3, category: { name: 'Transporte' } };
      prismaMock.budget.findMany.mockResolvedValue([budget]);
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

      await service.getStatus(1, 6, 2025);

      const where = prismaMock.transaction.aggregate.mock.calls[0][0].where;
      expect(where.categoryId).toBe(3);
    });
  });
});
