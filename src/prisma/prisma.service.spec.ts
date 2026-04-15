import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "./prisma.service";
import { beforeEach, describe, expect, it } from "vitest";

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it("deve estar definido", () => {
    expect(service).toBeDefined();
  });
});
