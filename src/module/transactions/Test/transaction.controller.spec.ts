import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type CreateTransactionDto,
  TransactionType,
} from "../dto/transaction.dto";
import { TransactionsController } from "../transactions.controller";
import type { TransactionsService } from "../transactions.service";

// Criamos um "dublê" do nosso Service.
// O Controller vai achar que está falando com o service real.
const mockTransactionsService = {
  findAll: vi.fn(),
  findAllByUser: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("TransactionsController", () => {
  let controller: TransactionsController;

  beforeEach(() => {
    vi.clearAllMocks();
    // Injetamos o mock no controller
    controller = new TransactionsController(
      mockTransactionsService as unknown as TransactionsService,
    );
  });

  describe("getAllTransactions()", () => {
    test("deve chamar o findAllByUser do service com userId do JWT", async () => {
      // --- ARRANGE ---
      const mockRequest = { user: { sub: 10 } };
      const mockResult = [
        { id: 1, title: "Salário", amount: 5000, userId: 10 },
      ];
      mockTransactionsService.findAllByUser.mockResolvedValue(mockResult);

      // --- ACT ---
      const result = await controller.getAllTransactions(mockRequest);

      // --- ASSERT ---
      expect(result).toEqual(mockResult);
      expect(mockTransactionsService.findAllByUser).toHaveBeenCalledWith(10);
    });
  });

  describe("create()", () => {
    test("deve extrair o userId do request e repassar para o service criar a transação", async () => {
      // --- ARRANGE ---
      const dto: CreateTransactionDto = {
        title: "Aluguel",
        amount: 1500,
        type: TransactionType.EXPENSE,
        date: new Date().toISOString(),
      };

      // Simulamos o objeto 'req' do Express/NestJS que tem os dados do JWT
      const mockRequest = {
        user: { sub: 10 }, // ou { userId: 10 }
      };

      const mockResult = { id: 1, ...dto, userId: 10 };
      mockTransactionsService.create.mockResolvedValue(mockResult);

      // --- ACT ---
      const result = await controller.create(dto, mockRequest);

      // --- ASSERT ---
      expect(result).toEqual(mockResult);
      // Aqui garantimos que o Controller fez a conversão Number() corretamente e passou a ordem certa
      expect(mockTransactionsService.create).toHaveBeenCalledWith(10, dto);
    });
  });

  describe("findOne()", () => {
    test("deve chamar o findOne do service passando o ID da URL", async () => {
      // --- ARRANGE ---
      const mockRequest = { user: { sub: 10 } };
      const mockResult = {
        id: 5,
        title: "Pizza",
        userId: 10,
        amount: 50,
        type: TransactionType.EXPENSE,
        date: new Date(),
      };
      mockTransactionsService.findOne.mockResolvedValue(mockResult);

      // --- ACT ---
      const result = await controller.findOne(5, mockRequest);

      // --- ASSERT ---
      expect(result).toEqual(mockResult);
      expect(mockTransactionsService.findOne).toHaveBeenCalledWith(5);
    });

    test("deve lançar ForbiddenException se o usuário não é o proprietário", async () => {
      // --- ARRANGE ---
      const mockRequest = { user: { sub: 10 } };
      const mockResult = {
        id: 5,
        title: "Pizza",
        userId: 99, // Outro usuário!
        amount: 50,
        type: TransactionType.EXPENSE,
        date: new Date(),
      };
      mockTransactionsService.findOne.mockResolvedValue(mockResult);

      // --- ACT & ASSERT ---
      await expect(controller.findOne(5, mockRequest)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("update()", () => {
    test("deve repassar o ID e o DTO para o service", async () => {
      // --- ARRANGE ---
      const mockRequest = { user: { sub: 10 } };
      const dto: CreateTransactionDto = {
        title: "Pizza (Atualizado)",
        amount: 60,
        type: TransactionType.EXPENSE,
        date: new Date().toISOString(),
      };
      const mockTransaction = {
        id: 5,
        title: "Pizza",
        userId: 10,
        amount: 50,
        type: TransactionType.EXPENSE,
        date: new Date(),
      };
      const mockResult = { ...mockTransaction, ...dto };

      mockTransactionsService.findOne.mockResolvedValue(mockTransaction);
      mockTransactionsService.update.mockResolvedValue(mockResult);

      // --- ACT ---
      const result = await controller.update(5, dto, mockRequest);

      // --- ASSERT ---
      expect(result).toEqual(mockResult);
      expect(mockTransactionsService.update).toHaveBeenCalledWith(5, dto);
    });

    test("deve lançar ForbiddenException ao atualizar transação de outro usuário", async () => {
      // --- ARRANGE ---
      const mockRequest = { user: { sub: 10 } };
      const dto: CreateTransactionDto = {
        title: "Pizza (Atualizado)",
        amount: 60,
        type: TransactionType.EXPENSE,
        date: new Date().toISOString(),
      };
      const mockTransaction = {
        id: 5,
        title: "Pizza",
        userId: 99, // Outro usuário!
        amount: 50,
        type: TransactionType.EXPENSE,
        date: new Date(),
      };

      mockTransactionsService.findOne.mockResolvedValue(mockTransaction);

      // --- ACT & ASSERT ---
      await expect(controller.update(5, dto, mockRequest)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("delete()", () => {
    test("deve repassar o ID para o service deletar", async () => {
      // --- ARRANGE ---
      const mockRequest = { user: { sub: 10 } };
      const mockTransaction = {
        id: 5,
        title: "Pizza",
        userId: 10,
        amount: 50,
        type: TransactionType.EXPENSE,
        date: new Date(),
      };
      mockTransactionsService.findOne.mockResolvedValue(mockTransaction);
      mockTransactionsService.delete.mockResolvedValue(mockTransaction);

      // --- ACT ---
      const result = await controller.delete(5, mockRequest);

      // --- ASSERT ---
      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsService.delete).toHaveBeenCalledWith(5);
    });

    test("deve lançar ForbiddenException ao deletar transação de outro usuário", async () => {
      // --- ARRANGE ---
      const mockRequest = { user: { sub: 10 } };
      const mockTransaction = {
        id: 5,
        title: "Pizza",
        userId: 99, // Outro usuário!
        amount: 50,
        type: TransactionType.EXPENSE,
        date: new Date(),
      };

      mockTransactionsService.findOne.mockResolvedValue(mockTransaction);

      // --- ACT & ASSERT ---
      await expect(controller.delete(5, mockRequest)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
