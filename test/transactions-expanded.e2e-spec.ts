/**
 * 🧪 E2E Tests - Transactions Expandidos
 *
 * Testa cenários avançados de transações:
 * 1. GET /transactions/:id - Buscar transação por ID (happy path)
 * 2. Transação com categoria (categoryId)
 * 3. Transação com data customizada
 * 4. Tipos de transação: INCOME, EXPENSE, TRANSFER
 * 5. Validação de DTO expandida (campos edge case)
 * 6. Update completo e parcial
 */

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/prisma/prisma.service';

describe('E2E - Transactions Expanded', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let uniqueSuffix: string;
  let authCookie: string;

  /** Helper: cria usuário e faz login, retorna cookie */
  async function createAndLogin(suffix?: string) {
    const email = `txn.exp.${suffix || uniqueSuffix}@test.com`;
    const userData = { name: 'Txn User', email, password: 'SenhaForte123' };

    const signupRes = await request(app.getHttpServer()).post('/users').send(userData);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'SenhaForte123' });

    const cookie = loginRes.headers['set-cookie']?.[0] || loginRes.headers['set-cookie'];
    return { cookie: cookie as string, userId: signupRes.body.id as number, email };
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    uniqueSuffix = Date.now().toString();

    await prisma.budget.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    // Criar usuário e logar para testes autenticados
    const auth = await createAndLogin();
    authCookie = auth.cookie;
  });

  afterEach(async () => {
    await app.close();
  });

  // =======================================================
  // GET /transactions/:id - Buscar transação por ID
  // =======================================================
  describe('GET /transactions/:id - Buscar por ID', () => {
    it('deve retornar transação do próprio usuário', async () => {
      // Criar transação
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({
          title: 'Salário',
          amount: 5000,
          type: 'INCOME',
          date: '2026-01-15T12:00:00Z',
        })
        .expect(201);

      // Buscar por ID
      const res = await request(app.getHttpServer())
        .get(`/transactions/${createRes.body.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.id).toBe(createRes.body.id);
      expect(res.body.title).toBe('Salário');
      expect(res.body.amount).toBe(5000);
      expect(res.body.type).toBe('INCOME');
    });

    it('deve retornar 403 ao acessar transação de outro usuário', async () => {
      // Criar transação com user1
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Privado', amount: 100, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(201);

      // Criar segundo usuário e logar
      const auth2 = await createAndLogin(`other.${uniqueSuffix}`);

      // Tentar acessar transação do user1 com cookie do user2
      await request(app.getHttpServer())
        .get(`/transactions/${createRes.body.id}`)
        .set('Cookie', auth2.cookie)
        .expect(403);
    });

    it('deve retornar 401 sem autenticação', async () => {
      await request(app.getHttpServer()).get('/transactions/1').expect(401);
    });
  });

  // =======================================================
  // Transações com Categoria
  // =======================================================
  describe('Transações com Categoria', () => {
    it('deve criar transação vinculada a uma categoria', async () => {
      // Criar categoria
      const catRes = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Alimentação', color: '#FF5733', icon: '🍔' })
        .expect(201);

      // Criar transação com categoryId
      const txnRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({
          title: 'Almoço',
          amount: 45.9,
          type: 'EXPENSE',
          date: '2026-01-15T12:00:00Z',
          categoryId: String(catRes.body.id),
        })
        .expect(201);

      expect(txnRes.body).toHaveProperty('categoryId');

      // Listar e verificar que a categoria aparece na resposta paginada
      const listRes = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200);

      const txn = listRes.body.data[0];
      expect(txn.category).toBeDefined();
      expect(txn.category.name).toBe('Alimentação');
      expect(txn.category.color).toBe('#FF5733');
    });

    it('deve criar transação sem categoria (categoryId opcional)', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({
          title: 'Sem Categoria',
          amount: 100,
          type: 'EXPENSE',
          date: '2026-01-15T12:00:00Z',
        })
        .expect(201);

      expect(res.body.categoryId).toBeNull();
    });
  });

  // =======================================================
  // Tipos de Transação
  // =======================================================
  describe('Tipos de Transação', () => {
    it('deve aceitar tipo INCOME', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Salário', amount: 5000, type: 'INCOME', date: '2026-01-15T12:00:00Z' })
        .expect(201);

      expect(res.body.type).toBe('INCOME');
    });

    it('deve aceitar tipo EXPENSE', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Conta de Luz', amount: 250, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(201);

      expect(res.body.type).toBe('EXPENSE');
    });

    it('deve aceitar tipo TRANSFER', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({
          title: 'Transferência PIX',
          amount: 300,
          type: 'TRANSFER',
          date: '2026-01-15T12:00:00Z',
        })
        .expect(201);

      expect(res.body.type).toBe('TRANSFER');
    });

    it('deve rejeitar tipo inválido', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Inválido', amount: 100, type: 'INVALID', date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });
  });

  // =======================================================
  // Validação de DTO Expandida
  // =======================================================
  describe('Validação de DTO - Casos de Borda', () => {
    it('deve rejeitar amount zero', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Zero', amount: 0, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });

    it('deve rejeitar amount negativo', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Negativo', amount: -50, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });

    it('deve rejeitar amount com mais de 2 casas decimais', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Decimal', amount: 10.999, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });

    it('deve rejeitar título vazio', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: '', amount: 100, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });

    it('deve rejeitar título muito longo (>255 chars)', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({
          title: 'A'.repeat(256),
          amount: 100,
          type: 'EXPENSE',
          date: '2026-01-15T12:00:00Z',
        })
        .expect(400);
    });

    it('deve rejeitar data inválida', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Bad Date', amount: 100, type: 'EXPENSE', date: 'nao-e-data' })
        .expect(400);
    });

    it('deve rejeitar campos extras', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({
          title: 'Hack',
          amount: 100,
          type: 'EXPENSE',
          date: '2026-01-15T12:00:00Z',
          hack: true,
        })
        .expect(400);
    });

    it('deve rejeitar body sem title', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ amount: 100, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });

    it('deve rejeitar body sem amount', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Sem valor', type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });

    it('deve rejeitar body sem type', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Sem tipo', amount: 100, date: '2026-01-15T12:00:00Z' })
        .expect(400);
    });
  });

  // =======================================================
  // Transação com Data Customizada
  // =======================================================
  describe('Transações com Data', () => {
    it('deve criar transação com data específica no passado', async () => {
      const pastDate = '2025-06-15T10:00:00Z';
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Compra Antiga', amount: 200, type: 'EXPENSE', date: pastDate })
        .expect(201);

      expect(new Date(res.body.date).getTime()).toBe(new Date(pastDate).getTime());
    });

    it('deve criar transação com data futura', async () => {
      const futureDate = '2027-12-31T23:59:59Z';
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Planejada', amount: 500, type: 'EXPENSE', date: futureDate })
        .expect(201);

      expect(new Date(res.body.date).getTime()).toBe(new Date(futureDate).getTime());
    });
  });

  // =======================================================
  // PUT /transactions/:id - Update Completo
  // =======================================================
  describe('PUT /transactions/:id - Atualizar transação', () => {
    it('deve atualizar todos os campos da transação', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Original', amount: 100, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(201);

      const updateRes = await request(app.getHttpServer())
        .put(`/transactions/${createRes.body.id}`)
        .set('Cookie', authCookie)
        .send({ title: 'Atualizado', amount: 250.5, type: 'INCOME', date: '2026-06-01T08:00:00Z' })
        .expect(200);

      expect(updateRes.body.title).toBe('Atualizado');
      expect(updateRes.body.amount).toBe(250.5);
      expect(updateRes.body.type).toBe('INCOME');
    });

    it('deve retornar 403 ao atualizar transação de outro usuário', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Minha', amount: 100, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(201);

      const auth2 = await createAndLogin(`upd.other.${uniqueSuffix}`);

      await request(app.getHttpServer())
        .put(`/transactions/${createRes.body.id}`)
        .set('Cookie', auth2.cookie)
        .send({ title: 'Hackeado', amount: 999, type: 'INCOME', date: '2026-01-15T12:00:00Z' })
        .expect(403);
    });
  });

  // =======================================================
  // DELETE /transactions/:id - Deletar
  // =======================================================
  describe('DELETE /transactions/:id - Deletar transação', () => {
    it('deve deletar transação do próprio usuário', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Deletar', amount: 50, type: 'EXPENSE', date: '2026-01-15T12:00:00Z' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/transactions/${createRes.body.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Verificar que não aparece mais na listagem
      const listRes = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200);

      expect(listRes.body.data).toHaveLength(0);
    });

    it('deve retornar 403 ao deletar transação de outro usuário', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send({ title: 'Protegida', amount: 100, type: 'INCOME', date: '2026-01-15T12:00:00Z' })
        .expect(201);

      const auth2 = await createAndLogin(`del.other.${uniqueSuffix}`);

      await request(app.getHttpServer())
        .delete(`/transactions/${createRes.body.id}`)
        .set('Cookie', auth2.cookie)
        .expect(403);
    });
  });
});
