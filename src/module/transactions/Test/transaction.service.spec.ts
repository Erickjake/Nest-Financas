import type { PrismaService } from 'src/prisma/prisma.service';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TransactionType, type CreateTransactionDto } from '../dto/transaction.dto';
import { TransactionsService } from '../transactions.service';

// O mock agora só precisa do transaction, pois o service não chama o model user diretamente
const prismaMock = {
  transaction: {
    create: vi.fn(),
  },
};

describe('TransactionsService', () => {
  let transactionsService: TransactionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    transactionsService = new TransactionsService(prismaMock as unknown as PrismaService);
  });

  describe('create()', () => {
    test('deve criar uma transação com sucesso (Caminho Feliz)', async () => {
      // --- ARRANGE ---
      const userId = 1;
      const dto: CreateTransactionDto = {
        title: 'Salário',
        amount: 5000,
        type: TransactionType.INCOME,
        date: new Date().toISOString(),
      };

      const mockTransaction = { id: 10, ...dto, userId };

      // Simulamos o Prisma retornando a transação criada
      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction);

      // --- ACT ---
      const result = await transactionsService.create(userId, dto);

      // --- ASSERT ---
      expect(result).toEqual(mockTransaction);
      expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);

      // Verificamos se o Prisma foi chamado com os parâmetros exatos do seu service
      expect(prismaMock.transaction.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          amount: dto.amount,
          type: dto.type,
          date: expect.any(Date), // Como o service faz 'new Date()', usamos expect.any(Date) para ignorar diferenças de milissegundos
          user: {
            connect: { id: userId },
          },
        },
      });
    });

    test('deve repassar o erro se o usuário não existir ou o Prisma falhar (Caminho Triste)', async () => {
      // --- ARRANGE ---
      const userId = 999; // Um ID que não existe
      const dto: CreateTransactionDto = {
        title: 'Compra',
        amount: 100,
        type: TransactionType.EXPENSE,
        date: new Date().toISOString(),
      };

      // Se o userId não existir, o Prisma lança um erro de Foreign Key internamente.
      // Vamos simular o Prisma rejeitando a Promise com um erro genérico.
      const erroDoPrisma = new Error('Record to update not found');
      prismaMock.transaction.create.mockRejectedValue(erroDoPrisma);

      // --- ACT & ASSERT ---
      // Como não há bloco try/catch no seu service, ele deve repassar o erro para a frente
      await expect(transactionsService.create(userId, dto)).rejects.toThrow(
        'Record to update not found',
      );

      // Garante que o Prisma foi chamado (e falhou)
      expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
    });
  });
});
