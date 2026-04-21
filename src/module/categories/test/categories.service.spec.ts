import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesService } from '../categories.service';

// Mock do PrismaService
const prismaMock = {
  category: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CategoriesService(prismaMock as any);
  });

  // ──────────────────────────────────────────────
  describe('create()', () => {
    it('deve criar uma categoria com os dados corretos', async () => {
      const dto = { name: 'Alimentação', color: '#FF5733', icon: '🍔', userId: 1 };
      const criada = {
        id: 1,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      prismaMock.category.create.mockResolvedValue(criada);

      const resultado = await service.create(dto as any);

      expect(resultado).toEqual(criada);
      expect(prismaMock.category.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  // ──────────────────────────────────────────────
  describe('findAll()', () => {
    it('deve retornar lista de categorias não deletadas', async () => {
      const categorias = [
        { id: 1, name: 'Alimentação', _count: { transactions: 3 } },
        { id: 2, name: 'Transporte', _count: { transactions: 1 } },
      ];
      prismaMock.category.findMany.mockResolvedValue(categorias);

      const resultado = await service.findAll();

      expect(resultado).toEqual(categorias);
      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { transactions: true } } },
      });
    });

    it('deve retornar array vazio quando não há categorias', async () => {
      prismaMock.category.findMany.mockResolvedValue([]);

      const resultado = await service.findAll();

      expect(resultado).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  describe('findOne()', () => {
    it('deve retornar uma categoria existente pelo ID', async () => {
      const categoria = {
        id: 1,
        name: 'Alimentação',
        deletedAt: null,
        transactions: [{ id: 1, amount: 50 }],
      };
      prismaMock.category.findUnique.mockResolvedValue(categoria);

      const resultado = await service.findOne(1);

      expect(resultado).toEqual(categoria);
      expect(prismaMock.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { transactions: { select: { id: true, amount: true } } },
      });
    });

    it('deve lançar NotFoundException para categoria inexistente (retorna null)', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Categoria com ID 999 não encontrada');
    });

    it('deve lançar NotFoundException para categoria com soft-delete', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 1,
        name: 'Deletada',
        deletedAt: new Date(),
      });

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  describe('update()', () => {
    it('deve atualizar uma categoria existente', async () => {
      const categoria = { id: 1, name: 'Alimentação', deletedAt: null, transactions: [] };
      const atualizada = { id: 1, name: 'Comida', deletedAt: null };
      const dto = { name: 'Comida' };

      prismaMock.category.findUnique.mockResolvedValue(categoria);
      prismaMock.category.update.mockResolvedValue(atualizada);

      const resultado = await service.update(1, dto as any);

      expect(resultado).toEqual(atualizada);
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });

    it('deve lançar NotFoundException ao tentar atualizar categoria inexistente', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'X' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  describe('remove()', () => {
    it('deve fazer soft-delete de uma categoria existente', async () => {
      const categoria = { id: 1, name: 'Alimentação', deletedAt: null, transactions: [] };
      const deletada = { id: 1, name: 'Alimentação', deletedAt: expect.any(Date) };

      prismaMock.category.findUnique.mockResolvedValue(categoria);
      prismaMock.category.update.mockResolvedValue(deletada);

      const resultado = await service.remove(1);

      expect(resultado).toEqual(deletada);
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve lançar NotFoundException ao tentar remover categoria inexistente', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
