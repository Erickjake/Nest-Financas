import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnershipGuard, TransactionOwnershipGuard } from '../ownership.guard';

// ──────────────────────────────────────────────
// Helpers para criar mocks do ExecutionContext
// ──────────────────────────────────────────────
function criarContexto(requestData: Record<string, any>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => requestData,
    }),
  } as unknown as ExecutionContext;
}

// ──────────────────────────────────────────────
describe('OwnershipGuard', () => {
  let guard: OwnershipGuard;

  beforeEach(() => {
    guard = new OwnershipGuard();
  });

  it('deve retornar true e setar request.userId quando user.userId presente', () => {
    const request: Record<string, any> = { user: { userId: 42 } };
    const ctx = criarContexto(request);

    const resultado = guard.canActivate(ctx);

    expect(resultado).toBe(true);
    expect(request.userId).toBe(42);
  });

  it('deve retornar true usando user.sub como fallback', () => {
    const request: Record<string, any> = { user: { sub: 7 } };
    const ctx = criarContexto(request);

    const resultado = guard.canActivate(ctx);

    expect(resultado).toBe(true);
    expect(request.userId).toBe(7);
  });

  it('deve lançar ForbiddenException quando user é undefined', () => {
    const ctx = criarContexto({ user: undefined });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Usuário não autenticado ou token inválido');
  });

  it('deve lançar ForbiddenException quando userId e sub estão ausentes', () => {
    const ctx = criarContexto({ user: { email: 'test@test.com' } });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

// ──────────────────────────────────────────────
describe('TransactionOwnershipGuard', () => {
  let guard: TransactionOwnershipGuard;
  let transactionsServiceMock: { findOne: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transactionsServiceMock = { findOne: vi.fn() };
    guard = new TransactionOwnershipGuard(transactionsServiceMock as any);
  });

  it('deve retornar true e guardar transação na request quando é o dono', async () => {
    const transacao = { id: 5, userId: 10 };
    transactionsServiceMock.findOne.mockResolvedValue(transacao);

    const request: Record<string, any> = { user: { userId: 10 }, params: { id: '5' } };
    const ctx = criarContexto(request);

    const resultado = await guard.canActivate(ctx);

    expect(resultado).toBe(true);
    expect(request.resource).toEqual(transacao);
  });

  it('deve lançar ForbiddenException quando userId ausente', async () => {
    const ctx = criarContexto({ user: {}, params: { id: '5' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Usuário não autenticado');
  });

  it('deve lançar ForbiddenException quando transactionId ausente', async () => {
    const ctx = criarContexto({ user: { userId: 1 }, params: {} });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('ID da transação não fornecido');
  });

  it('deve lançar ForbiddenException quando transação não encontrada', async () => {
    transactionsServiceMock.findOne.mockResolvedValue(null);

    const ctx = criarContexto({ user: { userId: 1 }, params: { id: '999' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Transação não encontrada');
  });

  it('deve lançar ForbiddenException quando usuário não é o dono', async () => {
    transactionsServiceMock.findOne.mockResolvedValue({ id: 5, userId: 2 });

    const ctx = criarContexto({ user: { userId: 1 }, params: { id: '5' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('permissão');
  });

  it('deve funcionar usando user.sub como fallback para userId', async () => {
    transactionsServiceMock.findOne.mockResolvedValue({ id: 3, userId: 5 });

    const request: Record<string, any> = { user: { sub: 5 }, params: { id: '3' } };
    const ctx = criarContexto(request);

    const resultado = await guard.canActivate(ctx);

    expect(resultado).toBe(true);
  });
});
