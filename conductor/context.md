# Contexto do Projeto: Nest-Financas

## 🎯 Objetivos do Produto
API backend para gestão de finanças pessoais, focada em segurança, observabilidade e agora inteligência artificial. O objetivo é permitir que o usuário gerencie transações, orçamentos e obtenha insights via linguagem natural.

## 🛠️ Stack Tecnológica
- **Backend:** NestJS 11 (Node.js)
- **Linguagem:** TypeScript 5
- **ORM:** Prisma 7 + PostgreSQL
- **IA:** Vercel AI SDK + OpenAI (GPT-4o-mini)
- **Observabilidade:** OpenTelemetry, Prometheus, Grafana, Jaeger
- **Testes:** Vitest

## 📐 Padrões e Convenções
- **Arquitetura:** Modular (NestJS), Services para lógica de negócio, Controllers para API.
- **Segurança:** Autenticação JWT, Throttling, Isolamento de dados por `userId`.
- **Qualidade:** Lint/Format via Biome. Cobertura de testes alvo > 90%.
- **AI Tools:** Ferramentas definidas no `src/module/ai/tools/` usando Zod para schemas.

## 🔗 Links Úteis
- Roadmap: [ROADMAP_PROJETO.md](file:///c:/Projetos/financas-api/ROADMAP_PROJETO.md)
- Schema DB: [schema.prisma](file:///c:/Projetos/financas-api/prisma/schema.prisma)
