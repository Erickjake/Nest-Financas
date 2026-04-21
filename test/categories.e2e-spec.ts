/**
 * 🧪 E2E Tests - Categories (Categorias)
 *
 * Testa o CRUD completo das categorias.
 * Categorias são endpoints PÚBLICOS (sem autenticação).
 *
 * Fluxo testado:
 * 1. Criar categoria (POST /categories)
 * 2. Listar categorias (GET /categories) — filtra soft-deleted
 * 3. Buscar por ID (GET /categories/:id) — 404 se não existe ou soft-deleted
 * 4. Atualizar (PATCH /categories/:id)
 * 5. Deletar (DELETE /categories/:id) — soft delete (seta deletedAt)
 * 6. Validação de DTO (campos obrigatórios e formato)
 */

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/prisma/prisma.service';

describe('E2E - Categories CRUD', () => {
  // -------------------------------------------------------
  // 📦 Variáveis compartilhadas entre os testes
  // -------------------------------------------------------

  /** Instância da aplicação NestJS (equivale ao servidor HTTP) */
  let app: INestApplication<App>;

  /** Acesso direto ao Prisma para limpeza do banco entre testes */
  let prisma: PrismaService;

  // -------------------------------------------------------
  // 🏗️ Setup: Executado ANTES de cada teste
  // -------------------------------------------------------
  beforeEach(async () => {
    /**
     * Cria um módulo de teste importando o AppModule inteiro.
     * Isso garante que TODOS os providers (Prisma, Guards, Pipes, etc.)
     * estejam configurados exatamente como em produção.
     */
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    /** Cria a aplicação NestJS a partir do módulo de teste */
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

    /** Injeta o PrismaService para poder limpar o banco diretamente */
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    /**
     * 🧹 Limpeza do banco antes de cada teste.
     * ORDEM IMPORTA por causa das foreign keys:
     *   1. Transactions (depende de User e Category)
     *   2. Category (independente, mas pode ter FK de Transaction)
     *   3. User (independente)
     *
     * Se inverter a ordem, Prisma lança erro de FK constraint.
     */
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
  });

  // -------------------------------------------------------
  // 🧹 Teardown: Executado APÓS cada teste
  // -------------------------------------------------------
  afterEach(async () => {
    /** Fecha a aplicação para liberar conexões (DB, HTTP, etc.) */
    await app.close();
  });

  // =======================================================
  // 📝 Bloco: Criação de Categorias
  // =======================================================
  describe('POST /categories - Criar categoria', () => {
    /**
     * ✅ Caso feliz: criar categoria com todos os campos
     * Envia name (obrigatório) + description, color, icon (opcionais)
     * Espera HTTP 201 e o objeto criado de volta
     */
    it('deve criar uma categoria com todos os campos', async () => {
      const dto = {
        name: 'Alimentação',
        description: 'Gastos com comida',
        color: '#FF5733',
        icon: '🍔',
      };

      const response = await request(app.getHttpServer())
        .post('/categories') // Endpoint público, sem cookie/token
        .send(dto)
        .expect(201); // 201 Created

      // Verificar que retornou um objeto com ID gerado pelo banco
      expect(response.body).toHaveProperty('id');

      // Verificar que os dados enviados estão corretos na resposta
      expect(response.body.name).toBe('Alimentação');
      expect(response.body.description).toBe('Gastos com comida');
      expect(response.body.color).toBe('#FF5733');
      expect(response.body.icon).toBe('🍔');

      // Verificar que timestamps foram criados automaticamente
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // deletedAt deve ser null (não foi deletada)
      expect(response.body.deletedAt).toBeNull();
    });

    /**
     * ✅ Caso mínimo: criar categoria apenas com nome
     * Os campos description, color e icon são opcionais (@IsOptional)
     */
    it('deve criar categoria apenas com nome (campos opcionais omitidos)', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Transporte' }) // Só o campo obrigatório
        .expect(201);

      expect(response.body.name).toBe('Transporte');

      // Campos opcionais devem ser null quando não enviados
      expect(response.body.description).toBeNull();
      expect(response.body.color).toBeNull();
      expect(response.body.icon).toBeNull();
    });

    /**
     * ❌ Validação: nome é obrigatório
     * Enviar body vazio deve resultar em HTTP 400 (Bad Request)
     * porque @IsNotEmpty() no DTO rejeita valores vazios/ausentes
     */
    it('deve rejeitar criação sem nome (HTTP 400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({}) // Body vazio — sem "name"
        .expect(400); // Bad Request (validação falhou)

      /**
       * O ValidationPipe retorna array de mensagens de erro.
       * Verificamos que "message" contém algo relativo ao nome.
       */
      expect(response.body.message).toBeDefined();
    });

    /**
     * ❌ Validação: nome muito longo (máx 50 caracteres)
     * @MaxLength(50) no DTO garante que nomes absurdos sejam rejeitados
     */
    it('deve rejeitar nome com mais de 50 caracteres (HTTP 400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'A'.repeat(51) }) // 51 caracteres — passa do limite
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    /**
     * ❌ Validação: cor inválida
     * @IsHexColor() exige formato "#RRGGBB" ou "#RGB"
     * Enviar "vermelho" (texto livre) deve ser rejeitado
     */
    it('deve rejeitar cor não hexadecimal (HTTP 400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({
          name: 'Saúde',
          color: 'vermelho', // Inválido: não é hex (#FF0000)
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    /**
     * ❌ Validação: campos extras são proibidos
     * O ValidationPipe com forbidNonWhitelisted: true rejeita
     * campos que não existem no DTO (proteção contra injection)
     */
    it('deve rejeitar campos extras não previstos no DTO (HTTP 400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({
          name: 'Lazer',
          campoInvalido: 'tentativa de injection', // Não existe no DTO
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  // =======================================================
  // 📋 Bloco: Listar Categorias
  // =======================================================
  describe('GET /categories - Listar categorias', () => {
    /**
     * ✅ Listar categorias criadas
     * Cria 2 categorias e verifica que ambas aparecem na listagem.
     * O service ordena por createdAt ASC (mais antigas primeiro).
     */
    it('deve retornar lista de categorias ativas (não deletadas)', async () => {
      // Seed: criar 2 categorias diretamente via Prisma (mais rápido que via API)
      await prisma.category.createMany({
        data: [
          { name: 'Alimentação', color: '#FF5733' },
          { name: 'Transporte', color: '#33FF57' },
        ],
      });

      const response = await request(app.getHttpServer()).get('/categories').expect(200); // OK

      // Deve retornar array com exatamente 2 categorias
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      /**
       * O service inclui _count.transactions (quantas transações têm).
       * Como não criamos transações, deve ser 0.
       */
      expect(response.body[0]._count.transactions).toBe(0);
    });

    /**
     * ✅ Não deve listar categorias soft-deleted
     * Categorias com deletedAt != null são "invisíveis" na listagem.
     * Isso é filtrado no service: where: { deletedAt: null }
     */
    it('deve excluir categorias soft-deleted da listagem', async () => {
      // Criar 2 categorias: uma ativa e uma "deletada"
      await prisma.category.createMany({
        data: [
          { name: 'Ativa' }, // deletedAt = null (padrão)
          { name: 'Deletada', deletedAt: new Date() }, // Já marcada como deletada
        ],
      });

      const response = await request(app.getHttpServer()).get('/categories').expect(200);

      // Apenas a categoria ativa deve aparecer
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Ativa');
    });

    /**
     * ✅ Lista vazia quando não há categorias
     * Deve retornar array vazio [], não 404 ou erro
     */
    it('deve retornar array vazio quando não há categorias', async () => {
      const response = await request(app.getHttpServer()).get('/categories').expect(200);

      expect(response.body).toEqual([]); // Array vazio, não null ou undefined
    });
  });

  // =======================================================
  // 🔍 Bloco: Buscar Categoria por ID
  // =======================================================
  describe('GET /categories/:id - Buscar por ID', () => {
    /**
     * ✅ Buscar categoria existente por ID
     * Deve retornar o objeto completo, incluindo transações vinculadas
     */
    it('deve retornar categoria por ID com suas transações', async () => {
      // Criar categoria via Prisma para ter controle do ID
      const category = await prisma.category.create({
        data: { name: 'Saúde', color: '#0000FF' },
      });

      const response = await request(app.getHttpServer())
        .get(`/categories/${category.id}`) // Usa o ID real gerado
        .expect(200);

      expect(response.body.name).toBe('Saúde');
      expect(response.body.color).toBe('#0000FF');

      /**
       * O findOne inclui transactions vinculadas.
       * Como não criamos nenhuma, será array vazio.
       */
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    /**
     * ❌ Buscar ID que não existe → HTTP 404
     * O service lança NotFoundException quando findUnique retorna null
     */
    it('deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/categories/99999') // ID que não existe no banco
        .expect(404);
    });

    /**
     * ❌ Buscar categoria soft-deleted → HTTP 404
     * Mesmo que o registro exista no banco, se deletedAt != null,
     * o service trata como "não encontrada"
     */
    it('deve retornar 404 para categoria soft-deleted', async () => {
      // Criar categoria já deletada
      const category = await prisma.category.create({
        data: { name: 'Deletada', deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get(`/categories/${category.id}`) // Existe, mas está deletada
        .expect(404);
    });

    /**
     * ❌ ID inválido (texto em vez de número) → HTTP 400
     * O ParseIntPipe no controller rejeita valores não-numéricos
     */
    it('deve retornar 400 para ID não numérico', async () => {
      await request(app.getHttpServer())
        .get('/categories/abc') // "abc" não é número
        .expect(400);
    });
  });

  // =======================================================
  // ✏️ Bloco: Atualizar Categoria
  // =======================================================
  describe('PATCH /categories/:id - Atualizar', () => {
    /**
     * ✅ Atualizar nome da categoria
     * PATCH permite atualização parcial — enviar só o campo que mudou
     */
    it('deve atualizar o nome de uma categoria existente', async () => {
      // Criar categoria original
      const category = await prisma.category.create({
        data: { name: 'Antigo Nome', color: '#000000' },
      });

      const response = await request(app.getHttpServer())
        .patch(`/categories/${category.id}`)
        .send({ name: 'Novo Nome' }) // Atualiza só o nome
        .expect(200);

      // Nome deve estar atualizado
      expect(response.body.name).toBe('Novo Nome');

      // Cor deve permanecer inalterada (PATCH é parcial)
      expect(response.body.color).toBe('#000000');
    });

    /**
     * ❌ Atualizar categoria que não existe → HTTP 404
     * O service chama findOne() antes de atualizar,
     * que lança NotFoundException se não encontrar
     */
    it('deve retornar 404 ao tentar atualizar categoria inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/categories/99999')
        .send({ name: 'Qualquer' })
        .expect(404);
    });

    /**
     * ❌ Atualizar categoria soft-deleted → HTTP 404
     * Mesmo lógica: findOne rejeita categorias com deletedAt != null
     */
    it('deve retornar 404 ao tentar atualizar categoria deletada', async () => {
      const category = await prisma.category.create({
        data: { name: 'Deletada', deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .patch(`/categories/${category.id}`)
        .send({ name: 'Tentativa' })
        .expect(404);
    });
  });

  // =======================================================
  // 🗑️ Bloco: Deletar Categoria (Soft Delete)
  // =======================================================
  describe('DELETE /categories/:id - Soft Delete', () => {
    /**
     * ✅ Soft delete: define deletedAt em vez de apagar do banco
     * O service faz update({ data: { deletedAt: new Date() } })
     * em vez de delete(). Isso preserva dados para auditoria.
     */
    it('deve fazer soft delete (setar deletedAt) na categoria', async () => {
      const category = await prisma.category.create({
        data: { name: 'Para Deletar' },
      });

      // Primeira request: soft delete
      const response = await request(app.getHttpServer())
        .delete(`/categories/${category.id}`)
        .expect(200);

      // O retorno deve ter deletedAt preenchido
      expect(response.body.deletedAt).not.toBeNull();

      /**
       * Verificação extra: consultar direto no banco.
       * O registro AINDA existe (soft delete), mas com deletedAt definido.
       */
      const dbCategory = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(dbCategory).not.toBeNull(); // Registro ainda existe
      expect(dbCategory?.deletedAt).not.toBeNull(); // Mas está "deletado"
    });

    /**
     * ✅ Após soft delete, categoria desaparece da listagem
     * GET /categories filtra deletedAt: null, então não retorna
     */
    it('categoria soft-deleted não deve aparecer no GET /categories', async () => {
      const category = await prisma.category.create({
        data: { name: 'Vai Sumir' },
      });

      // Deletar
      await request(app.getHttpServer()).delete(`/categories/${category.id}`).expect(200);

      // Listar: deve estar vazio
      const listResponse = await request(app.getHttpServer()).get('/categories').expect(200);

      expect(listResponse.body).toHaveLength(0);
    });

    /**
     * ❌ Tentar deletar duas vezes a mesma categoria → HTTP 404
     * Na segunda vez, findOne vê deletedAt != null e lança 404
     */
    it('deve retornar 404 ao tentar deletar categoria já deletada', async () => {
      const category = await prisma.category.create({
        data: { name: 'Deletar Duas Vezes' },
      });

      // Primeiro delete: sucesso
      await request(app.getHttpServer()).delete(`/categories/${category.id}`).expect(200);

      // Segundo delete: 404 (já está soft-deleted)
      await request(app.getHttpServer()).delete(`/categories/${category.id}`).expect(404);
    });

    /**
     * ❌ Deletar categoria inexistente → HTTP 404
     */
    it('deve retornar 404 ao tentar deletar categoria inexistente', async () => {
      await request(app.getHttpServer()).delete('/categories/99999').expect(404);
    });
  });
});
