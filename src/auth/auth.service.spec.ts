/**
 * 🧪 AuthService Tests - Testa autenticação
 */

import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../module/users/users.service';
import { AuthService } from './auth.service';

const usersMock = { findByEmail: vi.fn(), setRefreshTokenHash: vi.fn() };
const jwtMock = { signAsync: vi.fn(), verifyAsync: vi.fn() };
const originalJwtSecret = process.env.JWT_SECRET;
const originalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    service = new AuthService(
      usersMock as unknown as UsersService,
      jwtMock as unknown as JwtService,
    );
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    if (originalJwtRefreshSecret === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = originalJwtRefreshSecret;
    }
  });

  it('rejeita login com email inválido', async () => {
    usersMock.findByEmail.mockResolvedValue(null);
    await expect(service.signIn('nao@existe.com', 'senha123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('chama findByEmail com email correto', async () => {
    usersMock.findByEmail.mockResolvedValue(null);
    try {
      await service.signIn('joao@test.com', 'senha123');
    } catch {
      // esperado
    }
    expect(usersMock.findByEmail).toHaveBeenCalledWith('joao@test.com');
  });

  it('retorna access_token e refresh_token no login com sucesso', async () => {
    usersMock.findByEmail.mockResolvedValue({
      id: 1,
      email: 'joao@test.com',
      password: await (await import('bcrypt')).hash('SecurePass123', 10),
    });

    jwtMock.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.signIn('joao@test.com', 'SecurePass123');

    expect(result).toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(jwtMock.signAsync).toHaveBeenCalledTimes(2);
    expect(usersMock.setRefreshTokenHash).toHaveBeenCalledTimes(1);
  });

  it('renova sessão com refresh token válido', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('valid-refresh-token', 10);

    jwtMock.verifyAsync.mockResolvedValue({ sub: 1, email: 'joao@test.com' });
    usersMock.findByEmail.mockResolvedValue({
      id: 1,
      email: 'joao@test.com',
      password: 'hash',
      refreshTokenHash: hash,
    });
    jwtMock.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const result = await service.refresh('valid-refresh-token');

    expect(result).toEqual({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    });
    expect(jwtMock.verifyAsync).toHaveBeenCalled();
    expect(usersMock.setRefreshTokenHash).toHaveBeenCalledTimes(1);
  });

  it('falha no refresh quando token é inválido', async () => {
    jwtMock.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(service.refresh('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('falha no refresh quando hash persistido não confere', async () => {
    jwtMock.verifyAsync.mockResolvedValue({ sub: 1, email: 'joao@test.com' });
    usersMock.findByEmail.mockResolvedValue({
      id: 1,
      email: 'joao@test.com',
      password: 'hash',
      refreshTokenHash: await (await import('bcrypt')).hash('outro-token', 10),
    });

    await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revoga refresh token no logout quando token válido', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('valid-refresh-token', 10);
    jwtMock.verifyAsync.mockResolvedValue({ sub: 1, email: 'joao@test.com' });
    usersMock.findByEmail.mockResolvedValue({
      id: 1,
      email: 'joao@test.com',
      password: 'hash',
      refreshTokenHash: hash,
    });

    await service.logout('valid-refresh-token');

    expect(usersMock.setRefreshTokenHash).toHaveBeenCalledWith(1, null);
  });
});
