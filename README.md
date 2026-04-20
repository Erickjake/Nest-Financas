<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Observabilidade (Fase 4)

### Logging estruturado (Pino)

- O logger HTTP estruturado ja esta ativo via `nestjs-pino`.
- Em desenvolvimento, os logs ficam formatados com `pino-pretty`.
- Em producao, os logs sao emitidos em JSON para agregadores (ELK, Loki, Datadog, etc).

Variaveis uteis:

- `LOG_LEVEL=info`

### Tracing distribuido (Jaeger)

- O OpenTelemetry e inicializado no bootstrap (`src/tracing.ts`).
- As traces sao exportadas por OTLP HTTP.

Variaveis uteis:

- `OTEL_SERVICE_NAME=financas-api`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces`

### Monitoramento (Prometheus + Grafana)

- Endpoint de metricas: `GET /metrics`
- Se `METRICS_AUTH_TOKEN` estiver definido, enviar `Authorization: Bearer <token>`.

Subir stack completa:

```bash
docker compose up -d --build
```

URLs locais:

- API: `http://localhost:3000`
- Metrics: `http://localhost:3000/metrics`
- Jaeger: `http://localhost:16686`
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001` (admin/admin)

### Alertas em producao

- Regras de alerta em `observability/prometheus/alerts.yml`:
  - API indisponivel (`FinancasApiDown`)
  - Taxa de erro 5xx alta (`FinancasApiHighErrorRate`)
  - Latencia p95 alta (`FinancasApiHighP95Latency`)
- Roteamento no Alertmanager em `observability/alertmanager/alertmanager.yml`.
- Ajuste o webhook para seu canal de notificacao (Slack, Teams, PagerDuty, etc).

Configuracao pronta para producao:

- Arquivo: `observability/alertmanager/alertmanager.production.yml`
- Canais incluidos: Email (default), Slack (warning/critical) e PagerDuty (critical)

Selecao dinamica da configuracao no compose:

- O `docker-compose.yml` usa `ALERTMANAGER_CONFIG_FILE` para definir o arquivo montado.
- Default (local): `./observability/alertmanager/alertmanager.yml`
- Producao: `./observability/alertmanager/alertmanager.production.yml`

Exemplo de uso em producao:

```bash
$env:ALERTMANAGER_CONFIG_FILE='./observability/alertmanager/alertmanager.production.yml'
docker compose up -d alertmanager
```

Depois preencha os segredos reais no arquivo de producao:

- `smtp_auth_password`
- `pagerduty_configs.routing_key`
- `slack_configs.api_url`

Teste manual de alerta (fim a fim no Alertmanager):

```bash
curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"FinancasApiManualTest","severity":"warning","service":"financas-api"},"annotations":{"summary":"Alerta manual de teste","description":"Validacao fim a fim"},"startsAt":"2026-04-20T22:45:00Z","endsAt":"2026-04-20T23:00:00Z"}]'
```

Conferir alerta ativo:

```bash
curl http://localhost:9093/api/v2/alerts
```

### Checklist de validacao de tracing (Jaeger)

1. Garanta que o Jaeger esteja com OTLP habilitado e acessivel em rede Docker.
2. Gere trafego na API (ex.: `GET /`, `GET /metrics`, `GET /transactions`).
3. Consulte os servicos no Jaeger:

```bash
curl http://localhost:16686/api/services
```

Resultado esperado: lista contendo `financas-api`.

4. Consulte traces recentes:

```bash
curl "http://localhost:16686/api/traces?service=financas-api&limit=5"
```

Resultado esperado: campo `data` com traces nao vazio.

5. Validacao cruzada em logs: os logs HTTP devem conter `trace_id` e `span_id`.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
