/**
 * 🧪 E2E Tests - Reports (Relatórios Financeiros)
 *
 * Testa os 3 endpoints de relatórios:
 * 1. GET /reports/summary → Resumo (receitas, despesas, saldo)
 * 2. GET /reports/by-category → Despesas agrupadas por categoria
 * 3. GET /reports/monthly → Movimentação agrupada por mês
 *
 * TODOS os endpoints de reports exigem autenticação (JWT via cookie).
 * O setup cria um usuário e faz login para obter o cookie antes dos testes.
 *
 * As transações são criadas diretamente via Prisma (mais rápido que via API)
 * para ter controle total sobre userId, datas e tipos.
 */

import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { AllExceptionsFilter } from "./../src/common/filters/http-exception.filter";
import { PrismaService } from "./../src/prisma/prisma.service";

describe("E2E - Reports (Relatórios)", () => {
  // -------------------------------------------------------
  // 📦 Variáveis compartilhadas
  // -------------------------------------------------------

  /** Aplicação NestJS */
  let app: INestApplication<App>;

  /** Acesso direto ao banco via Prisma */
  let prisma: PrismaService;

  /** Cookie JWT de autenticação (extraído após login) */
  let authCookie: string;

  /** ID do usuário de teste (usado para seed de transações) */
  let userId: number;

  /** Sufixo único para evitar conflitos entre testes paralelos */
  let uniqueSuffix: string;

  // -------------------------------------------------------
  // 🏗️ Setup: Executado ANTES de cada teste
  // -------------------------------------------------------
  beforeEach(async () => {
    /**
     * Cria a aplicação completa do NestJS.
     * Importa AppModule inteiro = mesma configuração de produção
     */
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

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    /**
     * 🧹 Limpeza do banco.
     * Ordem: Transactions → Categories → Users (respeitando FKs)
     */
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    /**
     * Sufixo único baseado em timestamp.
     * Garante que e-mails de teste não colidam se testes rodarem em paralelo.
     */
    uniqueSuffix = Date.now().toString();

    /**
     * 🔐 Criar usuário de teste via API (signup).
     * Isso garante que a senha seja hasheada corretamente pelo AuthService.
     */
    const testUser = {
      name: "Report User",
      email: `report-${uniqueSuffix}@test.com`,
      password: "SenhaForte123!",
    };

    await request(app.getHttpServer())
      .post("/users")
      .send(testUser)
      .expect(201);

    /**
     * 🔑 Fazer login para obter cookie JWT.
     * O NestJS retorna Set-Cookie: access_token=<jwt>
     */
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    /**
     * Extrair o cookie da resposta do login.
     * O header Set-Cookie vem como array; pegamos o primeiro item.
     * Formato: "access_token=eyJhbG...; Path=/; HttpOnly"
     */
    const cookies = loginRes.headers["set-cookie"];
    authCookie = Array.isArray(cookies) ? cookies[0] : cookies;

    /**
     * Buscar o ID real do usuário no banco.
     * Precisamos do ID para criar transações diretamente via Prisma
     * (o campo userId é obrigatório na tabela Transaction).
     */
    const dbUser = await prisma.user.findUnique({
      where: { email: testUser.email },
    });
    if (!dbUser) {
      throw new Error("Usuário de teste não encontrado após criação");
    }
    userId = dbUser.id;
  });

  // -------------------------------------------------------
  // 🧹 Teardown
  // -------------------------------------------------------
  afterEach(async () => {
    await app.close();
  });

  // =======================================================
  // 🔒 Bloco: Autenticação obrigatória
  // =======================================================
  describe("Autenticação obrigatória", () => {
    /**
     * ❌ Acessar /reports/summary sem cookie → HTTP 401
     * O AuthGuard('jwt') bloqueia requisições sem token válido
     */
    it("deve retornar 401 ao acessar /reports/summary sem autenticação", async () => {
      await request(app.getHttpServer()).get("/reports/summary").expect(401); // Unauthorized — sem cookie
    });

    /**
     * ❌ Acessar /reports/by-category sem cookie → HTTP 401
     */
    it("deve retornar 401 ao acessar /reports/by-category sem autenticação", async () => {
      await request(app.getHttpServer())
        .get("/reports/by-category")
        .expect(401);
    });

    /**
     * ❌ Acessar /reports/monthly sem cookie → HTTP 401
     */
    it("deve retornar 401 ao acessar /reports/monthly sem autenticação", async () => {
      await request(app.getHttpServer()).get("/reports/monthly").expect(401);
    });
  });

  // =======================================================
  // 📊 Bloco: Resumo Financeiro (GET /reports/summary)
  // =======================================================
  describe("GET /reports/summary - Resumo financeiro", () => {
    /**
     * ✅ Resumo com transações de receita e despesa
     * Cria 2 transações (1 INCOME, 1 EXPENSE) e verifica totais
     */
    it("deve retornar income, expense e balance corretos", async () => {
      /**
       * Seed: criar transações diretamente no banco.
       * Usar Prisma em vez da API é mais rápido e dá controle total
       * sobre userId, tipo e valores.
       */
      await prisma.transaction.createMany({
        data: [
          {
            title: "Salário",
            amount: 5000,
            type: "INCOME",
            userId,
            date: new Date(),
          },
          {
            title: "Aluguel",
            amount: 2000,
            type: "EXPENSE",
            userId,
            date: new Date(),
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get("/reports/summary")
        .set("Cookie", authCookie) // Enviar cookie JWT
        .expect(200);

      /**
       * Resultado esperado:
       *   income: 5000 (soma de INCOME)
       *   expense: 2000 (soma de EXPENSE)
       *   balance: 3000 (income - expense)
       */
      expect(response.body.income).toBe(5000);
      expect(response.body.expense).toBe(2000);
      expect(response.body.balance).toBe(3000);
    });

    /**
     * ✅ Resumo sem transações → valores null/zero
     * Quando não há dados, Prisma retorna _sum.amount = null
     * O service retorna balance = 0 (null - null → 0 via ??0)
     */
    it("deve retornar valores nulos quando não há transações", async () => {
      const response = await request(app.getHttpServer())
        .get("/reports/summary")
        .set("Cookie", authCookie)
        .expect(200);

      // Sem transações: income e expense são null, balance é 0
      expect(response.body.income).toBeNull();
      expect(response.body.expense).toBeNull();
      expect(response.body.balance).toBe(0);
    });

    /**
     * ✅ Resumo com filtro de data (startDate / endDate)
     * O ReportFilterDto aceita query params ?startDate=...&endDate=...
     * Transações fora do range são ignoradas.
     */
    it("deve filtrar por intervalo de datas", async () => {
      /**
       * Seed: 2 transações em meses diferentes
       * Janeiro/2025: R$ 1000 (INCOME) — DENTRO do filtro
       * Março/2025: R$ 500 (INCOME) — FORA do filtro
       */
      await prisma.transaction.createMany({
        data: [
          {
            title: "Janeiro",
            amount: 1000,
            type: "INCOME",
            userId,
            date: new Date("2025-01-15"),
          },
          {
            title: "Março",
            amount: 500,
            type: "INCOME",
            userId,
            date: new Date("2025-03-15"),
          },
        ],
      });

      /**
       * Filtrar apenas Janeiro/2025.
       * startDate e endDate são query params (não body).
       */
      const response = await request(app.getHttpServer())
        .get("/reports/summary")
        .query({
          startDate: "2025-01-01",
          endDate: "2025-01-31",
        })
        .set("Cookie", authCookie)
        .expect(200);

      // Apenas a transação de Janeiro (R$ 1000) deve ser contada
      expect(response.body.income).toBe(1000);
      expect(response.body.expense).toBeNull(); // Nenhuma despesa no período
    });

    /**
     * ✅ Isolamento: transações de outro usuário não aparecem
     * Cada usuário vê apenas suas próprias transações nos relatórios
     */
    it("não deve incluir transações de outros usuários", async () => {
      // Criar segundo usuário via API
      const otherUser = {
        name: "Outro User",
        email: `other-${uniqueSuffix}@test.com`,
        password: "SenhaForte123!",
      };
      await request(app.getHttpServer())
        .post("/users")
        .send(otherUser)
        .expect(201);

      // Buscar o ID do segundo usuário
      const dbOther = await prisma.user.findUnique({
        where: { email: otherUser.email },
      });
      if (!dbOther) {
        throw new Error("Outro usuário não encontrado após criação");
      }

      // Criar transação para o OUTRO usuário (via Prisma)
      await prisma.transaction.create({
        data: {
          title: "Transação alheia",
          amount: 9999,
          type: "INCOME",
          userId: dbOther.id, // Pertence ao outro
          date: new Date(),
        },
      });

      /**
       * Consultar relatório com cookie do PRIMEIRO usuário.
       * Não deve ver os R$ 9999 do outro.
       */
      const response = await request(app.getHttpServer())
        .get("/reports/summary")
        .set("Cookie", authCookie) // Cookie do User 1
        .expect(200);

      // Income deve ser null (User 1 não tem transações)
      expect(response.body.income).toBeNull();
    });
  });

  // =======================================================
  // 🏷️ Bloco: Relatório por Categoria (GET /reports/by-category)
  // =======================================================
  describe("GET /reports/by-category - Por categoria", () => {
    /**
     * ✅ Agrupar despesas por categoria
     * Cria 2 categorias com despesas diferentes e verifica agrupamento
     */
    it("deve agrupar despesas por categoria corretamente", async () => {
      // Criar 2 categorias
      const catFood = await prisma.category.create({
        data: { name: "Alimentação" },
      });
      const catTransport = await prisma.category.create({
        data: { name: "Transporte" },
      });

      /**
       * Seed: criar despesas vinculadas às categorias.
       * Note que INCOME é ignorado — by-category só conta EXPENSE.
       */
      await prisma.transaction.createMany({
        data: [
          {
            title: "Restaurante",
            amount: 100,
            type: "EXPENSE",
            userId,
            categoryId: catFood.id,
            date: new Date(),
          },
          {
            title: "Supermercado",
            amount: 200,
            type: "EXPENSE",
            userId,
            categoryId: catFood.id,
            date: new Date(),
          },
          {
            title: "Uber",
            amount: 50,
            type: "EXPENSE",
            userId,
            categoryId: catTransport.id,
            date: new Date(),
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get("/reports/by-category")
        .set("Cookie", authCookie)
        .expect(200);

      /**
       * Resultado esperado: array com 2 objetos (2 categorias)
       * Alimentação: total 300 (100+200), count 2
       * Transporte: total 50, count 1
       *
       * O service ordena por _sum.amount DESC (mais caro primeiro)
       */
      expect(response.body).toHaveLength(2);

      // A maior despesa (Alimentação: 300) vem primeiro
      expect(response.body[0].categoryName).toBe("Alimentação");
      expect(response.body[0].total).toBe(300);
      expect(response.body[0].count).toBe(2);

      // Transporte (50) vem depois
      expect(response.body[1].categoryName).toBe("Transporte");
      expect(response.body[1].total).toBe(50);
      expect(response.body[1].count).toBe(1);
    });

    /**
     * ✅ Sem despesas → array vazio
     * Se não houver nenhuma EXPENSE, o agrupamento retorna []
     */
    it("deve retornar array vazio quando não há despesas", async () => {
      // Criar apenas INCOME (receita) — by-category ignora receitas
      await prisma.transaction.create({
        data: {
          title: "Salário",
          amount: 5000,
          type: "INCOME",
          userId,
          date: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get("/reports/by-category")
        .set("Cookie", authCookie)
        .expect(200);

      // Nenhuma EXPENSE → array vazio
      expect(response.body).toEqual([]);
    });
  });

  // =======================================================
  // 📅 Bloco: Relatório Mensal (GET /reports/monthly)
  // =======================================================
  describe("GET /reports/monthly - Mensal", () => {
    /**
     * ✅ Agrupar receitas/despesas por mês
     * Cria transações em meses diferentes e verifica agrupamento
     */
    it("deve agrupar movimentações por mês (YYYY-MM)", async () => {
      /**
       * Seed: transações em Jan e Fev de 2025
       * Janeiro: 1 INCOME (3000), 1 EXPENSE (1000)
       * Fevereiro: 1 EXPENSE (500)
       */
      await prisma.transaction.createMany({
        data: [
          {
            title: "Salário Jan",
            amount: 3000,
            type: "INCOME",
            userId,
            date: new Date("2025-01-15"),
          },
          {
            title: "Aluguel Jan",
            amount: 1000,
            type: "EXPENSE",
            userId,
            date: new Date("2025-01-20"),
          },
          {
            title: "Conta Fev",
            amount: 500,
            type: "EXPENSE",
            userId,
            date: new Date("2025-02-10"),
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get("/reports/monthly")
        .set("Cookie", authCookie)
        .expect(200);

      /**
       * Resultado esperado: array com 2 meses
       * Ordenado por month ASC (o service faz sort por localeCompare)
       */
      expect(response.body).toHaveLength(2);

      // Janeiro: income=3000, expense=1000
      expect(response.body[0].month).toBe("2025-01");
      expect(response.body[0].income).toBe(3000);
      expect(response.body[0].expense).toBe(1000);

      // Fevereiro: income=0, expense=500
      expect(response.body[1].month).toBe("2025-02");
      expect(response.body[1].income).toBe(0);
      expect(response.body[1].expense).toBe(500);
    });

    /**
     * ✅ Sem transações → array vazio
     */
    it("deve retornar array vazio quando não há transações", async () => {
      const response = await request(app.getHttpServer())
        .get("/reports/monthly")
        .set("Cookie", authCookie)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    /**
     * ✅ Filtro mensal com date range
     * Deve retornar apenas meses dentro do intervalo
     */
    it("deve filtrar movimentação mensal por intervalo de datas", async () => {
      await prisma.transaction.createMany({
        data: [
          {
            title: "Janeiro",
            amount: 1000,
            type: "INCOME",
            userId,
            date: new Date("2025-01-15"),
          },
          {
            title: "Março",
            amount: 2000,
            type: "INCOME",
            userId,
            date: new Date("2025-03-15"),
          },
        ],
      });

      // Filtrar apenas Janeiro
      const response = await request(app.getHttpServer())
        .get("/reports/monthly")
        .query({
          startDate: "2025-01-01",
          endDate: "2025-01-31",
        })
        .set("Cookie", authCookie)
        .expect(200);

      // Deve retornar apenas 1 mês (janeiro)
      expect(response.body).toHaveLength(1);
      expect(response.body[0].month).toBe("2025-01");
      expect(response.body[0].income).toBe(1000);
    });

    /**
     * ✅ Compatibilidade com alias legado DATA
     * Quando DATA for enviado, deve filtrar como dia único.
     */
    it("deve aceitar query param DATA como alias legado de data", async () => {
      await prisma.transaction.createMany({
        data: [
          {
            title: "No dia",
            amount: 800,
            type: "INCOME",
            userId,
            date: new Date("2025-01-15T10:00:00.000Z"),
          },
          {
            title: "Outro dia",
            amount: 900,
            type: "INCOME",
            userId,
            date: new Date("2025-01-20T10:00:00.000Z"),
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get("/reports/monthly")
        .query({ DATA: "2025-01-15T10:00:00.000Z" })
        .set("Cookie", authCookie)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].month).toBe("2025-01");
      expect(response.body[0].income).toBe(800);
    });
  });
});
