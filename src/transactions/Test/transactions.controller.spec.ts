import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransactionsController } from "../transactions.controller";
import { TransactionsService } from "../transactions.service";

describe("TransactionsController", () => {
  let controller: TransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      // 👇 É aqui que a mágica acontece
      providers: [
        {
          provide: TransactionsService,
          useValue: {
            // Criamos versões "falsas" (mocks) das funções que o controller usa
            create: vi.fn(),
            findAll: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it("deve estar definido", () => {
    expect(controller).toBeDefined();
  });
});
