# Plan: Assistente de IA Financeiro

## 📝 Tarefas

### 1. Refatoração e Tipagem
- [ ] Ajustar as definições de `tool` no `finance.tools.ts` para usar os tipos corretos do Vercel AI SDK, removendo `as any` e `@ts-ignore`.
- [ ] Garantir que o retorno dos métodos do `PrismaService` esteja tipado.

### 2. Novas Ferramentas
- [ ] **`get_balance`**: Criar ferramenta que soma transações do tipo `INCOME` e subtrai `EXPENSE` do usuário.
- [ ] **`get_categories`**: Criar ferramenta para listar as categorias (nome e ID) do usuário.
- [ ] **`get_top_spending_categories`**: Ferramenta que retorna as 5 categorias com maior volume de gastos no mês.

### 3. Integração e Testes
- [ ] Registrar as novas ferramentas no `AiService`.
- [ ] Criar/atualizar testes unitários para o `AiService` validando a chamada das ferramentas.
- [ ] Testar manualmente via `api_test.http`.

## 🧪 Verificação
1. Rodar `npm run lint` para validar Biome.
2. Rodar `npm run test` focado no módulo de IA.
3. Chamar o endpoint de chat com a pergunta: "Quais são minhas categorias e qual meu saldo?"
