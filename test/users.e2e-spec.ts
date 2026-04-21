/**
 * 🧪 E2E Tests - Users CRUD
 *
 * Testa o CRUD completo de usuários:
 * 1. Criar usuário (POST /users)
 * 2. Listar todos (GET /users)
 * 3. Buscar por ID (GET /users/:id)
 * 4. Atualizar (PATCH /users/:id)
 * 5. Deletar (DELETE /users/:id)
 * 6. Validação de DTOs
 * 7. Casos de erro (duplicado, não encontrado)
 */

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/prisma/prisma.service';

describe('E2E - Users CRUD', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
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
  // POST /users - Criar usuário
  // =======================================================
  describe('POST /users - Criar usuário', () => {
    it('deve criar usuário com dados válidos', async () => {
      const dto = {
        name: 'Maria Teste',
        email: `maria.${uniqueSuffix}@test.com`,
        password: 'SenhaForte123',
      };

      const res = await request(app.getHttpServer()).post('/users').send(dto).expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(dto.email);
      expect(res.body.name).toBe(dto.name);
      expect(res.body).not.toHaveProperty('password');
    });

    it('deve rejeitar email duplicado', async () => {
      const dto = {
        name: 'User Dup',
        email: `dup.${uniqueSuffix}@test.com`,
        password: 'SenhaForte123',
      };

      await request(app.getHttpServer()).post('/users').send(dto).expect(201);
      await request(app.getHttpServer()).post('/users').send(dto).expect(409);
    });

    it('deve rejeitar email inválido', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Test', email: 'invalido', password: 'SenhaForte123' })
        .expect(400);

      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('Email')]));
    });

    it('deve rejeitar senha fraca (sem maiúscula)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Test User',
          email: `weak.${uniqueSuffix}@test.com`,
          password: 'senhafraca123',
        })
        .expect(400);

      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('Senha')]));
    });

    it('deve rejeitar senha curta (menos de 8 caracteres)', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Test User',
          email: `short.${uniqueSuffix}@test.com`,
          password: 'Ab1',
        })
        .expect(400);
    });

    it('deve rejeitar nome curto (menos de 3 caracteres)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Jo',
          email: `short.name.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        })
        .expect(400);

      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('3')]));
    });

    it('deve rejeitar body vazio', async () => {
      await request(app.getHttpServer()).post('/users').send({}).expect(400);
    });

    it('deve rejeitar campos extras (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Hacker',
          email: `hack.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
          isAdmin: true,
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('isAdmin')]),
      );
    });
  });

  // =======================================================
  // GET /users - Listar todos
  // =======================================================
  describe('GET /users - Listar usuários', () => {
    it('deve retornar lista vazia quando não há usuários', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);

      expect(res.body).toEqual([]);
    });

    it('deve retornar todos os usuários criados', async () => {
      // Criar 3 usuários
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/users')
          .send({
            name: `User ${i}`,
            email: `user${i}.${uniqueSuffix}@test.com`,
            password: 'SenhaForte123',
          });
      }

      const res = await request(app.getHttpServer()).get('/users').expect(200);

      expect(res.body).toHaveLength(3);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('email');
      expect(res.body[0]).toHaveProperty('name');
    });
  });

  // =======================================================
  // GET /users/:id - Buscar por ID
  // =======================================================
  describe('GET /users/:id - Buscar por ID', () => {
    it('deve retornar usuário pelo ID', async () => {
      const created = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Find Me',
          email: `findme.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const res = await request(app.getHttpServer()).get(`/users/${created.body.id}`).expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.email).toBe(`findme.${uniqueSuffix}@test.com`);
    });

    it('deve retornar null/vazio para ID inexistente', async () => {
      const res = await request(app.getHttpServer()).get('/users/999999').expect(200);

      // Service retorna null para findUnique inexistente
      expect(res.text).toBe('');
    });
  });

  // =======================================================
  // PATCH /users/:id - Atualizar
  // =======================================================
  describe('PATCH /users/:id - Atualizar usuário', () => {
    it('deve atualizar o nome do usuário', async () => {
      const created = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Nome Original',
          email: `update.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const res = await request(app.getHttpServer())
        .patch(`/users/${created.body.id}`)
        .send({ name: 'Nome Atualizado' })
        .expect(200);

      expect(res.body.name).toBe('Nome Atualizado');
      expect(res.body.email).toBe(`update.${uniqueSuffix}@test.com`);
    });

    it('deve atualizar o email do usuário', async () => {
      const created = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Email Update',
          email: `old.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      const res = await request(app.getHttpServer())
        .patch(`/users/${created.body.id}`)
        .send({ email: `new.${uniqueSuffix}@test.com` })
        .expect(200);

      expect(res.body.email).toBe(`new.${uniqueSuffix}@test.com`);
    });

    it('deve rejeitar campos extras no update', async () => {
      const created = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'No Hack',
          email: `nohack.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      await request(app.getHttpServer())
        .patch(`/users/${created.body.id}`)
        .send({ name: 'Updated', role: 'admin' })
        .expect(400);
    });

    it('deve rejeitar email inválido no update', async () => {
      const created = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Bad Email',
          email: `bademail.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      await request(app.getHttpServer())
        .patch(`/users/${created.body.id}`)
        .send({ email: 'nao-e-email' })
        .expect(400);
    });
  });

  // =======================================================
  // DELETE /users/:id - Deletar
  // =======================================================
  describe('DELETE /users/:id - Deletar usuário', () => {
    it('deve deletar usuário existente', async () => {
      const created = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Delete Me',
          email: `delete.${uniqueSuffix}@test.com`,
          password: 'SenhaForte123',
        });

      await request(app.getHttpServer()).delete(`/users/${created.body.id}`).expect(200);

      // Verificar que foi removido
      const check = await request(app.getHttpServer()).get(`/users/${created.body.id}`).expect(200);

      expect(check.text).toBe('');
    });

    it('deve falhar ao deletar ID inexistente', async () => {
      await request(app.getHttpServer()).delete('/users/999999').expect(500);
    });
  });
});
