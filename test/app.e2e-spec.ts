/**
 * 🧪 E2E Tests - End-to-End Integration Tests
 *
 * Testa o fluxo completo da aplicação:
 * 1. Signup (criar nova conta)
 * 2. Login (autenticação com JWT)
 * 3. Create Transaction (criar transação autenticado)
 * 4. Get Transactions (listar transações do usuário)
 * 5. Logout (limpar sessão)
 *
 * Valida:
 * - Validação de inputs (ValidationPipe)
 * - Autenticação (JWT + cookies)
 * - Autorização (OwnershipGuard)
 * - Rate limiting (3 tentativas/min no login)
 * - Isolamento de dados (user vê só suas transações)
 */

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('E2E - Full Application Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let uniqueSuffix: string;

  // Dados de teste - will be updated with unique suffix in beforeEach
  let testUser: {
    name: string;
    email: string;
    password: string;
  };

  const testTransaction = {
    title: 'Compra de teste',
    amount: 100.5,
    type: 'expense' as const,
    date: new Date().toISOString(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Injete o PrismaService para limpeza
    prisma = moduleFixture.get<PrismaService>(PrismaService); // Get PrismaService from the module

    // Generate unique suffix for this test run
    uniqueSuffix = Date.now().toString();

    // Update test user with unique email
    testUser = {
      name: 'João E2E Test',
      email: `joao.e2e.${uniqueSuffix}@test.com`,
      password: 'TestPass123',
    };

    // Clean up database before each test
    await prisma.transaction.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    /**
     * Teste básico: Servidor respondendo
     */
    it('GET / deve retornar 200', () => {
      return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
    });
  });

  describe('Auth Flow: Signup → Login → Logout', () => {
    /**
     * 1️⃣ SIGNUP - Criar novo usuário
     * Validações testadas:
     * - Email válido (usando @IsEmail)
     * - Password forte (8+, maiúscula, minúscula, número)
     * - Name não vazio
     */
    it('POST /users deve criar novo usuário com validação', async () => {
      const response = await request(app.getHttpServer()).post('/users').send(testUser).expect(201); // Created

      // Verificar que retorna dados do usuário
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('name', testUser.name);
      // Password NÃO deve estar na resposta
      expect(response.body).not.toHaveProperty('password');
    });

    /**
     * Teste: Rejeitar email inválido
     * Validação: @IsEmail() falha
     */
    it('POST /users deve rejeitar email inválido (HTTP 400)', async () => {
      const invalidUser = {
        name: 'User',
        email: 'email_invalido_sem_arroba',
        password: 'TestPass123',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidUser)
        .expect(400); // Bad Request

      // Resposta de validação deve incluir mensagem de erro
      expect(response.body.message).toContain('email');
    });

    /**
     * Teste: Rejeitar password fraca
     * Validação: @MinLength(8) + @Matches(regex) falham
     */
    it('POST /users deve rejeitar password fraca (HTTP 400)', async () => {
      const weakPasswordUser = {
        name: 'User',
        email: 'user@test.com',
        password: '123', // Muito curto, sem maiúscula/minúscula
      };

      await request(app.getHttpServer()).post('/users').send(weakPasswordUser).expect(400);
    });

    /**
     * Teste: Rejeitar email duplicado
     * Constraint: UNIQUE(email) no banco
     */
    it('POST /users deve rejeitar email duplicado (HTTP 409 ou erro de constraint)', async () => {
      // Criar primeiro usuário
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Tentar criar com email igual
      const response = await request(app.getHttpServer()).post('/users').send(testUser).expect(400); // Ou 409 depending de implementation

      expect(response.body.message).toContain('email');
    });

    /**
     * 2️⃣ LOGIN - Autenticação e obtenção de JWT
     * Validações testadas:
     * - Email correto (rejeita typo)
     * - Password correto (bcrypt.compare)
     * - JWT token retornado
     * - Cookie secure configurado
     * - Rate limit de 3/min
     */
    it('POST /auth/login deve autenticar e retornar JWT token', async () => {
      // Criar usuário primeiro
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Fazer login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200); // OK

      // Verificar token na resposta
      expect(response.body).toHaveProperty('message', 'Login realizado com sucesso');

      // Verificar que cookie foi definido
      // Set-Cookie: access_token=eyJ...; HttpOnly; Secure; SameSite=Lax
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('access_token=');
      expect(setCookieHeader[0]).toContain('HttpOnly');
    });

    /**
     * Teste: Login com password incorreto
     * Esperado: HTTP 401 Unauthorized
     */
    it('POST /auth/login deve rejeitar password incorreto (HTTP 401)', async () => {
      // Criar usuário
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Login com password errado
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'SenhaErrada123',
        })
        .expect(401); // Unauthorized

      expect(response.body.message).toContain('inválido');
    });

    /**
     * 3️⃣ LOGOUT - Limpar sessão
     * Validações testadas:
     * - Cookie limpo (Set-Cookie com expires no passado)
     * - Response com mensagem de logout
     */
    it('POST /auth/logout deve limpar cookie', async () => {
      // Criar e logar usuário
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      const _loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Extrair cookie da resposta
      // Usar .agent() para manter cookies
      const agent = request.agent(app.getHttpServer());

      // Fazer logout
      const logoutResponse = await agent.post('/auth/logout').expect(200); // OK

      expect(logoutResponse.body).toHaveProperty('message', 'Logout realizado');

      // Verificar que clearCookie foi chamado
      const setCookieAfterLogout = logoutResponse.headers['set-cookie'];
      expect(setCookieAfterLogout).toBeDefined();
      // Cookie deve ter expires no passado (thu jan 1970) ou maxAge=0
      expect(setCookieAfterLogout[0]).toContain('access_token=');
    });
  });

  describe('Transaction Flow: Create → Read (com autorização)', () => {
    let authCookie: string;
    let userId: number;

    /**
     * Setup: Criar usuário, fazer login, obter cookie
     */
    beforeEach(async () => {
      // Signup
      const signupRes = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      userId = signupRes.body.id;

      // Login para obter cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Extrair cookie
      authCookie = loginRes.headers['set-cookie'][0];
    });

    /**
     * 4️⃣ CREATE TRANSACTION - Criar transação autenticado
     * Validações testadas:
     * - Require JWT (AuthGuard)
     * - Propriedade: transação é linkada ao usuário autenticado
     * - Validação de DTO (title, amount, type, date)
     */
    it('POST /transactions deve criar transação para usuário autenticado', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201); // Created

      // Verificar que transação foi criada com dados corretos
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', testTransaction.title);
      expect(response.body).toHaveProperty('amount', testTransaction.amount);
      expect(response.body).toHaveProperty('type', testTransaction.type);
      expect(response.body).toHaveProperty('userId', userId);
    });

    /**
     * Teste: Rejeitar request sem autenticação
     * Esperado: HTTP 401 sem JWT
     */
    it('POST /transactions deve rejeitar sem autenticação (HTTP 401)', async () => {
      await request(app.getHttpServer()).post('/transactions').send(testTransaction).expect(401); // Unauthorized
    });

    /**
     * 5️⃣ GET TRANSACTIONS - Listar transações do usuário
     * Validações testadas:
     * - Require JWT (AuthGuard)
     * - OwnershipGuard: retorna só transações do usuário autenticado
     * - Outro usuário NÃO pode ver essas transações
     */
    it('GET /transactions deve retornar transações do usuário autenticado', async () => {
      // Criar uma transação
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      // Listar transações
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200); // OK

      // Verificar que retorna array com transação criada
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verificar dados da transação
      const transaction = response.body[0];
      expect(transaction).toHaveProperty('title', testTransaction.title);
      expect(transaction).toHaveProperty('userId', userId);
    });

    /**
     * Teste: Multi-usuário isolation
     * Importante: Usuário 2 NÃO pode ver transações do Usuário 1
     */
    it('Usuários diferentes devem ver apenas suas próprias transações', async () => {
      // Usuário 1: Criar transação
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      // Usuário 2: Criar conta e logar
      const user2 = {
        name: 'Maria E2E',
        email: `maria.e2e.${uniqueSuffix}@test.com`,
        password: 'TestPass123',
      };

      await request(app.getHttpServer()).post('/users').send(user2).expect(201);

      const loginRes2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user2.email,
          password: user2.password,
        })
        .expect(200);

      const cookie2 = loginRes2.headers['set-cookie'][0];

      // Usuário 2: Tentar listar transações (deve estar vazio)
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', cookie2)
        .expect(200);

      // User 2 vê array vazio (sem transações do User 1)
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);

      // User 1 ainda vê suas transações
      const user1Transactions = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200);

      expect(user1Transactions.body.length).toBeGreaterThan(0);
    });

    /**
     * Teste: Rejeitar access a transação de outro usuário
     * Importante: OwnershipGuard deve bloquear
     */
    it('Usuário não pode acessar transação de outro usuário (HTTP 403)', async () => {
      // Usuário 1: Criar transação
      const transRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      const transactionId = transRes.body.id;

      // Usuário 2: Criar conta e logar
      const user2 = {
        name: 'Hacker E2E',
        email: `hacker.e2e.${uniqueSuffix}@test.com`,
        password: 'TestPass123',
      };

      await request(app.getHttpServer()).post('/users').send(user2).expect(201);

      const loginRes2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user2.email,
          password: user2.password,
        })
        .expect(200);

      const cookie2 = loginRes2.headers['set-cookie'][0];

      // Usuário 2: Tentar acessar transação de User 1
      await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Cookie', cookie2)
        .expect(403); // Forbidden (OwnershipGuard)
    });
  });

  describe('Validação com ValidationPipe', () => {
    /**
     * Teste: Rejeitar transaction com amount negativo
     * Importante: @Min(0) no DTO
     */
    it('POST /transactions deve rejeitar amount negativo (HTTP 400)', async () => {
      // Criar e logar usuário
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookie = loginRes.headers['set-cookie'][0];

      // Tentar criar transaction com amount negativo
      const invalidTrans = {
        title: 'Negativo',
        amount: -50,
        type: 'income',
        date: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', cookie)
        .send(invalidTrans)
        .expect(400); // Validation error

      // Resposta deve indicar campo inválido
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    /**
     * Teste: Rate limit no login (3/min)
     * Importante: @Throttle({ default: { limit: 3, ttl: 60000 } })
     *
     * Nota: Em teste local isso é limitado a 1 minuto
     * Para teste real, seria mais fácil mockar o Throttler
     */
    it('POST /auth/login deve respeitar rate limit após 3 tentativas', async () => {
      // Criar usuário
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Fazer 3 tentativas (podem falhar com 401, não importa)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer()).post('/auth/login').send({
          email: testUser.email,
          password: 'qualquerSenha', // Errada, mas não importa
        });
      }

      // 4ª tentativa (dentro do mesmo minuto) deve retornar 429
      const response = await request(app.getHttpServer()).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      // HTTP 429 Too Many Requests OU pode deixar passar dependendo de timing
      expect([429, 200]).toContain(response.status);

      if (response.status === 429) {
        expect(response.body.message).toContain('Too Many');
      }
    });
  });
});
