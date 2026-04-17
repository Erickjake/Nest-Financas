/**
 * 🧪 AuthService Tests - Testa autenticação
 */

import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JwtService } from "@nestjs/jwt";
import type { UsersService } from "../module/users/users.service";
import { AuthService } from "./auth.service";

const usersMock = { findByEmail: vi.fn() };
const jwtMock = { signAsync: vi.fn() };

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      usersMock as unknown as UsersService,
      jwtMock as unknown as JwtService,
    );
  });

  it("rejeita login com email inválido", async () => {
    usersMock.findByEmail.mockResolvedValue(null);
    await expect(service.signIn("nao@existe.com", "senha123")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("chama findByEmail com email correto", async () => {
    usersMock.findByEmail.mockResolvedValue(null);
    try {
      await service.signIn("joao@test.com", "senha123");
    } catch {
      // esperado
    }
    expect(usersMock.findByEmail).toHaveBeenCalledWith("joao@test.com");
  });
});
