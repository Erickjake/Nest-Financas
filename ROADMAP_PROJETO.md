# ROADMAP DO PROJETO - FINANCAS API

Atualizado em: 20/04/2026  
Projeto: Nest-Financas (NestJS + Prisma + PostgreSQL)

## 1. Visao geral do projeto

API backend para gestao de financas pessoais com:

- autenticacao via JWT
- controle de acesso por usuario
- CRUD de transacoes, categorias e orcamentos
- relatorios financeiros
- exportacao de dados (CSV/PDF)
- backup e restauracao
- observabilidade completa (logs, metricas, tracing, alertas)

## 2. Stack tecnica

- Runtime: Node.js
- Framework: NestJS 11
- Linguagem: TypeScript 5
- ORM: Prisma 7
- Banco: PostgreSQL
- Auth: Passport + JWT
- Validacao: class-validator + class-transformer + ValidationPipe global
- Logger: nestjs-pino + pino
- Metricas: prom-client (endpoint /metrics)
- Tracing: OpenTelemetry (OTLP -> Jaeger)
- Observabilidade local: Prometheus + Grafana + Alertmanager + Jaeger
- Testes: Vitest (unitario, e2e, cobertura, browser)
- Qualidade: Biome (lint/format/check)
- Container: Docker + docker-compose

## 3. Arquitetura atual (pastas principais)

- src/
- src/auth/ (login/logout, estrategia JWT, guards)
- src/common/ (DTOs compartilhados, filters, guards)
- src/module/users/
- src/module/transactions/
- src/module/categories/
- src/module/budgets/
- src/module/reports/
- src/module/export/
- src/module/backup/
- src/observability/ (metricas e middleware)
- src/prisma/ (PrismaModule e PrismaService)
- prisma/ (schema + migrations)
- test/ (suite e2e)
- observability/ (configs Prometheus, Grafana, Alertmanager)
- generated/prisma/ (cliente Prisma gerado)

## 4. Funcionalidades ja implementadas

### 4.1 Seguranca

- Helmet habilitado
- CORS configurado com credenciais
- ValidationPipe global com:
- whitelist: true
- forbidNonWhitelisted: true
- transform: true
- Filtro global de excecoes
- Rate limiting global (Throttler): 100 req/min
- Rate limit mais restrito no login
- Isolamento por usuario (ownership)
- Cookies HttpOnly no fluxo de autenticacao

### 4.2 Modulos de negocio

- Users: CRUD de usuarios
- Auth: login/logout com JWT
- Transactions: CRUD + paginacao + soft delete + categoria
- Categories: CRUD + soft delete
- Budgets: CRUD + status de consumo por mes/ano
- Reports:
- resumo financeiro
- despesas por categoria
- relatorio mensal
- Export:
- CSV
- PDF
- Backup:
- exportacao de dados
- restauracao

### 4.3 Observabilidade

- Logs estruturados com pino
- Trace distribuido com OpenTelemetry
- Endpoint de metricas: GET /metrics
- Stack local com docker-compose:
- Jaeger
- Prometheus
- Alertmanager
- Grafana
- Regras de alerta versionadas (API down, erro alto, latencia p95)

### 4.4 Documentacao de API

- Swagger/OpenAPI em /api/docs
- Tags para modulos principais
- DTOs documentados

### 4.5 Testes e qualidade

- Unitarios com Vitest
- E2E com Vitest config dedicada
- Seguranca E2E com cenarios OWASP
- Cobertura reportada no projeto:
- Statements: 93.11%
- Branches: 83.07%
- Functions: 87.30%
- Lines: 92.85%

## 5. Modelo de dados (Prisma)

Entidades principais:

- User
- Transaction
- Category
- Budget

Pontos importantes do schema:

- soft delete com deletedAt
- timestamps (createdAt/updatedAt)
- relacoes User -> Transactions/Budgets
- Transaction ligada opcionalmente a Category
- Budget com unicidade composta por usuario/categoria/mes/ano

## 6. Endpoints principais (mapa rapido)

- GET /
- GET /metrics
- POST /auth/login
- POST /auth/logout
- /users (POST, GET, GET/:id, PATCH/:id, DELETE/:id)
- /transactions (GET, POST, GET/:id, PUT/:id, DELETE/:id)
- /categories (POST, GET, GET/:id, PATCH/:id, DELETE/:id)
- /budgets (POST, GET, GET/status, GET/:id, PATCH/:id, DELETE/:id)
- /reports/summary
- /reports/by-category
- /reports/monthly
- /export/csv
- /export/pdf
- /backup
- /backup/restore

## 7. Comandos importantes (dia a dia)

- npm install
- npm run start:dev
- npm run build
- npm run start:prod
- npm run test
- npm run test:e2e
- npm run test:cov
- npm run lint
- npm run format
- docker compose up -d --build

## 8. Pendencias ja identificadas

Segundo o status atual do projeto:

- testes de integracao com banco em ambiente dedicado
- testes de performance/carga

## 9. Roadmap recomendado (proximos passos)

## Fase A - Fechamento de qualidade (curto prazo)

Objetivo: consolidar confiabilidade antes de novas features.

1. Criar suite de integracao com PostgreSQL real (container de teste).
2. Cobrir fluxos criticos com integracao:

- Auth (login/logout + refresh se existir)
- Transactions (CRUD completo + ownership)
- Reports (filtros e agregacoes)

1. Adicionar testes de carga basicos:

- latencia p95
- throughput
- taxa de erro

1. Definir gates no CI:

- cobertura minima
- e2e obrigatorio no merge para main

## Fase B - Operacao e resiliencia (curto/medio prazo)

Objetivo: aumentar maturidade de producao.

1. Health checks mais completos (/health com DB e dependencias).
2. Alertas orientados a SLO:

- disponibilidade
- erro 5xx
- latencia

1. Dashboards por dominio (Auth, Transactions, Reports).
2. Runbooks operacionais:

- incidente de latencia alta
- incidente de erro 5xx
- falha de banco

## Fase C - Evolucao funcional (medio prazo)

Objetivo: gerar mais valor para usuario final.

1. Metas financeiras (goals) e acompanhamento mensal.
2. Tags em transacoes alem de categorias.
3. Parcelamentos/recorrencias.
4. Importacao de extrato (CSV/OFX) com conciliacao.
5. Relatorios comparativos (mes atual vs anterior).

## Fase D - Seguranca avancada (medio prazo)

Objetivo: reduzir risco em ambiente real.

1. Rotacao de segredo JWT e politica de expiracao revisada.
2. Auditoria de eventos criticos (login, alteracao de senha, delete).
3. Politica de senha forte + bloqueio progressivo por falhas.
4. Revisao de headers/cookies para ambiente HTTPS estrito.

## Fase E - Plataforma e developer experience (medio/longo prazo)

Objetivo: acelerar manutencao e entregas.

1. Pipeline CI/CD completo (build, test, lint, scan).
2. Ambientes separados (dev/stage/prod) com variaveis padronizadas.
3. Seeds e dados fake para onboarding rapido.
4. Convencoes de versao de API e changelog.

## 10. Backlog priorizado (sugestao pratica)

Prioridade alta:

- Integracao com banco para fluxos criticos
- Teste de carga baseline
- CI com gates
- Health checks de dependencia

Prioridade media:

- Runbooks + dashboards por modulo
- Auditoria de eventos de seguranca
- Metas financeiras
- Parcelamentos/recorrencias

Prioridade baixa:

- Importador de extrato
- Versionamento formal de API (se escopo ainda pequeno)

## 11. Definicao de pronto para os proximos ciclos

Uma entrega so entra como concluida quando:

- possui teste unitario e/ou integracao adequado
- possui observabilidade (log + metrica relevante)
- possui documentacao Swagger atualizada
- nao reduz cobertura global abaixo do alvo
- passou em lint, build e e2e

## 12. Proxima sprint sugerida (7 a 14 dias)

1. Integracao DB para Auth + Transactions.
2. Setup de teste de carga baseline em endpoint critico.
3. Endpoint /health com validacao de banco.
4. Gate de CI para test:e2e e test:cov.

Se quiser, no proximo passo eu transformo este roadmap em um plano de execucao com issues (titulo, descricao, criterios de aceite e estimativa).
