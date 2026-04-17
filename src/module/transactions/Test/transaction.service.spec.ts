import type { PrismaService } from "src/prisma/prisma.service";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type CreateTransactionDto,
  TransactionType,
} from "../dto/transaction.dto";
import { TransactionsService } from "../transactions.service";

// O mock agora só precisa do transaction, pois o service não chama o model user diretamente
const prismaMock = {
  transaction: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe("TransactionsService", () => {
  let transactionsService: TransactionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    transactionsService = new TransactionsService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe("create()", () => {
    test("deve criar uma transação com sucesso (Caminho Feliz)", async () => {
      // --- ARRANGE ---
      const userId = 1;
      const dto: CreateTransactionDto = {
        title: "Salário",
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

    test("deve repassar o erro se o usuário não existir ou o Prisma falhar (Caminho Triste)", async () => {
      // --- ARRANGE ---
      const userId = 999; // Um ID que não existe
      const dto: CreateTransactionDto = {
        title: "Compra",
        amount: 100,
        type: TransactionType.EXPENSE,
        date: new Date().toISOString(),
      };

      // Se o userId não existir, o Prisma lança um erro de Foreign Key internamente.
      // Vamos simular o Prisma rejeitando a Promise com um erro genérico.
      const erroDoPrisma = new Error("Record to update not found");
      prismaMock.transaction.create.mockRejectedValue(erroDoPrisma);

      // --- ACT & ASSERT ---
      // Como não há bloco try/catch no seu service, ele deve repassar o erro para a frente
      await expect(transactionsService.create(userId, dto)).rejects.toThrow(
        "Record to update not found",
      );

      // Garante que o Prisma foi chamado (e falhou)
      expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("findAllByUser()", () => {
    test("deve retornar todas as transações de um usuário específico", async () => {
      // --- ARRANGE ---
      const userId = 1;
      const mockTransactions = [
        { id: 1, title: "Salário", amount: 5000, userId },
        { id: 2, title: "Rent", amount: 1500, userId },
      ];
      prismaMock.transaction.findMany.mockResolvedValueOnce(mockTransactions);

      // --- ACT ---
      const result = await transactionsService.findAllByUser(userId);

      // --- ASSERT ---
      expect(result).toEqual(mockTransactions);
      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
      });
    });
  });

  describe("findOne()", () => {
    test("deve retornar uma transação pelo ID", async () => {
      // --- ARRANGE ---
      const transactionId = 1;
      const mockTransaction = {
        id: transactionId,
        title: "Salário",
        amount: 5000,
        userId: 1,
      };
      prismaMock.transaction.findUnique.mockResolvedValueOnce(mockTransaction);

      // --- ACT ---
      const result = await transactionsService.findOne(transactionId);

      // --- ASSERT ---
      expect(result).toEqual(mockTransaction);
      expect(prismaMock.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
    });

    test("deve retornar null se transação não existir", async () => {
      // --- ARRANGE ---
      prismaMock.transaction.findUnique.mockResolvedValueOnce(null);

      // --- ACT ---
      const result = await transactionsService.findOne(999);

      // --- ASSERT ---
      expect(result).toBeNull();
    });
  });

  describe("update()", () => {
    test("deve atualizar uma transação com sucesso", async () => {
      // --- ARRANGE ---
      const transactionId = 1;
      const dto: CreateTransactionDto = {
        title: "Salário (Atualizado)",
        amount: 6000,
        type: TransactionType.INCOME,
        date: new Date().toISOString(),
      };
      const mockUpdated = { id: transactionId, ...dto, userId: 1 };
      prismaMock.transaction.update.mockResolvedValueOnce(mockUpdated);

      // --- ACT ---
      const result = await transactionsService.update(transactionId, dto);

      // --- ASSERT ---
      expect(result).toEqual(mockUpdated);
      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          title: dto.title,
          amount: dto.amount,
          type: dto.type,
          date: expect.any(Date),
        },
      });
    });
  });

  describe("delete()", () => {
    test("deve deletar uma transação com sucesso", async () => {
      // --- ARRANGE ---
      const transactionId = 1;
      const mockDeleted = {
        id: transactionId,
        title: "Salário",
        amount: 5000,
        userId: 1,
      };
      prismaMock.transaction.delete.mockResolvedValueOnce(mockDeleted);

      // --- ACT ---
      const result = await transactionsService.delete(transactionId);

      // --- ASSERT ---
      expect(result).toEqual(mockDeleted);
      expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
    });

    test("deve repassar erro se transação não existir", async () => {
      // --- ARRANGE ---
      const erroDoPrisma = new Error("Record not found");
      prismaMock.transaction.delete.mockRejectedValueOnce(erroDoPrisma);

      // --- ACT & ASSERT ---
      await expect(transactionsService.delete(999)).rejects.toThrow(
        "Record not found",
      );
    });
  });
});
