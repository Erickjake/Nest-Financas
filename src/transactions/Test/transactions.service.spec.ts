import { Test, TestingModule } from "@nestjs/testing";
import { TransactionsService } from "../transactions.service";
import { PrismaService } from "../../prisma/prisma.service";
import { describe, it, expect, beforeEach, vi } from "vitest";
// ... o restante dos seus imports (TransactionsService, etc)

describe("TransactionsService", () => {
  let service: TransactionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: {
            transaction: { create: vi.fn() }, // Criamos um "Mock" do Prisma
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("deve converter description em title ao salvar no Prisma", async () => {
    const createSpy = vi.spyOn(prisma.transaction, "create");

    await service.create("1", {
      // String primeiro!
      amount: 100,
      type: "INCOME" as any,
      description: "Teste de Mesa",
    });

    expect(createSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Teste de Mesa", // Aqui validamos o mapeamento!
        userId: 1,
      }),
    });
  });
});
