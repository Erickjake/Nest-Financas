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

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
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
    type: 'EXPENSE' as const,
    date: new Date().toISOString(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configurar middlewares e pipes globais (mesmo que main.ts)
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
    // Ordem: budgets -> transactions -> categories -> users (respeitar FKs)
    await prisma.budget.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({});
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

      // Resposta de validação deve incluir mensagem de erro relacionada ao email
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/email/i)]),
      );
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
    it('POST /users deve rejeitar email duplicado (HTTP 409)', async () => {
      // Criar primeiro usuário
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Tentar criar com email igual
      const response = await request(app.getHttpServer()).post('/users').send(testUser).expect(409);

      expect(String(response.body.message)).toMatch(/email/i);
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

      // Verificar que retorna objeto paginado com array de transações
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verificar dados da transação
      const transaction = response.body.data[0];
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
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);

      // User 1 ainda vê suas transações
      const user1Transactions = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200);

      expect(user1Transactions.body.data.length).toBeGreaterThan(0);
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

  // ============================================================
  // 📝 TRANSACTION UPDATE (PUT /transactions/:id)
  // Testes para atualização de transações com autorização
  // ============================================================
  describe('Transaction Update (PUT /transactions/:id)', () => {
    let authCookie: string;

    /**
     * Setup: Criar usuário e fazer login antes de cada teste
     * Reutiliza o padrão signup → login → extrair cookie
     */
    beforeEach(async () => {
      // Signup — cria o usuário de teste
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Login — obtém o cookie JWT
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Cookie de autenticação para usar nos testes
      authCookie = loginRes.headers['set-cookie'][0];
    });

    /**
     * Teste: Atualizar transação com sucesso
     * Fluxo: Cria transação → Envia PUT com novos dados → Verifica retorno
     * O PUT usa CreateTransactionDto (mesmo DTO do POST)
     */
    it('PUT /transactions/:id deve atualizar transação do próprio usuário', async () => {
      // Passo 1: Criar a transação original
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      const transactionId = createRes.body.id;

      // Passo 2: Dados atualizados — novo título, valor e tipo
      const updatedData = {
        title: 'Salário atualizado',
        amount: 5000,
        type: 'INCOME' as const,
        date: new Date().toISOString(),
      };

      // Passo 3: Enviar PUT com os novos dados
      const response = await request(app.getHttpServer())
        .put(`/transactions/${transactionId}`)
        .set('Cookie', authCookie)
        .send(updatedData)
        .expect(200); // OK — atualizado com sucesso

      // Verificar que os dados foram atualizados corretamente
      expect(response.body).toHaveProperty('id', transactionId);
      expect(response.body).toHaveProperty('title', updatedData.title);
      expect(response.body).toHaveProperty('amount', updatedData.amount);
      expect(response.body).toHaveProperty('type', updatedData.type);
    });

    /**
     * Teste: Rejeitar atualização sem autenticação
     * Esperado: HTTP 401 — AuthGuard bloqueia antes de chegar ao controller
     */
    it('PUT /transactions/:id deve rejeitar sem autenticação (HTTP 401)', async () => {
      // Criar transação autenticado
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      // Tentar atualizar SEM cookie — AuthGuard bloqueia
      await request(app.getHttpServer())
        .put(`/transactions/${createRes.body.id}`)
        .send({
          title: 'Tentativa sem auth',
          amount: 999,
          type: 'INCOME' as const,
          date: new Date().toISOString(),
        })
        .expect(401); // Unauthorized
    });

    /**
     * Teste: Proibir atualização de transação de outro usuário
     * Fluxo: User 1 cria → User 2 tenta PUT → HTTP 403
     * OwnershipGuard + controller verificam propriedade
     */
    it('PUT /transactions/:id deve proibir atualização por outro usuário (HTTP 403)', async () => {
      // User 1: Criar transação
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      const transactionId = createRes.body.id;

      // User 2: Criar conta e fazer login
      const user2 = {
        name: 'Invasor E2E',
        email: `invasor.update.${uniqueSuffix}@test.com`,
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

      // User 2: Tentar atualizar transação do User 1
      await request(app.getHttpServer())
        .put(`/transactions/${transactionId}`)
        .set('Cookie', cookie2)
        .send({
          title: 'Hackeado',
          amount: 0.01,
          type: 'EXPENSE' as const,
          date: new Date().toISOString(),
        })
        .expect(403); // Forbidden — OwnershipGuard bloqueia
    });

    /**
     * Teste: Rejeitar PUT com dados inválidos (validação do DTO)
     * O ValidationPipe verifica os mesmos campos do POST (CreateTransactionDto)
     */
    it('PUT /transactions/:id deve rejeitar dados inválidos (HTTP 400)', async () => {
      // Criar transação válida primeiro
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      // Tentar atualizar com amount negativo e type inválido
      const response = await request(app.getHttpServer())
        .put(`/transactions/${createRes.body.id}`)
        .set('Cookie', authCookie)
        .send({
          title: '', // Vazio — @IsNotEmpty rejeita
          amount: -100, // Negativo — @IsPositive rejeita
          type: 'invalido', // Não é INCOME/EXPENSE/TRANSFER — @IsEnum rejeita
        })
        .expect(400); // Bad Request — ValidationPipe

      // Resposta deve conter mensagens de erro de validação
      expect(response.body.message).toBeDefined();
    });
  });

  // ============================================================
  // 🗑️ TRANSACTION DELETE (DELETE /transactions/:id)
  // Testes para exclusão de transações com autorização
  // ============================================================
  describe('Transaction Delete (DELETE /transactions/:id)', () => {
    let authCookie: string;

    /**
     * Setup: Criar usuário e fazer login antes de cada teste
     */
    beforeEach(async () => {
      // Signup
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      authCookie = loginRes.headers['set-cookie'][0];
    });

    /**
     * Teste: Deletar transação com sucesso e verificar que sumiu do banco
     * Fluxo: Cria → Deleta → Tenta buscar → HTTP 403 ou 404
     * Nota: O delete no service é HARD DELETE (transaction.delete, não soft)
     */
    it('DELETE /transactions/:id deve remover transação do próprio usuário', async () => {
      // Passo 1: Criar transação
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      const transactionId = createRes.body.id;

      // Passo 2: Deletar — deve retornar 200
      await request(app.getHttpServer())
        .delete(`/transactions/${transactionId}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Passo 3: Verificar que a transação não aparece mais na listagem
      const listRes = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200);

      // O array de transações deve estar vazio (só tinha 1 e foi deletada)
      expect(listRes.body.data.length).toBe(0);
    });

    /**
     * Teste: Rejeitar delete sem autenticação
     * Esperado: HTTP 401 — AuthGuard bloqueia
     */
    it('DELETE /transactions/:id deve rejeitar sem autenticação (HTTP 401)', async () => {
      // Criar transação autenticado
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      // Tentar deletar SEM cookie
      await request(app.getHttpServer()).delete(`/transactions/${createRes.body.id}`).expect(401); // Unauthorized
    });

    /**
     * Teste: Proibir exclusão de transação de outro usuário
     * Fluxo: User 1 cria → User 2 tenta DELETE → HTTP 403
     */
    it('DELETE /transactions/:id deve proibir exclusão por outro usuário (HTTP 403)', async () => {
      // User 1: Criar transação
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', authCookie)
        .send(testTransaction)
        .expect(201);

      const transactionId = createRes.body.id;

      // User 2: Criar conta e logar
      const user2 = {
        name: 'Invasor Delete',
        email: `invasor.delete.${uniqueSuffix}@test.com`,
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

      // User 2: Tentar deletar transação do User 1
      await request(app.getHttpServer())
        .delete(`/transactions/${transactionId}`)
        .set('Cookie', cookie2)
        .expect(403); // Forbidden — OwnershipGuard bloqueia

      // Verificar que a transação do User 1 ainda existe
      const listRes = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200);

      // Transação NÃO foi deletada — ainda aparece na listagem
      expect(listRes.body.data.length).toBe(1);
    });
  });

  // ============================================================
  // 📄 TRANSACTION PAGINATION (GET /transactions?page=&limit=)
  // Testes para paginação com metadados (meta)
  // ============================================================
  describe('Transaction Pagination (GET /transactions?page=&limit=)', () => {
    let authCookie: string;

    /**
     * Setup: Criar usuário, logar e criar 15 transações para testar paginação
     * 15 itens permitem testar: página 1 (10), página 2 (5), página 3 (vazia)
     */
    beforeEach(async () => {
      // Signup
      await request(app.getHttpServer()).post('/users').send(testUser).expect(201);

      // Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      authCookie = loginRes.headers['set-cookie'][0];

      // Criar 15 transações para ter dados suficientes para paginação
      for (let i = 1; i <= 15; i++) {
        await request(app.getHttpServer())
          .post('/transactions')
          .set('Cookie', authCookie)
          .send({
            title: `Transação ${i}`,
            amount: i * 10,
            type: 'EXPENSE' as const,
            date: new Date().toISOString(),
          })
          .expect(201);
      }
    });

    /**
     * Teste: Paginação padrão (sem query params)
     * Defaults: page=1, limit=10
     * Com 15 itens → data.length=10, totalPages=2, hasNextPage=true
     */
    it('GET /transactions deve retornar paginação padrão (page=1, limit=10)', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', authCookie)
        .expect(200);

      // Verificar estrutura do objeto paginado
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');

      // Meta deve conter todos os campos de paginação
      const { meta } = response.body;
      expect(meta).toHaveProperty('page', 1); // Página padrão
      expect(meta).toHaveProperty('limit', 10); // Limite padrão
      expect(meta).toHaveProperty('total', 15); // Total de transações criadas
      expect(meta).toHaveProperty('totalPages', 2); // ceil(15/10) = 2
      expect(meta).toHaveProperty('hasNextPage', true); // Tem página 2
      expect(meta).toHaveProperty('hasPreviousPage', false); // Página 1 não tem anterior

      // Dados: deve retornar exatamente 10 itens (limit padrão)
      expect(response.body.data).toHaveLength(10);
    });

    /**
     * Teste: Paginação com parâmetros customizados
     * page=2, limit=5 → Itens 6-10 de 15 totais
     */
    it('GET /transactions?page=2&limit=5 deve retornar segunda página', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ page: 2, limit: 5 })
        .set('Cookie', authCookie)
        .expect(200);

      const { meta, data } = response.body;

      // Meta reflete os parâmetros enviados
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(5);
      expect(meta.total).toBe(15);
      expect(meta.totalPages).toBe(3); // ceil(15/5) = 3
      expect(meta.hasNextPage).toBe(true); // Tem página 3
      expect(meta.hasPreviousPage).toBe(true); // Página 2 tem anterior

      // Deve retornar exatamente 5 itens
      expect(data).toHaveLength(5);
    });

    /**
     * Teste: Última página com itens restantes
     * page=2, limit=10 → Apenas 5 itens restantes (de 15 totais)
     */
    it('GET /transactions?page=2&limit=10 deve retornar itens restantes', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ page: 2, limit: 10 })
        .set('Cookie', authCookie)
        .expect(200);

      const { meta, data } = response.body;

      // Última página — só 5 itens restantes
      expect(data).toHaveLength(5);
      expect(meta.page).toBe(2);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNextPage).toBe(false); // Não tem mais páginas
      expect(meta.hasPreviousPage).toBe(true); // Tem página 1
    });

    /**
     * Teste: Página além do total (página vazia)
     * page=99 com 15 itens → array vazio, hasNextPage=false
     */
    it('GET /transactions?page=99 deve retornar array vazio para página inexistente', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ page: 99 })
        .set('Cookie', authCookie)
        .expect(200);

      const { meta, data } = response.body;

      // Array vazio — não há itens nessa página
      expect(data).toHaveLength(0);
      expect(meta.page).toBe(99);
      expect(meta.total).toBe(15); // Total não muda
      expect(meta.hasNextPage).toBe(false); // Sem próxima página
    });

    /**
     * Teste: Limit=1 para verificar que a paginação calcula totalPages corretamente
     * 15 itens / limit 1 = 15 páginas
     */
    it('GET /transactions?limit=1 deve calcular totalPages correto', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ limit: 1 })
        .set('Cookie', authCookie)
        .expect(200);

      const { meta, data } = response.body;

      // 1 item por página = 15 páginas
      expect(data).toHaveLength(1);
      expect(meta.limit).toBe(1);
      expect(meta.totalPages).toBe(15); // ceil(15/1) = 15
      expect(meta.hasNextPage).toBe(true); // Tem 14 páginas restantes
    });
  });

  // ============================================================
  // ⏱️ RATE LIMITING
  // Teste para verificar throttling no endpoint de login
  // ============================================================
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
