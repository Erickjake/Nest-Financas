/**
 * 🧪 E2E Tests - Reports Expandidos
 *
 * Testa cenários adicionais de relatórios que complementam reports.e2e-spec.ts:
 * 1. by-category com múltiplas categorias
 * 2. by-category só considera EXPENSE
 * 3. monthly com múltiplos meses e tipos misturados
 * 4. Isolamento entre usuários nos reports
 * 5. Edge cases de filtro de datas
 */

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/prisma/prisma.service';

describe('E2E - Reports Expandidos', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authCookie: string;
  let userId: number;
  let uniqueSuffix: string;

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

    await prisma.budget.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    uniqueSuffix = Date.now().toString();

    // Criar usuário e logar
    const testUser = {
      name: 'Report Expanded',
      email: `report-exp-${uniqueSuffix}@test.com`,
      password: 'SenhaForte123!',
    };
    await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'];
    authCookie = Array.isArray(cookies) ? cookies[0] : cookies;

    const dbUser = await prisma.user.findUnique({
      where: { email: testUser.email },
    });
    if (!dbUser) {
      throw new Error('Usuário de teste não encontrado após criação');
    }
    userId = dbUser.id;
  });

  afterEach(async () => {
    await app.close();
  });

  // =======================================================
  // by-category com múltiplas categorias
  // =======================================================
  describe('GET /reports/by-category - Múltiplas categorias', () => {
    it('deve agrupar despesas por categoria corretamente', async () => {
      const cat1 = await prisma.category.create({
        data: { name: 'Alimentação' },
      });
      const cat2 = await prisma.category.create({
        data: { name: 'Transporte' },
      });

      await prisma.transaction.createMany({
        data: [
          {
            title: 'Almoço',
            amount: 30,
            type: 'EXPENSE',
            userId,
            categoryId: cat1.id,
            date: new Date(),
          },
          {
            title: 'Jantar',
            amount: 50,
            type: 'EXPENSE',
            userId,
            categoryId: cat1.id,
            date: new Date(),
          },
          {
            title: 'Uber',
            amount: 20,
            type: 'EXPENSE',
            userId,
            categoryId: cat2.id,
            date: new Date(),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/reports/by-category')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toHaveLength(2);

      const alimentacao = res.body.find(
        (c: { categoryName: string }) => c.categoryName === 'Alimentação',
      );
      const transporte = res.body.find(
        (c: { categoryName: string }) => c.categoryName === 'Transporte',
      );

      expect(alimentacao).toBeDefined();
      expect(alimentacao.total).toBe(80);
      expect(alimentacao.count).toBe(2);

      expect(transporte).toBeDefined();
      expect(transporte.total).toBe(20);
      expect(transporte.count).toBe(1);
    });

    it('deve ignorar transações INCOME no relatório por categoria', async () => {
      const cat = await prisma.category.create({
        data: { name: 'Trabalho' },
      });

      await prisma.transaction.createMany({
        data: [
          {
            title: 'Salário',
            amount: 5000,
            type: 'INCOME',
            userId,
            categoryId: cat.id,
            date: new Date(),
          },
          {
            title: 'Despesa',
            amount: 100,
            type: 'EXPENSE',
            userId,
            categoryId: cat.id,
            date: new Date(),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/reports/by-category')
        .set('Cookie', authCookie)
        .expect(200);

      // Só EXPENSE aparece
      expect(res.body).toHaveLength(1);
      expect(res.body[0].total).toBe(100);
      expect(res.body[0].count).toBe(1);
    });

    it('deve retornar lista vazia se não houver despesas', async () => {
      // Criar apenas INCOME
      await prisma.transaction.create({
        data: { title: 'Salário', amount: 5000, type: 'INCOME', userId, date: new Date() },
      });

      const res = await request(app.getHttpServer())
        .get('/reports/by-category')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  // =======================================================
  // monthly com meses misturados
  // =======================================================
  describe('GET /reports/monthly - Múltiplos meses', () => {
    it('deve agrupar income e expense por mês', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            title: 'Salário Jan',
            amount: 5000,
            type: 'INCOME',
            userId,
            date: new Date('2026-01-15'),
          },
          {
            title: 'Aluguel Jan',
            amount: 2000,
            type: 'EXPENSE',
            userId,
            date: new Date('2026-01-20'),
          },
          {
            title: 'Salário Fev',
            amount: 5000,
            type: 'INCOME',
            userId,
            date: new Date('2026-02-15'),
          },
          {
            title: 'Aluguel Fev',
            amount: 2000,
            type: 'EXPENSE',
            userId,
            date: new Date('2026-02-20'),
          },
          {
            title: 'Conta Fev',
            amount: 500,
            type: 'EXPENSE',
            userId,
            date: new Date('2026-02-25'),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/reports/monthly')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const jan = res.body.find((m: { month: string }) => m.month === '2026-01');
      const fev = res.body.find((m: { month: string }) => m.month === '2026-02');

      expect(jan).toBeDefined();
      expect(jan.income).toBe(5000);
      expect(jan.expense).toBe(2000);

      expect(fev).toBeDefined();
      expect(fev.income).toBe(5000);
      expect(fev.expense).toBe(2500);
    });

    it('deve filtrar monthly por intervalo de datas', async () => {
      await prisma.transaction.createMany({
        data: [
          { title: 'T Jan', amount: 100, type: 'INCOME', userId, date: new Date('2026-01-15') },
          { title: 'T Mar', amount: 200, type: 'INCOME', userId, date: new Date('2026-03-15') },
          { title: 'T Jun', amount: 300, type: 'INCOME', userId, date: new Date('2026-06-15') },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/reports/monthly')
        .query({ startDate: '2026-02-01', endDate: '2026-04-30' })
        .set('Cookie', authCookie)
        .expect(200);

      // Apenas março deve aparecer
      expect(res.body).toHaveLength(1);
      expect(res.body[0].month).toBe('2026-03');
    });
  });

  // =======================================================
  // summary com filtro de datas
  // =======================================================
  describe('GET /reports/summary - Filtro de datas', () => {
    it('deve filtrar summary por startDate e endDate', async () => {
      await prisma.transaction.createMany({
        data: [
          { title: 'Dentro', amount: 100, type: 'INCOME', userId, date: new Date('2026-03-15') },
          { title: 'Fora', amount: 999, type: 'INCOME', userId, date: new Date('2026-06-15') },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/reports/summary')
        .query({ startDate: '2026-03-01', endDate: '2026-03-31' })
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.income).toBe(100);
      expect(res.body.expense).toBeNull();
      expect(res.body.balance).toBe(100);
    });

    it('deve retornar zeros se nenhuma transação no período', async () => {
      await prisma.transaction.create({
        data: { title: 'Fora', amount: 500, type: 'INCOME', userId, date: new Date('2026-01-15') },
      });

      const res = await request(app.getHttpServer())
        .get('/reports/summary')
        .query({ startDate: '2026-06-01', endDate: '2026-06-30' })
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.income).toBeNull();
      expect(res.body.expense).toBeNull();
      expect(res.body.balance).toBe(0);
    });
  });

  // =======================================================
  // Isolamento entre usuários
  // =======================================================
  describe('Isolamento entre usuários nos reports', () => {
    it('relatório do usuário A não deve incluir dados do usuário B', async () => {
      // Criar User B
      const userBData = {
        name: 'User B Reports',
        email: `reportb-${uniqueSuffix}@test.com`,
        password: 'SenhaForte123!',
      };
      await request(app.getHttpServer()).post('/users').send(userBData).expect(201);
      const loginB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userBData.email, password: userBData.password });
      const cookieB = Array.isArray(loginB.headers['set-cookie'])
        ? loginB.headers['set-cookie'][0]
        : loginB.headers['set-cookie'];

      const dbUserB = await prisma.user.findUnique({
        where: { email: userBData.email },
      });
      if (!dbUserB) {
        throw new Error('Usuário B não encontrado após criação');
      }

      // User A tem R$1000 INCOME
      await prisma.transaction.create({
        data: { title: 'Renda A', amount: 1000, type: 'INCOME', userId, date: new Date() },
      });

      // User B tem R$5000 INCOME
      await prisma.transaction.create({
        data: {
          title: 'Renda B',
          amount: 5000,
          type: 'INCOME',
          userId: dbUserB.id,
          date: new Date(),
        },
      });

      // Summary de A deve mostrar somente 1000
      const resA = await request(app.getHttpServer())
        .get('/reports/summary')
        .set('Cookie', authCookie)
        .expect(200);

      expect(resA.body.income).toBe(1000);

      // Summary de B deve mostrar somente 5000
      const resB = await request(app.getHttpServer())
        .get('/reports/summary')
        .set('Cookie', cookieB)
        .expect(200);

      expect(resB.body.income).toBe(5000);
    });

    it('by-category do usuário A não deve incluir categorias do usuário B', async () => {
      // Criar User B
      const userBData = {
        name: 'User B Cat',
        email: `reportbcat-${uniqueSuffix}@test.com`,
        password: 'SenhaForte123!',
      };
      await request(app.getHttpServer()).post('/users').send(userBData).expect(201);
      const loginB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userBData.email, password: userBData.password });
      const cookieB = Array.isArray(loginB.headers['set-cookie'])
        ? loginB.headers['set-cookie'][0]
        : loginB.headers['set-cookie'];

      const dbUserB = await prisma.user.findUnique({
        where: { email: userBData.email },
      });
      if (!dbUserB) {
        throw new Error('Usuário B não encontrado após criação');
      }

      // Cat e Txn de A
      const catA = await prisma.category.create({ data: { name: 'Cat A' } });
      await prisma.transaction.create({
        data: {
          title: 'Desp A',
          amount: 100,
          type: 'EXPENSE',
          userId,
          categoryId: catA.id,
          date: new Date(),
        },
      });

      // Cat e Txn de B
      const catB = await prisma.category.create({ data: { name: 'Cat B' } });
      await prisma.transaction.create({
        data: {
          title: 'Desp B',
          amount: 200,
          type: 'EXPENSE',
          userId: dbUserB.id,
          categoryId: catB.id,
          date: new Date(),
        },
      });

      // by-category de A
      const resA = await request(app.getHttpServer())
        .get('/reports/by-category')
        .set('Cookie', authCookie)
        .expect(200);

      expect(resA.body).toHaveLength(1);
      expect(resA.body[0].categoryName).toBe('Cat A');

      // by-category de B
      const resB = await request(app.getHttpServer())
        .get('/reports/by-category')
        .set('Cookie', cookieB)
        .expect(200);

      expect(resB.body).toHaveLength(1);
      expect(resB.body[0].categoryName).toBe('Cat B');
    });
  });
});
