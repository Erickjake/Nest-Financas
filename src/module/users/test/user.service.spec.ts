/**
 * 🧪 UsersService Tests
 * Testa toda a lógica de negócio para gerenciar usuários
 *
 * Métodos testados:
 * ✅ create() - Hash de password com bcrypt
 * ✅ findByEmail() - Busca por email
 * ✅ findOne() - Busca por ID
 * ✅ findAll() - Retorna todos
 * ✅ update() - Atualiza campos
 * ✅ remove() - Deleta usuário
 */

// src/users/users.service.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../users.service';

// Mock do Prisma com todos os métodos necessários
const prismaMock = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('UsersService', () => {
  let usersService: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    usersService = new UsersService(prismaMock as unknown as PrismaService);
  });

  describe('create()', () => {
    /**
     * Teste: Criar usuário com hash de password
     * Importante: Password deve ser hasheado com bcrypt antes de salvar
     * Setup: Mock do Prisma.user.create
     * Esperado: Usuario retornado com password hasheado
     */
    it('deve criar usuário e hashear a password com bcrypt', async () => {
      // ARRANGE
      const createUserDto = {
        name: 'João Silva',
        email: 'joao@test.com',
        password: 'SecurePass123', // Senha em plain text
      };

      const usuarioCriado = {
        id: 1,
        name: 'João Silva',
        email: 'joao@test.com',
        password: '$2b$10$...', // Hasheado pelo bcrypt
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      prismaMock.user.create.mockResolvedValue(usuarioCriado);

      // ACT
      const resultado = await usersService.create(createUserDto);

      // ASSERT
      expect(resultado).toEqual(usuarioCriado);
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
      // Verifica que create foi chamado com un objeto data
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'João Silva',
            email: 'joao@test.com',
            // Password deve ser hasheado (não a plain text)
            password: expect.not.stringContaining('SecurePass123'),
          }),
        }),
      );
    });

    /**
     * Teste: Falha ao criar usuário com email duplicado
     * Importante: Constraint UNIQUE no banco rejeita duplicata
     * Esperado: Erro de constraints do Prisma
     */
    it('deve lançar erro quando email já existe', async () => {
      // ARRANGE
      const createUserDto = {
        name: 'João Silva',
        email: 'joao@test.com',
        password: 'SecurePass123',
      };

      const prismaError = new Error('Unique constraint failed on the fields: (`email`)');
      prismaMock.user.create.mockRejectedValue(prismaError);

      // ACT & ASSERT
      await expect(usersService.create(createUserDto)).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('findByEmail()', () => {
    /**
     * Teste: Encontrar usuário por email (sucesso)
     * Importante: Usado em login para buscar usuário antes de comparar password
     */
    it('deve retornar um usuário quando o email existir', async () => {
      // ARRANGE
      const emailTest = 'joao@test.com';
      const usuarioFalso = {
        id: 1,
        name: 'João',
        email: emailTest,
        password: 'hashed...',
      };

      prismaMock.user.findUnique.mockResolvedValue(usuarioFalso);

      // ACT
      const resultado = await usersService.findByEmail(emailTest);

      // ASSERT
      expect(resultado).toEqual(usuarioFalso);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: emailTest },
      });
    });

    /**
     * Teste: Email não encontrado retorna null
     * Importante: Em login, isso significa credenciais inválidas
     */
    it('deve retornar nulo quando o email não for encontrado', async () => {
      // ARRANGE
      const emailTest = 'naoexiste@email.com';
      prismaMock.user.findUnique.mockResolvedValue(null);

      // ACT
      const resultado = await usersService.findByEmail(emailTest);

      // ASSERT
      expect(resultado).toBeNull();
    });
  });

  describe('findOne()', () => {
    /**
     * Teste: Buscar usuário por ID (sucesso)
     * Importante: Used em operações que precisam dos dados do usuário Current
     */
    it('deve retornar um usuário quando o ID existir', async () => {
      // ARRANGE
      const userId = 1;
      const usuario = {
        id: 1,
        name: 'João',
        email: 'joao@test.com',
        password: 'hashed...',
      };

      prismaMock.user.findUnique.mockResolvedValue(usuario);

      // ACT
      const resultado = await usersService.findOne(userId);

      // ASSERT
      expect(resultado).toEqual(usuario);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    /**
     * Teste: ID não encontrado retorna undefined/null
     */
    it('deve retornar nulo quando o usuário não existir', async () => {
      // ARRANGE
      const userId = 999;
      prismaMock.user.findUnique.mockResolvedValue(null);

      // ACT
      const resultado = await usersService.findOne(userId);

      // ASSERT
      expect(resultado).toBeNull();
    });
  });

  describe('findAll()', () => {
    /**
     * Teste: Retornar lista de todos os usuários
     * Importante: Cuidado com performance em production (paginação?)
     */
    it('deve retornar lista de todos os usuários', async () => {
      // ARRANGE
      const usuarios = [
        { id: 1, name: 'João', email: 'joao@test.com' },
        { id: 2, name: 'Maria', email: 'maria@test.com' },
      ];

      prismaMock.user.findMany.mockResolvedValue(usuarios);

      // ACT
      const resultado = await usersService.findAll();

      // ASSERT
      expect(resultado).toEqual(usuarios);
      expect(resultado).toHaveLength(2);
    });

    /**
     * Teste: Retornar array vazio quando no users exist
     */
    it('deve retornar array vazio quando não houver usuários', async () => {
      // ARRANGE
      prismaMock.user.findMany.mockResolvedValue([]);

      // ACT
      const resultado = await usersService.findAll();

      // ASSERT
      expect(resultado).toEqual([]);
      expect(resultado).toHaveLength(0);
    });
  });

  describe('update()', () => {
    /**
     * Teste: Atualizar dados do usuário
     * Importante: Apenas campos definidos no DTO são atualizados
     */
    it('deve atualizar um usuário existente', async () => {
      // ARRANGE
      const userId = 1;
      const updateUserDto = {
        name: 'João Atualizado',
        email: 'joao.novo@test.com',
      };

      const usuarioAtualizado = {
        id: 1,
        name: 'João Atualizado',
        email: 'joao.novo@test.com',
        password: 'hashed...',
        updatedAt: new Date(),
      };

      prismaMock.user.update.mockResolvedValue(usuarioAtualizado);

      // ACT
      const resultado = await usersService.update(userId, updateUserDto);

      // ASSERT
      expect(resultado).toEqual(usuarioAtualizado);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
      });
    });

    /**
     * Teste: Tentar atualizar usuário que não existe
     */
    it('deve lançar erro ao atualizar usuário inexistente', async () => {
      // ARRANGE
      const userId = 999;
      const updateUserDto = { name: 'Novo Nome' };
      const error = new Error('Record to update not found');

      prismaMock.user.update.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(usersService.update(userId, updateUserDto)).rejects.toThrow(
        'Record to update not found',
      );
    });
  });

  describe('remove()', () => {
    /**
     * Teste: Deletar usuário existente
     * Importante: Após delete, usuário não existirá mais
     */
    it('deve deletar um usuário existente', async () => {
      // ARRANGE
      const userId = 1;
      const usuarioDeletado = {
        id: 1,
        name: 'João',
        email: 'joao@test.com',
      };

      prismaMock.user.delete.mockResolvedValue(usuarioDeletado);

      // ACT
      const resultado = await usersService.remove(userId);

      // ASSERT
      expect(resultado).toEqual(usuarioDeletado);
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    /**
     * Teste: Tentar deletar usuário inexistente
     */
    it('deve lançar erro ao deletar usuário inexistente', async () => {
      // ARRANGE
      const userId = 999;
      const error = new Error('Record to delete does not exist');

      prismaMock.user.delete.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(usersService.remove(userId)).rejects.toThrow('Record to delete does not exist');
    });
  });
});
