// src/users/users.service.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../users.service';

// (O caminho dos '../' pode variar levemente dependendo de onde está sua pasta prisma)

// 1. Criamos o nosso "Dublê" (Mock) do banco de dados
const prismaMock = {
  user: {
    findUnique: vi.fn(), // vi.fn() cria uma função vazia que podemos controlar
  },
};

describe('UsersService', () => {
  let usersService: UsersService;

  // 2. Antes de cada teste, "limpamos" o ambiente e instanciamos o Service
  beforeEach(() => {
    vi.clearAllMocks(); // Limpa a memória dos dublês
    // Injetamos o Prisma falso no nosso service real
    usersService = new UsersService(prismaMock as unknown as PrismaService);
  });

  describe('findByEmail()', () => {
    // TESTE 1: Caminho feliz (quando dá tudo certo)
    it('deve retornar um usuário quando o email existir (Caminho Feliz)', async () => {
      // --- ARRANGE (Preparar) ---
      const emailTest = 'teste@email.com';
      const usuarioFalso = { id: 1, name: 'João', email: emailTest };

      // Ensinamos o nosso dublê: "Quando te chamarem, retorne o usuarioFalso"
      prismaMock.user.findUnique.mockResolvedValue(usuarioFalso);

      // --- ACT (Agir) ---
      const resultado = await usersService.findByEmail(emailTest);

      // --- ASSERT (Verificar) ---
      expect(resultado).toEqual(usuarioFalso); // O resultado tem que ser igual ao falso
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1); // O banco deve ser chamado 1 vez
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        // O banco deve ser chamado com o email certo
        where: { email: emailTest },
      });
    });

    // TESTE 2: Caminho triste (quando dá erro)
    // TESTE 2: Caminho triste (quando dá erro)
    it('deve retornar nulo quando o email não for encontrado', async () => {
      // --- ARRANGE ---
      const emailTest = 'naoexiste@email.com';
      prismaMock.user.findUnique.mockResolvedValue(null);

      // --- ACT ---
      const resultado = await usersService.findByEmail(emailTest);

      // --- ASSERT ---
      expect(resultado).toBeNull(); // O Vitest agora espera que a resposta seja null!
    });
    it('deve retornar nulo quando o email for vazio', async () => {
      // --- ARRANGE ---
      const emailTest = '';

      prismaMock.user.findUnique.mockResolvedValue(null);

      // --- ACT ---
      const resultado = await usersService.findByEmail(emailTest);

      // --- ASSERT ---
      expect(resultado).toBeNull(); // O Vitest agora espera que a resposta seja null!
    });
  });
});
