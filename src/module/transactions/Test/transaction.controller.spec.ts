import { beforeEach, describe, expect, test, vi } from "vitest";
import { TransactionsController } from "../transactions.controller";
import { CreateTransactionDto } from "../dto/transaction.dto";

// Criamos um "dublê" do nosso Service.
// O Controller vai achar que está falando com o service real.
const mockTransactionsService = {
  findAll: vi.fn(),
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
    controller = new TransactionsController(mockTransactionsService as any);
  });

  describe("getAllTransactions()", () => {
    test("deve chamar o findAll do service e retornar os dados", async () => {
      // --- ARRANGE ---
      const mockResult = [{ id: 1, title: "Salário", amount: 5000 }];
      mockTransactionsService.findAll.mockResolvedValue(mockResult);

      // --- ACT ---
      const result = await controller.getAllTransactions();

      // --- ASSERT ---
      expect(result).toEqual(mockResult);
      expect(mockTransactionsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("create()", () => {
    test("deve extrair o userId do request e repassar para o service criar a transação", async () => {
      // --- ARRANGE ---
      const dto: CreateTransactionDto = {
        title: "Aluguel",
        amount: 1500,
        type: "expense" as any,
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
      const mockResult = { id: 5, title: "Pizza" };
      mockTransactionsService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(5);

      expect(result).toEqual(mockResult);
      expect(mockTransactionsService.findOne).toHaveBeenCalledWith(5);
    });
  });

  describe("update()", () => {
    test("deve repassar o ID e o DTO para o service", async () => {
      const dto: CreateTransactionDto = {
        title: "Pizza (Atualizado)",
        amount: 60,
        type: "expense" as any,
        date: new Date().toISOString(),
      };
      const mockResult = { id: 5, ...dto };
      mockTransactionsService.update.mockResolvedValue(mockResult);

      const result = await controller.update(5, dto);

      expect(result).toEqual(mockResult);
      expect(mockTransactionsService.update).toHaveBeenCalledWith(5, dto);
    });
  });

  describe("delete()", () => {
    test("deve repassar o ID para o service deletar", async () => {
      const mockResult = { id: 5, title: "Pizza" }; // O Prisma costuma retornar o item deletado
      mockTransactionsService.delete.mockResolvedValue(mockResult);

      const result = await controller.delete(5);

      expect(result).toEqual(mockResult);
      expect(mockTransactionsService.delete).toHaveBeenCalledWith(5);
    });
  });
});
