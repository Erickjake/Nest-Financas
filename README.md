# Financas API

API REST para gestao financeira pessoal com autenticacao JWT por cookie HttpOnly, controle de categorias/orcamentos, relatorios, exportacao (CSV/PDF), backup e observabilidade completa (Prometheus, Grafana, Jaeger e Alertmanager).

## Visao geral

A aplicacao foi desenvolvida com NestJS + Prisma (PostgreSQL) e inclui:

- Autenticacao com access token e refresh token via cookie seguro
- CRUD de usuarios, transacoes, categorias e orcamentos
- Relatorios de resumo, por categoria e mensal
- Exportacao de transacoes em CSV e PDF
- Backup e restauracao de dados em JSON
- Rate limit, validacao global, helmet e filtro global de excecoes
- Observabilidade com logs estruturados, metricas e tracing distribuido

## Stack

- Runtime: Node.js
- Framework: NestJS
- Banco: PostgreSQL via Prisma + adapter pg
- Autenticacao: JWT + Passport
- Testes: Vitest + Supertest
- Lint/format: Biome
- Observabilidade: OpenTelemetry, Prometheus, Grafana, Jaeger, Alertmanager

## Estrutura principal

- src/auth: login, refresh, logout e estrategia JWT
- src/module/users: usuarios
- src/module/transactions: transacoes
- src/module/categories: categorias
- src/module/budgets: orcamentos
- src/module/reports: relatorios
- src/module/export: exportacao CSV/PDF
- src/module/backup: backup/restore
- src/observability: endpoint /metrics e instrumentacao
- prisma: schema e migrations
- observability: configs de Prometheus/Grafana/Alertmanager

## Requisitos

- Node.js 20+ (recomendado)
- npm 10+
- PostgreSQL acessivel pela DATABASE_URL
- Docker (opcional, para stack de observabilidade)

## Configuracao de ambiente

Crie um arquivo .env na raiz do projeto.

Opcao recomendada:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Exemplo minimo:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/financas
JWT_SECRET=sua_chave_jwt_forte
JWT_REFRESH_SECRET=sua_chave_refresh_forte
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info

OTEL_SERVICE_NAME=financas-api
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces

# opcional: protege o endpoint /metrics
METRICS_AUTH_TOKEN=
```

## Instalacao

```bash
npm install
npx prisma generate
```

Se for o primeiro setup de banco:

```bash
npx prisma migrate dev
```

## Executar o projeto

Desenvolvimento (watch):

```bash
npm run start:dev
```

Outros modos:

```bash
npm run start
npm run start:prod
```

Aplicacao local:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/api/docs>

## Docker Compose (observabilidade)

Subir stack com API + observabilidade:

```bash
docker compose up -d --build
```

Servicos:

- API: <http://localhost:3000>
- Metrics: <http://localhost:3000/metrics>
- Jaeger: <http://localhost:16686>
- Prometheus: <http://localhost:9090>
- Alertmanager: <http://localhost:9093>
- Grafana: <http://localhost:3001> (admin/admin)

## Autenticacao

A API protegida usa cookie access_token (HttpOnly), nao Authorization Bearer por padrao.

Fluxo:

1. POST /users (criar usuario)
2. POST /auth/login (recebe cookies access_token e refresh_token)
3. Consumir endpoints protegidos enviando cookie access_token
4. POST /auth/refresh para renovar sessao
5. POST /auth/logout para encerrar sessao

## Endpoints principais

Auth:

- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

Usuarios:

- POST /users
- GET /users
- GET /users/:id
- PATCH /users/:id
- DELETE /users/:id

Transacoes (protegidos):

- GET /transactions?page=&limit=
- POST /transactions
- GET /transactions/:id
- PUT /transactions/:id
- DELETE /transactions/:id

Categorias:

- POST /categories
- GET /categories
- GET /categories/:id
- PATCH /categories/:id
- DELETE /categories/:id

Orcamentos (protegidos):

- POST /budgets
- GET /budgets
- GET /budgets/status?month=&year=
- GET /budgets/:id
- PATCH /budgets/:id
- DELETE /budgets/:id

### Payload do POST /budgets

Formato atual (recomendado):

```json
{
  "amount": 1200,
  "month": 4,
  "year": 2026,
  "alertThreshold": 80,
  "categoryId": 1
}
```

Compatibilidade com formato legado (a API converte automaticamente):

```json
{
  "title": "Orcamento Casa",
  "targetAmount": 1200,
  "dueDate": "2026-04-21"
}
```

Notas de compatibilidade:

- `targetAmount` e `currentAmount` sao aceitos como alias de `amount`.
- `dueDate` e usado para derivar `month` e `year` quando nao enviados.
- `title` e aceito apenas para retrocompatibilidade e e ignorado no processamento.

Relatorios (protegidos):

- GET /reports/summary
- GET /reports/by-category
- GET /reports/monthly

Exportacao (protegidos):

- GET /export/csv
- GET /export/pdf

Backup (protegidos):

- GET /backup
- POST /backup/restore

## Testes e qualidade

Executar testes:

```bash
npm run test
npm run test:e2e
npm run test:cov
```

Rodar Biome:

```bash
npx @biomejs/biome ci .
```

## Observabilidade

### Logs

- Logger HTTP estruturado com nestjs-pino
- Em dev: logs amigaveis
- Em prod: JSON estruturado

### Metricas

- Endpoint: GET /metrics
- Se METRICS_AUTH_TOKEN estiver definido, enviar:

```http
Authorization: Bearer <token>
```

### Tracing

- Instrumentacao OpenTelemetry inicializada no bootstrap
- Exportacao OTLP HTTP configuravel por variavel de ambiente

## Arquivo de requests pronto

Use o arquivo api_test.http para testar rapidamente todos os fluxos.

Guia de integracao do frontend para Metas (Goals):

- README_GOALS_FRONTEND.md

Ele ja contem:

- Variaveis de ambiente para baseUrl e cookies
- Requests de auth, CRUDs, relatorios, exportacao e backup

## Troubleshooting rapido

Erro ao subir com npm run start:dev:

- Verifique DATABASE_URL no .env
- Rode npx prisma generate
- Garanta que o banco esteja acessivel

Erro 401 em rotas protegidas:

- Confirme login em /auth/login
- Envie cookie access_token na requisicao

Erro no /metrics:

- Se METRICS_AUTH_TOKEN estiver ativo, envie Authorization Bearer correto

## Licenca

UNLICENSED
