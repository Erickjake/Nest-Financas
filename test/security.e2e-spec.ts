/**
 * 🧪 E2E Tests - Segurança e Infraestrutura
 *
 * Testa aspectos de segurança e infraestrutura da API:
 * 1. Helmet - Headers de segurança
 * 2. Swagger - Documentação acessível
 * 3. JWT - Tokens inválidos/expirados
 * 4. AllExceptionsFilter - Formato de erros
 * 5. CORS - Headers presentes
 * 6. Cookie Security - HttpOnly cookie
 */

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/prisma/prisma.service';

describe('E2E - Segurança e Infraestrutura', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let uniqueSuffix: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
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
  });

  afterEach(async () => {
    await app.close();
  });

  // =======================================================
  // Helmet - Headers de Segurança
  // =======================================================
  describe('Helmet - Headers de Segurança', () => {
    it('deve ter header X-Content-Type-Options', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('deve ter header X-Frame-Options', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('deve ter header X-DNS-Prefetch-Control', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('deve ter header Strict-Transport-Security', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('deve ter header X-Download-Options', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.headers['x-download-options']).toBe('noopen');
    });

    it('deve ter header X-Permitted-Cross-Domain-Policies', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
    });
  });

  // =======================================================
  // JWT - Autenticação
  // =======================================================
  describe('JWT - Autenticação', () => {
    it('deve retornar 401 para endpoint protegido sem cookie', async () => {
      const res = await request(app.getHttpServer()).get('/transactions').expect(401);

      expect(res.body).toHaveProperty('message');
    });

    it('deve retornar 401 para cookie JWT inválido/malformado', async () => {
      await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', 'access_token=token-invalido-qualquer')
        .expect(401);
    });

    it('deve retornar 401 para cookie JWT com assinatura inválida', async () => {
      // JWT com assinatura errada
      const fakeJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTcxMDAwMDAwMH0.assinatura-invalida';
      await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', `access_token=${fakeJwt}`)
        .expect(401);
    });

    it('deve setar cookie HttpOnly ao fazer login', async () => {
      // Criar usuário
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Cookie Test',
          email: `cookie.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `cookie.${uniqueSuffix}@test.com`, password: 'SenhaForte123' })
        .expect(200);

      const setCookieHeader = loginRes.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(String(setCookieHeader)).toContain('HttpOnly');
    });

    it('deve limpar cookie ao fazer logout', async () => {
      // Criar e logar
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Logout Test',
          email: `logout.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `logout.${uniqueSuffix}@test.com`, password: 'SenhaForte123' });

      const cookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      const logoutCookie = String(logoutRes.headers['set-cookie']);
      expect(logoutCookie).toContain('access_token=;');
    });

    it('deve renovar sessão via /auth/refresh e rotacionar refresh token', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Refresh Test',
          email: `refresh.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `refresh.${uniqueSuffix}@test.com`, password: 'SenhaForte123' })
        .expect(200);

      const cookiesFromLogin = loginRes.headers['set-cookie'] as string[];
      const refreshCookieBefore = cookiesFromLogin.find((cookie) =>
        cookie.startsWith('refresh_token='),
      );
      expect(refreshCookieBefore).toBeDefined();
      const refreshTokenBefore = (refreshCookieBefore as string).split(';')[0].split('=')[1];

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshTokenBefore}`])
        .expect(200);

      const cookiesFromRefresh = refreshRes.headers['set-cookie'] as string[];
      const refreshCookieAfter = cookiesFromRefresh.find((cookie) =>
        cookie.startsWith('refresh_token='),
      );
      expect(refreshCookieAfter).toBeDefined();
      const refreshTokenAfter = (refreshCookieAfter as string).split(';')[0].split('=')[1];
      expect(refreshCookieAfter).not.toEqual(refreshCookieBefore);
      expect(refreshTokenAfter).not.toEqual(refreshTokenBefore);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshTokenBefore}`])
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshTokenAfter}`])
        .expect(200);
    });

    it('deve revogar refresh token no logout', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Logout Revoke',
          email: `logout-revoke.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `logout-revoke.${uniqueSuffix}@test.com`, password: 'SenhaForte123' })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'] as string[];

      await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookies).expect(200);

      await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookies).expect(401);
    });
  });

  // =======================================================
  // AllExceptionsFilter - Formato de Erros
  // =======================================================
  describe('AllExceptionsFilter - Formato de Erros', () => {
    it('deve retornar erro de validação com formato padronizado (400)', async () => {
      const res = await request(app.getHttpServer()).post('/users').send({}).expect(400);

      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('message');
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('deve retornar 401 para acesso não autorizado com formato padronizado', async () => {
      const res = await request(app.getHttpServer()).get('/transactions').expect(401);

      expect(res.body).toHaveProperty('statusCode', 401);
      expect(res.body).toHaveProperty('message');
    });

    it('deve retornar 404 para rota inexistente', async () => {
      const res = await request(app.getHttpServer()).get('/rota-que-nao-existe').expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
    });
  });

  // =======================================================
  // Isolamento entre Usuários
  // =======================================================
  describe('Isolamento entre Usuários', () => {
    it('usuário A não deve ver transações do usuário B na listagem', async () => {
      // Criar e logar User A
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'User A',
          email: `usera.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const loginA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `usera.${uniqueSuffix}@test.com`, password: 'SenhaForte123' });
      const cookieA = loginA.headers['set-cookie'];

      // Criar transação com User A
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieA)
        .send({ title: 'Txn A', amount: 100, type: 'INCOME', date: '2026-01-15T12:00:00Z' });

      // Criar e logar User B
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'User B',
          email: `userb.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const loginB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `userb.${uniqueSuffix}@test.com`, password: 'SenhaForte123' });
      const cookieB = loginB.headers['set-cookie'];

      // User B lista transações - deve estar vazio
      const listB = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', cookieB)
        .expect(200);

      expect(listB.body.data).toHaveLength(0);

      // User A lista transações - deve ter 1
      const listA = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', cookieA)
        .expect(200);

      expect(listA.body.data).toHaveLength(1);
    });
  });

  // =======================================================
  // A01 - Broken Access Control (IDOR)
  // =======================================================
  describe('OWASP A01 - IDOR: Controle de Acesso', () => {
    async function criarUsuarioELogar(nome: string, email: string) {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: nome, email, password: 'SenhaForte123' });
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'SenhaForte123' });
      return login.headers['set-cookie'] as string[];
    }

    it('usuário B não deve acessar transação de usuário A via ID direto (IDOR)', async () => {
      const cookieA = await criarUsuarioELogar('IDOR UserA', `idorA.${uniqueSuffix}@test.com`);
      const cookieB = await criarUsuarioELogar('IDOR UserB', `idorB.${uniqueSuffix}@test.com`);

      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieA)
        .send({ title: 'Privada', amount: 500, type: 'INCOME', date: '2026-03-10T12:00:00Z' });

      const txnId = createRes.body.id;

      // User B tenta acessar a transação de User A pelo ID
      await request(app.getHttpServer())
        .get(`/transactions/${txnId}`)
        .set('Cookie', cookieB)
        .expect(403);
    });

    it('usuário B não deve atualizar transação de usuário A', async () => {
      const cookieA = await criarUsuarioELogar('IDOR UserA2', `idorA2.${uniqueSuffix}@test.com`);
      const cookieB = await criarUsuarioELogar('IDOR UserB2', `idorB2.${uniqueSuffix}@test.com`);

      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieA)
        .send({ title: 'Minha txn', amount: 100, type: 'INCOME', date: '2026-03-10T12:00:00Z' });

      const txnId = createRes.body.id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/transactions/${txnId}`)
        .set('Cookie', cookieB)
        .send({ amount: 9999 });

      // A implementação pode responder 403 (forbidden) ou 404 (não encontrado para recurso de outro usuário).
      expect([403, 404]).toContain(updateRes.status);

      const ownerView = await request(app.getHttpServer())
        .get(`/transactions/${txnId}`)
        .set('Cookie', cookieA)
        .expect(200);

      expect(ownerView.body.amount).toBe(100);
    });

    it('usuário B não deve deletar transação de usuário A', async () => {
      const cookieA = await criarUsuarioELogar('IDOR UserA3', `idorA3.${uniqueSuffix}@test.com`);
      const cookieB = await criarUsuarioELogar('IDOR UserB3', `idorB3.${uniqueSuffix}@test.com`);

      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieA)
        .send({ title: 'Del txn', amount: 100, type: 'INCOME', date: '2026-03-10T12:00:00Z' });

      const txnId = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/transactions/${txnId}`)
        .set('Cookie', cookieB)
        .expect(403);
    });
  });

  // =======================================================
  // A02 - Cryptographic Failures (exposição de senha)
  // =======================================================
  describe('OWASP A02 - Dados Sensíveis: Senha não exposta', () => {
    it('não deve retornar campo password na criação do usuário', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Senha Test',
          email: `senha.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        })
        .expect(201);

      expect(res.body).not.toHaveProperty('password');
    });

    it('não deve retornar campo password na listagem de usuários', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Perfil Test',
          email: `perfil.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const users = await request(app.getHttpServer()).get('/users').expect(200);

      for (const user of users.body) {
        expect(user).not.toHaveProperty('password');
      }
    });
  });

  // =======================================================
  // A03 - Injection (SQL Injection via parâmetros)
  // =======================================================
  describe('OWASP A03 - Injection: SQL Injection', () => {
    let cookieSql: string[];

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'SQL Test',
          email: `sql.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `sql.${uniqueSuffix}@test.com`, password: 'SenhaForte123' });
      cookieSql = login.headers['set-cookie'];
    });

    it('deve rejeitar SQL injection no campo amount (tipo inválido)', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieSql)
        .send({
          title: 'Injeção',
          amount: '1; DROP TABLE transactions; --',
          type: 'INCOME',
          date: '2026-01-15T12:00:00Z',
        })
        .expect(400);
    });

    it('deve tratar payload com caracteres especiais em campos de texto sem erro 500', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieSql)
        .send({
          title: "'; DROP TABLE users; --",
          amount: 100,
          type: 'INCOME',
          date: '2026-01-15T12:00:00Z',
        });

      // Deve criar normalmente (ORM parametriza) ou retornar erro de validação, nunca 500
      expect(res.status).not.toBe(500);
    });

    it('deve tratar SQL injection em parâmetro de query string sem erro 500', async () => {
      const res = await request(app.getHttpServer())
        .get("/transactions?page=1' OR '1'='1")
        .set('Cookie', cookieSql);

      expect(res.status).not.toBe(500);
    });
  });

  // =======================================================
  // A04 - Insecure Design: Validação de Input
  // =======================================================
  describe('OWASP A04 - Validação de Input', () => {
    let cookieVal: string[];

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Val Test',
          email: `val.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `val.${uniqueSuffix}@test.com`, password: 'SenhaForte123' });
      cookieVal = login.headers['set-cookie'];
    });

    it('deve rejeitar campos extras (forbidNonWhitelisted) na criação de transação', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieVal)
        .send({
          title: 'Txn',
          amount: 100,
          type: 'INCOME',
          date: '2026-01-15T12:00:00Z',
          campoMalicioso: 'hack',
        })
        .expect(400);
    });

    it('deve rejeitar tipo de transação inválido', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieVal)
        .send({
          title: 'Txn',
          amount: 100,
          type: 'INVALID_TYPE',
          date: '2026-01-15T12:00:00Z',
        })
        .expect(400);
    });

    it('deve rejeitar amount negativo', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookieVal)
        .send({
          title: 'Txn',
          amount: -500,
          type: 'INCOME',
          date: '2026-01-15T12:00:00Z',
        })
        .expect(400);
    });

    it('deve rejeitar criação de usuário com email inválido', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Test',
          email: 'nao-e-um-email',
          password: 'SenhaForte123',
        })
        .expect(400);
    });
  });

  // =======================================================
  // A07 - Auth Failures: Rate Limiting no Login
  // =======================================================
  describe('OWASP A07 - Rate Limiting no Login', () => {
    it('deve bloquear múltiplas tentativas de login com credenciais erradas (brute-force)', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Rate Test',
          email: `rate.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      // Envia 6 tentativas com senha errada (limite é 5)
      const resultados: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: `rate.${uniqueSuffix}@test.com`, password: 'SenhaErrada123' });
        resultados.push(res.status);
      }

      // Pelo menos uma resposta deve ser 429 (Too Many Requests)
      expect(resultados).toContain(429);
    });
  });
});
